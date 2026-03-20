import React, { useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, StatusBar, ScrollView, Dimensions, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getCurrentLocation } from '../utils/location';
import { supabase } from '../utils/supabase';
import { t } from '../i18n';

const { width } = Dimensions.get('window');
const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981',
  red: '#FF5451', yellow: '#FBBF24', orange: '#F97316', textPrimary: '#FFFFFF',
  textSecondary: '#8899AA', border: '#1A3055', purple: '#8B5CF6',
};

const PLAN_INFO = {
  free: { label: 'Free Plan', color: COLORS.textSecondary, icon: 'person' },
  guard: { label: 'Guard Plan', color: COLORS.green, icon: 'shield-checkmark' },
  proof: { label: 'Proof Plan', color: COLORS.purple, icon: 'ribbon' },
};

const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return diffMin + 'm ago';
  if (diffHr < 24) return diffHr + 'h ago';
  if (diffDay < 7) return diffDay + 'd ago';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export default function HomeScreen({ navigation, duressMode }) {
  const [locationInfo, setLocationInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({ total: 0, audio: 0, photo: 0, reports: 0, totalSize: 0 });
  const [plan, setPlan] = useState('free');
  const [hashChainValid, setHashChainValid] = useState(null);
  const [lastUploadTime, setLastUploadTime] = useState(null);
  const [pinEnabled, setPinEnabled] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      loadAllData();
      startPulse();
    }, [])
  );

  const loadAllData = async () => {
    await Promise.all([loadLocation(), loadStats(), loadPlan(), loadSecurityStatus()]);
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const loadLocation = async () => {
    try {
      const info = await getCurrentLocation();
      setLocationInfo(info);
    } catch (e) {
      setLocationInfo({ error: 'Location unavailable' });
    }
  };

  const loadStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const userId = session.user.id;
      const { data: evidence } = await supabase
        .from('evidence')
        .select('type, file_size, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      const { data: reports } = await supabase
        .from('reports')
        .select('id')
        .eq('user_id', userId);
      if (evidence) {
        const audio = evidence.filter(e => e.type === 'audio');
        const photo = evidence.filter(e => e.type === 'photo');
        const totalSize = evidence.reduce((sum, e) => sum + (e.file_size || 0), 0);
        setStats({
          total: evidence.length,
          audio: audio.length,
          photo: photo.length,
          reports: reports?.length || 0,
          totalSize,
        });
        if (evidence.length > 0) {
          setLastUploadTime(evidence[0].created_at);
        }
      }
    } catch (e) {
      console.log('Stats error:', e);
    }
  };

  const loadPlan = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data } = await supabase
        .from('user_profiles')
        .select('plan')
        .eq('id', session.user.id)
        .single();
      if (data?.plan) setPlan(data.plan);
    } catch (e) {
      console.log('Plan error:', e);
    }
  };

  const loadSecurityStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: userEvidence } = await supabase
        .from('evidence')
        .select('id')
        .eq('user_id', session.user.id)
        .limit(1);
      const evidenceIds = userEvidence ? userEvidence.map(e => e.id) : [];
      let hashLogs = [];
      if (evidenceIds.length > 0) {
        const { data } = await supabase
          .from('hash_log')
          .select('hash_value, previous_hash')
          .order('created_at', { ascending: true });
        hashLogs = data || [];
      }
      if (hashLogs && hashLogs.length > 0) {
        let valid = true;
        for (let i = 1; i < hashLogs.length; i++) {
          if (hashLogs[i].previous_hash !== hashLogs[i - 1].hash_value) {
            valid = false;
            break;
          }
        }
        setHashChainValid(valid);
      } else {
        setHashChainValid(null);
      }
      const SecureStore = require('expo-secure-store');
      const pin = await SecureStore.getItemAsync('verihush_pin');
      setPinEnabled(pin !== null);
    } catch (e) {
      console.log('Security status error:', e);
    }
  };

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.12, duration: 1200, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  };

  const getConsentBadge = () => {
    if (!locationInfo || locationInfo.error)
      return { text: 'Location unavailable', color: COLORS.yellow, icon: 'warning' };
    if (locationInfo.safe === true)
      return { text: 'Recording is legal here', color: COLORS.green, icon: 'shield-checkmark' };
    if (locationInfo.safe === false)
      return { text: 'Permission needed to record', color: COLORS.red, icon: 'warning' };
    return { text: 'Check local laws', color: COLORS.yellow, icon: 'alert-circle' };
  };

  const badge = getConsentBadge();
  const planInfo = PLAN_INFO[plan] || PLAN_INFO.free;


  // Duress mode: show clean decoy stats
  // Duress mode: show realistic decoy home
  if (duressMode) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Welcome back</Text>
              <Text style={styles.subtitle}>Your quiet witness</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <View style={styles.statCard}><Text style={styles.statNumber}>0</Text><Text style={styles.statLabel}>Audio</Text></View>
            <View style={styles.statCard}><Text style={styles.statNumber}>0</Text><Text style={styles.statLabel}>Photos</Text></View>
            <View style={styles.statCard}><Text style={styles.statNumber}>0</Text><Text style={styles.statLabel}>Reports</Text></View>
            <View style={styles.statCard}><Text style={styles.statNumber}>0 MB</Text><Text style={styles.statLabel}>Storage</Text></View>
          </View>
          <View style={{ backgroundColor: "#0F2140", borderRadius: 16, padding: 20, marginTop: 16 }}>
            <Text style={{ color: "#4D8EFF", fontSize: 14, fontWeight: "700", marginBottom: 8 }}>Getting Started</Text>
            <Text style={{ color: "#8899AA", fontSize: 13, lineHeight: 20 }}>Tap the Record tab to start collecting audio evidence. All recordings are automatically encrypted and backed up.</Text>
          </View>
          <View style={{ backgroundColor: "#0F2140", borderRadius: 16, padding: 20, marginTop: 12 }}>
            <Text style={{ color: "#10B981", fontSize: 14, fontWeight: "700", marginBottom: 8 }}>Protection Status</Text>
            <Text style={{ color: "#8899AA", fontSize: 13 }}>Evidence Integrity: Active</Text>
            <Text style={{ color: "#8899AA", fontSize: 13 }}>Cloud Backup: Connected</Text>
            <Text style={{ color: "#8899AA", fontSize: 13 }}>App Lock: Enabled</Text>
          </View>
        </ScrollView>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blue} colors={[COLORS.blue]} />}
      >

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>VeriHush</Text>
          <View style={[styles.planBadge, { backgroundColor: planInfo.color + '20', borderColor: planInfo.color }]}>
            <Ionicons name={planInfo.icon} size={12} color={planInfo.color} />
            <Text style={[styles.planText, { color: planInfo.color }]}> {planInfo.label}</Text>
          </View>
        </View>

        {/* Hero */}
        <View style={styles.heroSection}>
          <Animated.View style={[styles.pulseRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.shieldCircle}>
            <Ionicons name="shield-checkmark" size={48} color={COLORS.green} />
          </View>
          <Text style={styles.heroTitle}>{t('home.hero_title')}</Text>
          <Text style={styles.heroTagline}>{t('home.hero_tagline')}</Text>
          <Text style={styles.heroSubtitle}>
            Protect yourself in disputes, harassment, or emergencies.{'\n'}
            Your recordings are safely backed up and can never be altered.
          </Text>
        </View>

        {/* Three Pillars - Simple Language */}
        <View style={styles.pillarsRow}>
          <View style={styles.pillarCard}>
            <View style={[styles.pillarIcon, { backgroundColor: COLORS.blue + '20' }]}>
              <Ionicons name="cloud-upload" size={22} color={COLORS.blue} />
            </View>
            <Text style={styles.pillarTitle}>{t('home.always_saved')}</Text>
            <Text style={styles.pillarDesc}>{t('home.always_saved_desc')}</Text>
          </View>
          <View style={styles.pillarCard}>
            <View style={[styles.pillarIcon, { backgroundColor: COLORS.green + '20' }]}>
              <Ionicons name="lock-closed" size={22} color={COLORS.green} />
            </View>
            <Text style={styles.pillarTitle}>{t('home.cant_be_changed')}</Text>
            <Text style={styles.pillarDesc}>{t('home.cant_be_changed_desc')}</Text>
          </View>
          <View style={styles.pillarCard}>
            <View style={[styles.pillarIcon, { backgroundColor: COLORS.purple + '20' }]}>
              <Ionicons name="briefcase" size={22} color={COLORS.purple} />
            </View>
            <Text style={styles.pillarTitle}>Ready for{'\n'}Court</Text>
            <Text style={styles.pillarDesc}>Create reports that lawyers and judges can trust and verify</Text>
          </View>
        </View>

        {/* Location Law Badge */}
        <View style={[styles.lawBadge, { borderColor: badge.color }]}>
          <View style={styles.lawRow}>
            <Ionicons name="location" size={16} color={badge.color} />
            <Text style={styles.lawLocation}>
              {locationInfo?.emoji || ''} {locationInfo?.city || ''}{locationInfo?.city ? ', ' : ''}{locationInfo?.country || 'Detecting...'}
            </Text>
          </View>
          <View style={[styles.lawStatus, { backgroundColor: badge.color + '20' }]}>
            <Ionicons name={badge.icon} size={14} color={badge.color} />
            <Text style={[styles.lawStatusText, { color: badge.color }]}> {badge.text}</Text>
          </View>
        </View>

        {/* Security Status - Simple */}
        <View style={styles.securitySection}>
          <Text style={styles.sectionTitle}>Your Protection Status</Text>
          <View style={styles.securityGrid}>
            <View style={styles.securityItem}>
              <Ionicons
                name={hashChainValid === true ? 'checkmark-circle' : hashChainValid === false ? 'close-circle' : 'ellipse-outline'}
                size={24}
                color={hashChainValid === true ? COLORS.green : hashChainValid === false ? COLORS.red : COLORS.textSecondary}
              />
              <Text style={styles.securityLabel}>Evidence Integrity</Text>
              <Text style={[styles.securityValue, {
                color: hashChainValid === true ? COLORS.green : hashChainValid === false ? COLORS.red : COLORS.textSecondary
              }]}>
                {hashChainValid === true ? 'All Safe' : hashChainValid === false ? 'Issue Found' : 'No data yet'}
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Ionicons
                name={pinEnabled ? 'lock-closed' : 'lock-open'}
                size={24}
                color={pinEnabled ? COLORS.green : COLORS.yellow}
              />
              <Text style={styles.securityLabel}>App Lock</Text>
              <Text style={[styles.securityValue, { color: pinEnabled ? COLORS.green : COLORS.yellow }]}>
                {pinEnabled ? 'On' : 'Off'}
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Ionicons name="cloud-done" size={24} color={lastUploadTime ? COLORS.green : COLORS.textSecondary} />
              <Text style={styles.securityLabel}>Last Backup</Text>
              <Text style={[styles.securityValue, { color: lastUploadTime ? COLORS.green : COLORS.textSecondary }]}>
                {lastUploadTime ? formatTimeAgo(lastUploadTime) : 'Never'}
              </Text>
            </View>
            <View style={styles.securityItem}>
              <Ionicons name="server" size={24} color={stats.total > 0 ? COLORS.blue : COLORS.textSecondary} />
              <Text style={styles.securityLabel}>Cloud</Text>
              <Text style={[styles.securityValue, { color: stats.total > 0 ? COLORS.blue : COLORS.textSecondary }]}>
                {stats.total > 0 ? 'Connected' : 'Standby'}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Ionicons name="mic" size={18} color={COLORS.blue} style={{ marginBottom: 4 }} />
            <Text style={styles.statNumber}>{stats.audio}</Text>
            <Text style={styles.statLabel}>Audio</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="camera" size={18} color={COLORS.orange} style={{ marginBottom: 4 }} />
            <Text style={styles.statNumber}>{stats.photo}</Text>
            <Text style={styles.statLabel}>Photos</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="document-text" size={18} color={COLORS.purple} style={{ marginBottom: 4 }} />
            <Text style={styles.statNumber}>{stats.reports}</Text>
            <Text style={styles.statLabel}>Reports</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Ionicons name="cloud" size={18} color={COLORS.green} style={{ marginBottom: 4 }} />
            <Text style={styles.statNumber}>{formatBytes(stats.totalSize)}</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Record')}>
            <View style={[styles.quickIconCircle, { backgroundColor: COLORS.blue }]}>
              <Ionicons name="mic" size={22} color="#FFF" />
            </View>
            <Text style={styles.quickLabel}>Record Now</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Evidence')}>
            <View style={[styles.quickIconCircle, { backgroundColor: COLORS.green + '30' }]}>
              <Ionicons name="folder" size={22} color={COLORS.green} />
            </View>
            <Text style={styles.quickLabel}>My Evidence</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickBtn} onPress={() => navigation.navigate('Report')}>
            <View style={[styles.quickIconCircle, { backgroundColor: COLORS.purple + '30' }]}>
              <Ionicons name="document-text" size={22} color={COLORS.purple} />
            </View>
            <Text style={styles.quickLabel}>Get Report</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  scrollContent: { paddingHorizontal: 20, paddingTop: 60 },
  header: { alignItems: 'center', marginBottom: 16 },
  logo: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary, letterSpacing: 1 },
  planBadge: {
    flexDirection: 'row', alignItems: 'center', marginTop: 8,
    paddingHorizontal: 12, paddingVertical: 4, borderRadius: 20, borderWidth: 1,
  },
  planText: { fontSize: 12, fontWeight: '600' },
  heroSection: { alignItems: 'center', marginBottom: 24 },
  pulseRing: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: COLORS.green + '15', top: 0,
  },
  shieldCircle: {
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: COLORS.green + '18', justifyContent: 'center', alignItems: 'center', marginTop: 15,
  },
  heroTitle: {
    fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginTop: 16, textAlign: 'center',
  },
  heroTagline: {
    fontSize: 14, fontWeight: '600', color: COLORS.blue, marginTop: 6, textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: 13, color: COLORS.textSecondary, marginTop: 10, textAlign: 'center', lineHeight: 20,
  },
  pillarsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  pillarCard: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.card,
    marginHorizontal: 4, paddingVertical: 16, paddingHorizontal: 6, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pillarIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  pillarTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textPrimary, textAlign: 'center', marginBottom: 6 },
  pillarDesc: { fontSize: 10, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 14 },
  lawBadge: {
    borderWidth: 1, borderRadius: 12, padding: 14,
    backgroundColor: COLORS.card, alignItems: 'center', marginBottom: 20,
  },
  lawRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  lawLocation: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600', marginLeft: 6 },
  lawStatus: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
  lawStatusText: { fontSize: 13, fontWeight: '600' },
  securitySection: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12 },
  securityGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  securityItem: {
    width: (width - 52) / 2, backgroundColor: COLORS.card, borderRadius: 12,
    padding: 16, alignItems: 'center', marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  securityLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 8 },
  securityValue: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  statsCard: {
    flexDirection: 'row', backgroundColor: COLORS.card, borderRadius: 14,
    paddingVertical: 18, borderWidth: 1, borderColor: COLORS.border, marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: COLORS.border },
  quickActions: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  quickBtn: {
    flex: 1, alignItems: 'center', backgroundColor: COLORS.card,
    marginHorizontal: 5, paddingVertical: 16, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  quickIconCircle: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  quickLabel: { color: COLORS.textPrimary, fontSize: 12, fontWeight: '600' },
});





