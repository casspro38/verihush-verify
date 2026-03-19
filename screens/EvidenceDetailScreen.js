import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Alert, Image, BackHandler } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { supabase } from '../utils/supabase';

const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981',
  red: '#FF5451', yellow: '#FBBF24', textPrimary: '#FFFFFF',
  textSecondary: '#8899AA', border: '#1A3055',
};

export default function EvidenceDetailScreen({ route, navigation }) {
  const { item } = route.params;
  const [imageUrl, setImageUrl] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const isMountedRef = useRef(true);

  const player = useAudioPlayer(audioUrl ? { uri: audioUrl } : undefined);
  const status = player ? useAudioPlayerStatus(player) : null;

  useEffect(() => {
    isMountedRef.current = true;
    if (item.type === 'photo' && item.file_url) loadImage();
    if (item.type === 'audio' && item.file_url) loadAudioUrl();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (player) { try { player.pause(); } catch(e) {} }
      navigation.goBack();
      return true;
    });

    const unsubscribe = navigation.addListener('beforeRemove', () => {
      if (player) { try { player.pause(); } catch(e) {} }
    });

    return () => {
      isMountedRef.current = false;
      backHandler.remove();
      unsubscribe();
      if (player) { try { player.pause(); } catch(e) {} }
    };
  }, []);

  const loadImage = async () => {
    try {
      const { data } = await supabase.storage.from('evidence-files').createSignedUrl(item.file_url, 3600);
      if (data && isMountedRef.current) setImageUrl(data.signedUrl);
    } catch (e) { console.log('Image load error:', e); }
  };

  const loadAudioUrl = async () => {
    try {
      const { data } = await supabase.storage.from('evidence-files').createSignedUrl(item.file_url, 3600);
      if (data && isMountedRef.current) setAudioUrl(data.signedUrl);
    } catch (e) { console.log('Audio URL load error:', e); }
  };

  const togglePlay = () => {
    if (!player) return;
    try {
      if (status && status.playing) {
        player.pause();
      } else {
        player.play();
      }
    } catch (error) {
      Alert.alert('Error', 'Playback failed: ' + error.message);
    }
  };

  const stopAudio = () => {
    if (!player) return;
    try {
      player.pause();
      player.seekTo(0);
    } catch (e) {
      console.log('Stop error:', e.message);
    }
  };

  const isPlaying = status ? status.playing : false;
  const currentTime = status ? Math.floor(status.currentTime || 0) : 0;
  const isLoaded = status ? status.isLoaded : false;

  const formatDuration = (secs) => {
    if (!secs) return '0:00';
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m + ':' + String(s).padStart(2, '0');
  };

  const formatFullDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0') + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0') + ':' + String(d.getSeconds()).padStart(2,'0');
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />

      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => { if (player) { try { player.pause(); } catch(e) {} } navigation.goBack(); }} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Evidence Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        <View style={styles.typeBadge}>
          <Ionicons name={item.type === 'audio' ? 'mic' : item.type === 'photo' ? 'image' : 'document-text'}
            size={18} color={COLORS.blue} />
          <Text style={styles.typeText}> {item.type.charAt(0).toUpperCase() + item.type.slice(1)}</Text>
        </View>

        <Text style={styles.title}>{item.title || 'Untitled'}</Text>
        <Text style={styles.date}>{formatFullDate(item.created_at)}</Text>

        {item.type === 'audio' && (
          <View style={styles.playerCard}>
            <TouchableOpacity
              style={[styles.playBtn, !audioUrl && { opacity: 0.5 }]}
              onPress={togglePlay}
              disabled={!audioUrl}
            >
              <Ionicons name={!audioUrl ? 'hourglass' : isPlaying ? 'pause' : 'play'} size={32} color="#FFF" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.stopBtn} onPress={stopAudio}>
              <Ionicons name="stop" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <View style={styles.playerInfo}>
              <Text style={styles.playerTime}>
                {formatDuration(currentTime)} / {formatDuration(item.duration)}
              </Text>
              <View style={styles.progressBar}>
                <View style={[
                  styles.progressFill,
                  { width: item.duration ? ((currentTime / item.duration) * 100) + '%' : '0%' }
                ]} />
              </View>
              <Text style={styles.playerStatus}>
                {!audioUrl ? 'Loading...' : isPlaying ? 'Playing' : currentTime > 0 ? 'Paused' : 'Ready'}
              </Text>
            </View>
          </View>
        )}

        {item.type === 'photo' && imageUrl && (
          <View style={styles.photoCard}>
            <Image source={{ uri: imageUrl }} style={styles.photo} resizeMode="contain" />
          </View>
        )}

        {item.transcript ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Transcript</Text>
            <Text style={styles.infoValue}>{item.transcript}</Text>
          </View>
        ) : null}

        {item.file_size ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>File Size</Text>
            <Text style={styles.infoValue}>
              {item.file_size < 1024 * 1024
                ? (item.file_size / 1024).toFixed(1) + ' KB'
                : (item.file_size / (1024 * 1024)).toFixed(2) + ' MB'}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>SHA-256 Hash</Text>
          <Text style={[styles.infoValue, { fontFamily: 'monospace', fontSize: 12, color: COLORS.green }]}>
            {item.sha256_hash || 'N/A'}
          </Text>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Location</Text>
          <Text style={styles.infoValue}>
            {[item.city, item.region, item.country].filter(Boolean).join(', ') || 'Unknown'}
          </Text>
          {item.latitude && item.longitude ? (
            <Text style={[styles.infoValue, { fontSize: 12, color: COLORS.textSecondary }]}>
              {Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}
            </Text>
          ) : null}
        </View>

        {item.consent_type ? (
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Consent Type</Text>
            <Text style={styles.infoValue}>{item.consent_type}</Text>
          </View>
        ) : null}

        <View style={styles.infoCard}>
          <Text style={styles.infoLabel}>Verification</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
            <Ionicons name="shield-checkmark" size={18} color={COLORS.green} />
            <Text style={[styles.infoValue, { color: COLORS.green, marginLeft: 6 }]}>
              {item.is_verified ? 'Verified - Tamper-proof' : 'Unverified'}
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 55, paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  topTitle: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  scrollContent: { paddingHorizontal: 20, paddingTop: 10 },
  typeBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: COLORS.blue + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 12 },
  typeText: { color: COLORS.blue, fontSize: 13, fontWeight: '600' },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 4 },
  date: { fontSize: 14, color: COLORS.textSecondary, marginBottom: 20 },
  playerCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20 },
  playBtn: { width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  stopBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.border, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  playerInfo: { flex: 1 },
  playerTime: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600', marginBottom: 8 },
  playerStatus: { color: COLORS.textSecondary, fontSize: 11, marginTop: 4 },
  progressBar: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, backgroundColor: COLORS.blue, borderRadius: 3 },
  photoCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 8, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20, alignItems: 'center' },
  photo: { width: '100%', height: 300, borderRadius: 10 },
  infoCard: { backgroundColor: COLORS.card, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: COLORS.border, marginBottom: 12 },
  infoLabel: { color: COLORS.textSecondary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  infoValue: { color: COLORS.textPrimary, fontSize: 15, marginTop: 6 },
});
