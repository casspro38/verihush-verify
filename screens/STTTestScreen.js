import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAudioRecorder, AudioModule, RecordingPresets } from 'expo-audio';
import { useSpeechRecognition } from '../utils/speechRecognition';

const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981',
  red: '#FF5451', textPrimary: '#FFFFFF', textSecondary: '#8899AA',
};

export default function STTTestScreen() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [audioStatus, setAudioStatus] = useState('idle');
  const [logs, setLogs] = useState([]);
  const stt = useSpeechRecognition({ countryCode: 'KR' });

  function addLog(msg) {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => ['[' + time + '] ' + msg, ...prev].slice(0, 30));
  }

  async function startAudioOnly() {
    try {
      await AudioModule.requestRecordingPermissionsAsync();
      recorder.record();
      setAudioStatus('recording');
      addLog('AUDIO: Recording started');
    } catch (e) {
      addLog('AUDIO ERROR: ' + e.message);
    }
  }

  async function stopAudioOnly() {
    try {
      await recorder.stop();
      setAudioStatus('idle');
      addLog('AUDIO: Recording stopped');
    } catch (e) {
      addLog('AUDIO ERROR: ' + e.message);
    }
  }

  async function startSTTOnly() {
    const ok = await stt.start();
    addLog('STT: ' + (ok ? 'Started' : 'Failed'));
  }

  function stopSTTOnly() {
    stt.stop();
    addLog('STT: Stopped');
  }

  async function startBoth() {
    addLog('--- BOTH START ---');
    try {
      await AudioModule.requestRecordingPermissionsAsync();
      recorder.record();
      setAudioStatus('recording');
      addLog('AUDIO: Started');
    } catch (e) {
      addLog('AUDIO ERROR: ' + e.message);
    }
    const ok = await stt.start();
    addLog('STT: ' + (ok ? 'Started' : 'Failed'));
  }

  async function stopBoth() {
    addLog('--- BOTH STOP ---');
    stt.stop();
    addLog('STT: Stopped');
    try {
      await recorder.stop();
      setAudioStatus('idle');
      addLog('AUDIO: Stopped');
    } catch (e) {
      addLog('AUDIO ERROR: ' + e.message);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>STT + Audio Test</Text>
      <View style={styles.statusRow}>
        <View style={[styles.statusDot, { backgroundColor: audioStatus === 'recording' ? COLORS.green : '#555' }]} />
        <Text style={styles.statusText}>Audio: {audioStatus}</Text>
        <View style={[styles.statusDot, { backgroundColor: stt.isListening ? COLORS.green : '#555', marginLeft: 20 }]} />
        <Text style={styles.statusText}>STT: {stt.isListening ? 'listening' : 'idle'}</Text>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.blue }]} onPress={audioStatus === 'idle' ? startAudioOnly : stopAudioOnly}>
          <Text style={styles.btnText}>{audioStatus === 'idle' ? 'Audio Only' : 'Stop Audio'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.green }]} onPress={stt.isListening ? stopSTTOnly : startSTTOnly}>
          <Text style={styles.btnText}>{stt.isListening ? 'Stop STT' : 'STT Only'}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.btnRow}>
        <TouchableOpacity style={[styles.btn, { backgroundColor: COLORS.red, flex: 1 }]} onPress={audioStatus === 'idle' && !stt.isListening ? startBoth : stopBoth}>
          <Text style={styles.btnText}>{audioStatus === 'idle' && !stt.isListening ? 'START BOTH' : 'STOP BOTH'}</Text>
        </TouchableOpacity>
      </View>
      {stt.getDisplayText() ? (
        <View style={styles.transcriptBox}>
          <Text style={styles.transcriptLabel}>Live Transcript:</Text>
          <Text style={styles.transcriptText}>{stt.getDisplayText()}</Text>
        </View>
      ) : null}
      {stt.detectedKeywords.length > 0 ? (
        <View style={[styles.transcriptBox, { borderColor: COLORS.red }]}>
          <Text style={[styles.transcriptLabel, { color: COLORS.red }]}>Keywords Detected:</Text>
          {stt.detectedKeywords.map((k, i) => (
            <Text key={i} style={{ color: COLORS.red, fontSize: 12 }}>{k.keywords.join(', ')} - "{k.text}"</Text>
          ))}
        </View>
      ) : null}
      <Text style={[styles.transcriptLabel, { marginTop: 12 }]}>Logs:</Text>
      <ScrollView style={styles.logBox}>
        {logs.map((log, i) => (
          <Text key={i} style={styles.logText}>{log}</Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20, paddingTop: 60 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 6 },
  statusText: { color: COLORS.textSecondary, fontSize: 13 },
  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  btnText: { color: '#FFF', fontSize: 14, fontWeight: '700' },
  transcriptBox: { backgroundColor: COLORS.card, borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: COLORS.green },
  transcriptLabel: { color: COLORS.green, fontSize: 12, fontWeight: '700', marginBottom: 4 },
  transcriptText: { color: COLORS.textPrimary, fontSize: 14 },
  logBox: { flex: 1, backgroundColor: COLORS.card, borderRadius: 10, padding: 10, marginTop: 6 },
  logText: { color: COLORS.textSecondary, fontSize: 11, marginBottom: 2, fontFamily: 'monospace' },
});
