import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Switch, Alert, Modal, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioRecorder, RecordingPresets, AudioModule } from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import * as Crypto from 'expo-crypto';
import { getCurrentLocation } from '../utils/location';
import { generateFileHash, uploadAudioEvidence, uploadPhotoEvidence } from '../utils/evidence';
import { StreamingUploader } from '../utils/streamingUpload';
import { checkUploadQuota, checkStreamingAllowed } from '../utils/planLimits';
import { supabase } from '../utils/supabase';
let Accelerometer = null;
try { Accelerometer = require('expo-sensors').Accelerometer; } catch(e) {}
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSpeechRecognition } from '../utils/speechRecognition';
import { t } from '../i18n';

const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981',
  red: '#FF5451', yellow: '#FBBF24', textPrimary: '#FFFFFF',
  textSecondary: '#8899AA', border: '#1A3055', purple: '#8B5CF6',
};

export default function RecordScreen({ navigation, duressMode }) {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [stealthMode, setStealthMode] = useState(false);
  const [streamingMode, setStreamingMode] = useState(true);
  const [transcript, setTranscript] = useState('');
  const [photos, setPhotos] = useState([]);
  const [locationInfo, setLocationInfo] = useState(null);
  const [hashValue, setHashValue] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [uploading, setUploading] = useState(false);
  const [debugError, setDebugError] = useState('');
  const [chunksUploaded, setChunksUploaded] = useState(0);
  const [streamingStatus, setStreamingStatus] = useState('');
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const timerRef = useRef(null);
  const streamerRef = useRef(null);
  const chunkTimerRef = useRef(null);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  // Shake-to-Record
  const SHAKE_THRESHOLD = 1.8;
  const SHAKE_COUNT_NEEDED = 3;
  const SHAKE_WINDOW = 1500;
  const shakeTimestamps = useRef([]);
  const shakeEnabledRef = useRef(false);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    let subscription = null;

    const initShake = async () => {
      const enabled = await AsyncStorage.getItem('verihush_shake_to_record');
      shakeEnabledRef.current = enabled === 'true';

      if (!shakeEnabledRef.current) return;

      try {
      await Accelerometer.setUpdateInterval(100);
      subscription = Accelerometer.addListener(({ x, y, z }) => {
        const magnitude = Math.sqrt(x * x + y * y + z * z);
        if (magnitude > SHAKE_THRESHOLD) {
          const now = Date.now();
          shakeTimestamps.current.push(now);
          shakeTimestamps.current = shakeTimestamps.current.filter(t => now - t < SHAKE_WINDOW);

          if (shakeTimestamps.current.length >= SHAKE_COUNT_NEEDED) {
            shakeTimestamps.current = [];
            if (!isRecordingRef.current) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              startRecording();
            }
          }
        }
      });
      } catch (e) {
        console.log('Shake not available:', e.message);
      }
    };

    initShake();

    return () => {
      if (subscription) subscription.remove();
    };
  }, []);
  const stt = useSpeechRecognition({ countryCode: locationInfo?.countryCode || 'KR' });

  useEffect(() => {
    loadLocation();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (stt.getDisplayText()) {
      setTranscript(stt.getDisplayText());
    }
  }, [stt.fullTranscript, stt.currentInterim]);

  const loadLocation = async () => {
    try {
      const info = await getCurrentLocation();
      setLocationInfo(info);
    } catch (e) { setLocationInfo(null); }
  };

  const formatTime = (secs) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  };

  const startRecording = async () => {
    try {
      const quota = await checkUploadQuota();
      if (!quota.allowed) {
        Alert.alert(
          'Upload Limit Reached',
          'You have used all ' + quota.limit + ' free uploads. Upgrade to Guard for unlimited evidence protection.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'See Plans', onPress: () => navigation.getParent()?.navigate('Settings', { screen: 'PlanScreen' }) },
          ]
        );
        return;
      }
      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) { Alert.alert('Permission needed', 'Microphone access is required'); return; }

      // === STT FIRST, then Audio ===
      setIsRecording(true);
      setDuration(0);
      setHashValue('');
      setUploadStatus('');
      setDebugError('');
      setChunksUploaded(0);
      setStreamingStatus('');
      setTranscript('');
      timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);

      // Start STT FIRST (before audio grabs mic)
      await stt.start();

      // Wait 500ms for STT to grab mic
      await new Promise(resolve => setTimeout(resolve, 500));

      // Then start audio recording
      await recorder.prepareToRecordAsync();
      recorder.record();

      if (streamingMode) {
        const streamCheck = await checkStreamingAllowed();
        if (!streamCheck.allowed) {
          setStreamingMode(false);
          setStreamingStatus('Streaming requires Guard plan');
        }
        const streamer = new StreamingUploader();
        await streamer.init(locationInfo);
        streamerRef.current = streamer;
        setStreamingStatus('Live streaming active');

        chunkTimerRef.current = setInterval(async () => {
          if (streamerRef.current && streamerRef.current.isStreaming && recorder.uri) {
            const result = await streamerRef.current.uploadChunk(recorder.uri);
            if (result) {
              setChunksUploaded(streamerRef.current.uploadedChunks.length);
              setStreamingStatus('Chunk ' + result.chunkIndex + ' synced');
            }
          }
        }, 10000);
      }
    } catch (error) { Alert.alert('Error', 'Failed to start recording: ' + error.message); }
  };

  const stopRecording = async () => {
    try {
      if (timerRef.current) clearInterval(timerRef.current);
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
      setIsRecording(false);
      setUploading(true);
      setUploadStatus('Processing...');

      // Stop STT
      stt.stop();

      let streamResult = null;
      if (streamerRef.current) {
        streamResult = streamerRef.current.stop();
        setStreamingStatus('Stream complete: ' + streamResult.totalChunks + ' chunks');
      }

      await recorder.stop();
      const uri = recorder.uri;

      setUploadStatus('Generating hash...');
      const hash = await generateFileHash(uri);
      setHashValue(hash);

      setUploadStatus('Uploading final file...');
      const finalTranscript = stt.fullTranscript || transcript;
      const result = await uploadAudioEvidence(uri, duration, finalTranscript, locationInfo);

      if (result.success) {
        const chunkMsg = streamResult ? ' | ' + streamResult.totalChunks + ' chunks streamed' : '';
        setUploadStatus('Secured on server' + chunkMsg);
        setDebugError('');
        Alert.alert('Evidence Secured',
          'SHA-256: ' + hash.substring(0, 16) + '...\nUploaded and verified.'
          + (streamResult ? '\n\nReal-time: ' + streamResult.totalChunks + ' chunks were streamed to server during recording.' : '')
          + (finalTranscript ? '\n\nTranscript saved.' : '')
        );
      } else {
        setUploadStatus('Saved locally');
        setDebugError(result.error || 'Unknown error');
        Alert.alert('Upload Issue',
          'Error: ' + (result.error || 'Unknown')
          + (streamResult && streamResult.totalChunks > 0 ? '\n\nNote: ' + streamResult.totalChunks + ' chunks were already streamed to server.' : '')
        );
      }
    } catch (error) {
      setUploadStatus('Save failed');
      setDebugError(error.message);
      Alert.alert('Error', error.message);
    } finally {
      setUploading(false);
      streamerRef.current = null;
    }
  };

  const takePhoto = async () => {
    try {
      const quota = await checkUploadQuota();
      if (!quota.allowed) {
        Alert.alert(
          'Upload Limit Reached',
          'You have used all ' + quota.limit + ' free uploads. Upgrade to Guard for unlimited evidence protection.',
          [
            { text: 'Later', style: 'cancel' },
            { text: 'See Plans', onPress: () => navigation.getParent()?.navigate('Settings', { screen: 'PlanScreen' }) },
          ]
        );
        return;
      }
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access is required'); return; }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.3, allowsEditing: false, exif: false });
      if (!result.canceled && result.assets[0]) {
        const photoUri = result.assets[0].uri;
        setPhotos(prev => [...prev, photoUri]);
        const uploadResult = await uploadPhotoEvidence(photoUri, locationInfo);
        if (uploadResult.success) {
          setUploadStatus(photos.length + 1 + ' photo(s) secured');
          setDebugError('');
        } else {
          setUploadStatus('Photo saved locally');
          setDebugError(uploadResult.error || 'Unknown');
        }
      }
    } catch (error) { Alert.alert('Error', error.message); }
  };

  const saveNote = async () => {
    const quota = await checkUploadQuota();
    if (!quota.allowed) {
      Alert.alert(
        'Upload Limit Reached',
        'You have used all ' + quota.limit + ' free uploads. Upgrade to Guard for unlimited evidence protection.',
        [
          { text: 'Later', style: 'cancel' },
          { text: 'See Plans', onPress: () => navigation.getParent()?.navigate('Settings', { screen: 'PlanScreen' }) },
        ]
      );
      return;
    }
    if (!noteContent.trim()) {
      Alert.alert('Empty Note', 'Please write something before saving.');
      return;
    }
    setSavingNote(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { Alert.alert('Error', 'Please log in first'); setSavingNote(false); return; }

      const title = noteTitle.trim() || 'Note - ' + new Date().toLocaleDateString();
      const content = noteContent.trim();
      const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, content);
      const fileSize = new Blob([content]).size || content.length;

      const { data, error } = await supabase.from('evidence').insert({
        user_id: session.user.id,
        type: 'note',
        title: title,
        transcript: content,
        sha256_hash: hash,
        file_size: fileSize,
        latitude: locationInfo?.latitude || null,
        longitude: locationInfo?.longitude || null,
        city: locationInfo?.city || null,
        consent_type: locationInfo?.consentType || null,
      }).select().single();

      if (error) throw error;

      if (data) {
        const { data: lastLog } = await supabase
          .from('hash_log')
          .select('hash_value')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        await supabase.from('hash_log').insert({
          evidence_id: data.id,
          hash_value: hash,
          previous_hash: lastLog?.hash_value || null,
          hash_type: 'sha256',
          latitude: locationInfo?.latitude || null,
          longitude: locationInfo?.longitude || null,
          city: locationInfo?.city || null,
        });
      }

      setShowNoteModal(false);
      setNoteTitle('');
      setNoteContent('');
      setUploadStatus('Note secured on server');
      Alert.alert('Note Saved', 'Your note has been securely saved with SHA-256 hash.\n\nHash: ' + hash.substring(0, 16) + '...');
    } catch (error) {
      console.log('Note save error:', error);
      Alert.alert('Error', 'Failed to save note: ' + error.message);
    } finally {
      setSavingNote(false);
    }
  };

  const getConsentBadge = () => {
    if (!locationInfo) return { text: 'Detecting location...', color: COLORS.yellow };
    if (locationInfo.safe === true) return { text: locationInfo.emoji + ' ' + locationInfo.country + ' - Recording is legal here', color: COLORS.green };
    if (locationInfo.safe === false) return { text: locationInfo.emoji + ' ' + locationInfo.country + ' - Permission needed to record', color: COLORS.red };
    return { text: locationInfo.emoji + ' ' + locationInfo.country + ' - Check local laws', color: COLORS.yellow };
  };
  const badge = getConsentBadge();


  // Duress mode: show fake record screen that does nothing
  if (duressMode) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <Text style={styles.headerTitle}>Record</Text>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <View style={styles.recordBtn}>
            <Ionicons name="mic" size={36} color="#FFF" />
          </View>
          <Text style={{ color: COLORS.textSecondary, marginTop: 16 }}>{t('record.tap_to_record')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Record</Text>
          <View style={styles.toggleRow}>
            <View style={styles.stealthRow}>
              <Ionicons name="eye-off" size={14} color={COLORS.textSecondary} />
              <Text style={styles.toggleLabel}> {t('record.stealth')}</Text>
              <Switch value={stealthMode} onValueChange={setStealthMode}
                trackColor={{ false: COLORS.border, true: COLORS.blue + '60' }}
                thumbColor={stealthMode ? COLORS.blue : '#555'} style={{ marginLeft: 4, transform: [{ scale: 0.8 }] }} />
            </View>
            <View style={styles.stealthRow}>
              <Ionicons name="cloud-upload" size={14} color={streamingMode ? COLORS.green : COLORS.textSecondary} />
              <Text style={[styles.toggleLabel, streamingMode && { color: COLORS.green }]}> {t('record.live')}</Text>
              <Switch value={streamingMode} onValueChange={setStreamingMode}
                trackColor={{ false: COLORS.border, true: COLORS.green + '60' }}
                thumbColor={streamingMode ? COLORS.green : '#555'} style={{ marginLeft: 4, transform: [{ scale: 0.8 }] }} />
            </View>
          </View>
        </View>

        <View style={[styles.lawBadge, { borderColor: badge.color }]}>
          <Ionicons name="location" size={14} color={badge.color} />
          <Text style={[styles.lawText, { color: badge.color }]}> {badge.text}</Text>
        </View>

        {isRecording && streamingMode && (
          <View style={styles.streamingBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.streamingText}>
              LIVE STREAMING {chunksUploaded > 0 ? '| ' + chunksUploaded + ' chunks synced' : '| Waiting...'}
            </Text>
          </View>
        )}

        <Text style={styles.timer}>{formatTime(duration)}</Text>

        <TouchableOpacity
          style={[styles.recordBtn, isRecording && styles.recordBtnActive]}
          onPress={isRecording ? stopRecording : startRecording} disabled={uploading}>
          <Ionicons name={isRecording ? 'stop' : 'mic'} size={36} color={isRecording ? '#FFF' : COLORS.card} />
        </TouchableOpacity>
        <Text style={styles.recordHint}>
          {uploading ? 'Processing...' : isRecording ? 'Tap to stop' : 'Tap to record'}
        </Text>

        {(hashValue || uploadStatus) ? (
          <View style={styles.statusCard}>
            {hashValue ? (
              <View style={styles.statusRow}>
                <Ionicons name="finger-print" size={16} color={COLORS.green} />
                <Text style={styles.statusText}> SHA-256: {hashValue.substring(0, 20)}...</Text>
              </View>
            ) : null}
            {uploadStatus ? (
              <View style={styles.statusRow}>
                <Ionicons name={uploadStatus.includes('Secured') || uploadStatus.includes('secured') ? 'cloud-done' : 'cloud-offline'} size={16}
                  color={uploadStatus.includes('Secured') || uploadStatus.includes('secured') ? COLORS.green : COLORS.yellow} />
                <Text style={[styles.statusText, {
                  color: uploadStatus.includes('Secured') || uploadStatus.includes('secured') ? COLORS.green : COLORS.yellow
                }]}> {uploadStatus}</Text>
              </View>
            ) : null}
            {streamingStatus && !isRecording ? (
              <View style={styles.statusRow}>
                <Ionicons name="cloud-upload" size={16} color={COLORS.green} />
                <Text style={[styles.statusText, { color: COLORS.green }]}> {streamingStatus}</Text>
              </View>
            ) : null}
            {debugError ? (
              <View style={[styles.statusRow, { marginTop: 4 }]}>
                <Ionicons name="bug" size={14} color={COLORS.red} />
                <Text style={{ color: COLORS.red, fontSize: 11, fontFamily: 'monospace', flex: 1 }}> {debugError}</Text>
              </View>
            ) : null}
          </View>
        ) : null}

        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={takePhoto}>
            <Ionicons name="camera" size={22} color={COLORS.blue} />
            <Text style={styles.actionLabel}>{t('record.photo')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={() => setShowNoteModal(true)}>
            <Ionicons name="create" size={22} color={COLORS.purple} />
            <Text style={[styles.actionLabel, { color: COLORS.purple }]}>Note</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.transcriptCard}>
          <Text style={styles.transcriptTitle}>
            {isRecording && stt.isListening ? 'Live Transcript (listening...)' : 'Live Transcript'}
          </Text>
          <Text style={styles.transcriptText}>{transcript || 'Transcript will appear here during recording...'}</Text>
          {stt.detectedKeywords.length > 0 ? (
            <View style={styles.keywordAlert}>
              <Ionicons name="warning" size={14} color={COLORS.red} />
              <Text style={styles.keywordText}> Keywords detected: {stt.detectedKeywords.map(k => k.keywords.join(', ')).join('; ')}</Text>
            </View>
          ) : null}
        </View>

        {photos.length > 0 && (
          <Text style={styles.photoCount}>
            <Ionicons name="images" size={14} color={COLORS.green} /> {photos.length} photo(s) secured
          </Text>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Note Modal */}
      <Modal visible={showNoteModal} animationType="slide" transparent statusBarTranslucent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowNoteModal(false)}>
            <TouchableOpacity activeOpacity={1} style={styles.noteModal} onPress={() => {}}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteHeaderTitle}>{t('record.add_note')}</Text>
                <TouchableOpacity onPress={() => setShowNoteModal(false)}>
                  <Ionicons name="close" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <Text style={styles.noteLabel}>Title (optional)</Text>
              <TextInput
                style={styles.noteInput}
                placeholder="e.g. Incident at work"
                placeholderTextColor={COLORS.textSecondary}
                value={noteTitle}
                onChangeText={setNoteTitle}
                maxLength={100}
              />

              <Text style={styles.noteLabel}>What happened?</Text>
              <TextInput
                style={[styles.noteInput, styles.noteTextArea]}
                placeholder="Describe the situation in detail..."
                placeholderTextColor={COLORS.textSecondary}
                value={noteContent}
                onChangeText={setNoteContent}
                multiline
                textAlignVertical="top"
                maxLength={5000}
              />
              <Text style={styles.noteCharCount}>{noteContent.length} / 5,000</Text>

              {locationInfo && (
                <View style={styles.noteLocation}>
                  <Ionicons name="location" size={14} color={COLORS.green} />
                  <Text style={styles.noteLocationText}>
                    {' '}{locationInfo.emoji} {locationInfo.city}, {locationInfo.country}
                  </Text>
                </View>
              )}

              <TouchableOpacity
                style={[styles.noteSaveBtn, savingNote && { opacity: 0.5 }]}
                onPress={saveNote}
                disabled={savingNote}
              >
                <Ionicons name="shield-checkmark" size={18} color="#FFF" />
                <Text style={styles.noteSaveBtnText}>
                  {savingNote ? ' Saving...' : ' Save & Secure'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  toggleRow: { alignItems: 'flex-end' },
  stealthRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  toggleLabel: { color: COLORS.textSecondary, fontSize: 12 },
  lawBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'center', borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.card, marginBottom: 12 },
  lawText: { fontSize: 13, fontWeight: '600' },
  streamingBadge: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.red + '20', borderWidth: 1, borderColor: COLORS.red, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, marginBottom: 12, alignSelf: 'center' },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.red, marginRight: 8 },
  streamingText: { color: COLORS.red, fontSize: 12, fontWeight: '700' },
  timer: { fontSize: 48, fontWeight: '300', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 20 },
  recordBtn: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center', alignSelf: 'center', elevation: 8 },
  recordBtnActive: { backgroundColor: COLORS.red },
  recordHint: { color: COLORS.textSecondary, textAlign: 'center', marginTop: 10, fontSize: 14, marginBottom: 16 },
  statusCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: COLORS.border, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  statusText: { color: COLORS.textSecondary, fontSize: 13, fontFamily: 'monospace' },
  actionRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  actionBtn: { flex: 1, alignItems: 'center', backgroundColor: COLORS.card, marginHorizontal: 5, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
  actionLabel: { color: COLORS.textSecondary, fontSize: 12, marginTop: 6 },
  transcriptCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, borderWidth: 1, borderColor: COLORS.border, minHeight: 120 },
  transcriptTitle: { color: COLORS.blue, fontSize: 14, fontWeight: '700', marginBottom: 8 },
  transcriptText: { color: COLORS.textSecondary, fontSize: 14, lineHeight: 22 },
  photoCount: { color: COLORS.green, fontSize: 13, marginTop: 12 },
  keywordAlert: { flexDirection: 'row', alignItems: 'center', marginTop: 10, backgroundColor: COLORS.red + '20', padding: 8, borderRadius: 8 },
  keywordText: { color: COLORS.red, fontSize: 12, flex: 1 },

  // Note Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  noteModal: { backgroundColor: COLORS.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, maxHeight: '85%' },
  noteHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  noteHeaderTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary },
  noteLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary, marginBottom: 8, marginTop: 12 },
  noteInput: { backgroundColor: COLORS.card, borderRadius: 12, padding: 14, color: COLORS.textPrimary, fontSize: 15, borderWidth: 1, borderColor: COLORS.border },
  noteTextArea: { minHeight: 150, maxHeight: 250 },
  noteCharCount: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 4 },
  noteLocation: { flexDirection: 'row', alignItems: 'center', marginTop: 12, backgroundColor: COLORS.card, padding: 10, borderRadius: 10 },
  noteLocationText: { color: COLORS.green, fontSize: 13 },
  noteSaveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.green, borderRadius: 14, paddingVertical: 14, marginTop: 20 },
  noteSaveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
});












