import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  StatusBar, Switch, Alert, ActivityIndicator, RefreshControl, Modal, TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../utils/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LockScreen, { hasPinSet, clearPIN, isBiometricEnabled, setBiometric, saveDuressPIN, getDuressPIN, clearDuressPIN, saveEmergencyContact, getEmergencyContact } from './LockScreen';

const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981',
  red: '#FF5451', yellow: '#FBBF24', orange: '#F59E0B',
  textPrimary: '#FFFFFF', textSecondary: '#8899AA', border: '#1A3055',
};

const PLAN_LABELS = {
  free: { name: 'Free Plan', color: COLORS.textSecondary, icon: 'person-outline' },
  guard: { name: 'Guard Plan', color: COLORS.green, icon: 'shield-checkmark' },
  proof: { name: 'Proof Plan', color: '#A855F7', icon: 'diamond' },
};

const PLAN_LIMITS = {
  free: { storage: 100 * 1024 * 1024, recording: 1800, photos: 5, reports: 0 },
  guard: { storage: 2 * 1024 * 1024 * 1024, recording: 72000, photos: 100, reports: 10 },
  proof: { storage: 10 * 1024 * 1024 * 1024, recording: 180000, photos: 300, reports: 999 },
};

function SettingRow({ icon, label, value, onPress, isToggle, toggleValue, onToggle, iconColor, danger }) {
  return (
    <TouchableOpacity
      style={styles.settingRow}
      onPress={onPress}
      disabled={isToggle && !onPress}
      activeOpacity={onPress ? 0.6 : 1}
    >
      <View style={styles.settingLeft}>
        <View style={[styles.settingIconBox, { backgroundColor: (iconColor || COLORS.blue) + '15' }]}>
          <Ionicons name={icon} size={18} color={iconColor || COLORS.blue} />
        </View>
        <Text style={[styles.settingLabel, danger && { color: COLORS.red }]}>{label}</Text>
      </View>
      {isToggle ? (
        <Switch
          value={toggleValue}
          onValueChange={onToggle}
          trackColor={{ false: COLORS.border, true: COLORS.blue + '60' }}
          thumbColor={toggleValue ? COLORS.blue : '#555'}
        />
      ) : (
        <View style={styles.settingRight}>
          {value ? <Text style={styles.settingValue}>{value}</Text> : null}
          {onPress ? <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} /> : null}
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function SettingsScreen({ navigation, duressMode }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // User info
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [plan, setPlan] = useState('free');

  // Usage stats
  const [totalStorage, setTotalStorage] = useState(0);
  const [evidenceCount, setEvidenceCount] = useState(0);
  const [audioCount, setAudioCount] = useState(0);
  const [photoCount, setPhotoCount] = useState(0);
  const [monthlyRecording, setMonthlyRecording] = useState(0);
  const [monthlyPhotos, setMonthlyPhotos] = useState(0);
  const [monthlyReports, setMonthlyReports] = useState(0);

  // Toggles
  const [cloudBackup, setCloudBackup] = useState(true);
  const [highQuality, setHighQuality] = useState(true);

  // PIN / Biometric
  const [pinEnabled, setPinEnabled] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [duressEnabled, setDuressEnabled] = useState(false);
  const [showDuressSetup, setShowDuressSetup] = useState(false);
  const [duressInput, setDuressInput] = useState('');
  const [showEmergencySetup, setShowEmergencySetup] = useState(false);
  const [emergencyInput, setEmergencyInput] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
      loadSecuritySettings();
    }, [])
  );

  async function loadSecuritySettings() {
    const pin = await hasPinSet();
    setPinEnabled(pin);
    const bio = await isBiometricEnabled();
    setBioEnabled(bio);
    const duress = await getDuressPIN();
    setDuressEnabled(duress !== null);
    const contact = await getEmergencyContact();
    setEmergencyContact(contact || '');
  }

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const userId = session.user.id;
      setEmail(session.user.email || '');

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profile) {
        setDisplayName(profile.display_name || '');
        setPlan(profile.plan || 'free');
      }

      const { data: evidenceData } = await supabase
        .from('evidence')
        .select('id, type, file_size, duration')
        .eq('user_id', userId);

      if (evidenceData) {
        setEvidenceCount(evidenceData.length);
        setAudioCount(evidenceData.filter(e => e.type === 'audio').length);
        setPhotoCount(evidenceData.filter(e => e.type === 'photo').length);
        const total = evidenceData.reduce((sum, e) => sum + (e.file_size || 0), 0);
        setTotalStorage(total);
      }

      const now = new Date();
      const month = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);
      const { data: usage } = await supabase
        .from('usage_monthly')
        .select('*')
        .eq('user_id', userId)
        .eq('month', month)
        .single();

      if (usage) {
        setMonthlyRecording(usage.recording_seconds || 0);
        setMonthlyPhotos(usage.photo_count || 0);
        setMonthlyReports(usage.report_count || 0);
      }
    } catch (e) {
      console.log('Settings load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function formatDuration(seconds) {
    if (!seconds) return '0min';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return h + 'h ' + m + 'm';
    return m + 'min';
  }

  function getStoragePercent() {
    const limit = PLAN_LIMITS[plan]?.storage || PLAN_LIMITS.free.storage;
    return Math.min((totalStorage / limit) * 100, 100);
  }

  // PIN toggle
  async function handlePinToggle() {
    if (pinEnabled) {
      Alert.alert(
        'Remove PIN',
        'Are you sure you want to remove PIN lock?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await clearPIN();
              setPinEnabled(false);
              setBioEnabled(false);
              Alert.alert('PIN Removed', 'PIN lock has been disabled.');
            },
          },
        ]
      );
    } else {
      setShowPinSetup(true);
    }
  }

  // Biometric toggle
  async function handleBioToggle(val) {
    if (!pinEnabled) {
      Alert.alert('PIN Required', 'Please set a PIN first before enabling biometric unlock.');
      return;
    }
    await setBiometric(val);
    setBioEnabled(val);
    if (val) {
      Alert.alert('Biometric Enabled', 'You can now unlock with fingerprint or face.');
    }
  }

  // Duress PIN toggle
  function handleDuressToggle() {
    if (!pinEnabled) {
      Alert.alert('PIN Required', 'Please set a PIN first before setting a duress PIN.');
      return;
    }
    if (duressEnabled) {
      Alert.alert('Remove Duress PIN', 'Are you sure you want to remove the duress PIN?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: async () => {
          await clearDuressPIN();
          setDuressEnabled(false);
          Alert.alert('Removed', 'Duress PIN has been removed.');
        }}
      ]);
    } else {
      setDuressInput('');
      setShowDuressSetup(true);
    }
  }

  async function confirmDuressPin() {
    if (!duressInput || duressInput.length !== 6 || !/^\d{6}$/.test(duressInput)) {
      Alert.alert('Invalid', 'Please enter exactly 6 digits.');
      return;
    }
    await saveDuressPIN(duressInput);
    setDuressEnabled(true);
    setShowDuressSetup(false);
    setDuressInput('');
    Alert.alert('Duress PIN Set', 'When entered at lock screen, a decoy empty screen will be shown.');
  }

  function handleEmergencyContact() {
    setEmergencyInput(emergencyContact);
    setShowEmergencySetup(true);
  }

  async function confirmEmergencyContact() {
    if (!emergencyInput || emergencyInput.trim().length === 0) return;
    await saveEmergencyContact(emergencyInput.trim());
    setEmergencyContact(emergencyInput.trim());
    setShowEmergencySetup(false);
    setEmergencyInput('');
    Alert.alert('Saved', 'Emergency contact updated.');
  }

  // PIN setup complete
  function handlePinSetupComplete() {
    setShowPinSetup(false);
    setPinEnabled(true);
    loadSecuritySettings();
  }

  async function handleLogout() {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoggingOut(true);
            try {
              await supabase.auth.signOut();
            } catch (e) {
              Alert.alert('Error', e.message);
            } finally {
              setLoggingOut(false);
            }
          },
        },
      ]
    );
  }

  async function handleDeleteAccount() {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all evidence data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you ABSOLUTELY sure? All your evidence, recordings, and reports will be permanently destroyed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete Everything',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) return;
                      const { data: files } = await supabase.storage
                        .from('evidence-files')
                        .list(session.user.id);
                      if (files && files.length > 0) {
                        const paths = files.map(f => session.user.id + '/' + f.name);
                        await supabase.storage.from('evidence-files').remove(paths);
                      }
                      await supabase.from('reports').delete().eq('user_id', session.user.id);
                      await supabase.from('evidence').delete().eq('user_id', session.user.id);
                      await supabase.from('user_profiles').delete().eq('id', session.user.id);
                      await clearPIN();
                      await supabase.auth.signOut();
                      Alert.alert('Deleted', 'Your account has been deleted.');
                    } catch (e) {
                      Alert.alert('Error', e.message);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  const planInfo = PLAN_LABELS[plan] || PLAN_LABELS.free;
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.blue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      {/* Duress PIN Setup Modal */}
      <Modal visible={showDuressSetup} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 30 }}>
          <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 24 }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Set Duress PIN</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 16 }}>Enter a 6-digit PIN different from your main PIN. This PIN will show a decoy empty screen.</Text>
            <TextInput
              style={{ backgroundColor: COLORS.bg, color: COLORS.textPrimary, borderRadius: 10, padding: 14, fontSize: 20, textAlign: 'center', letterSpacing: 8, borderWidth: 1, borderColor: COLORS.border }}
              value={duressInput}
              onChangeText={setDuressInput}
              keyboardType="number-pad"
              maxLength={6}
              secureTextEntry
              placeholder="000000"
              placeholderTextColor={COLORS.textSecondary}
            />
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <TouchableOpacity onPress={() => setShowDuressSetup(false)} style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDuressPin} style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.red, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Set PIN</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Emergency Contact Modal */}
      <Modal visible={showEmergencySetup} animationType="slide" transparent statusBarTranslucent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 30 }}>
          <View style={{ backgroundColor: COLORS.card, borderRadius: 16, padding: 24 }}>
            <Text style={{ color: COLORS.textPrimary, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Emergency Contact</Text>
            <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginBottom: 16 }}>Enter a phone number or email. This contact will be silently notified when duress PIN is used.</Text>
            <TextInput
              style={{ backgroundColor: COLORS.bg, color: COLORS.textPrimary, borderRadius: 10, padding: 14, fontSize: 16, borderWidth: 1, borderColor: COLORS.border }}
              value={emergencyInput}
              onChangeText={setEmergencyInput}
              placeholder="Phone or email"
              placeholderTextColor={COLORS.textSecondary}
              autoCapitalize="none"
            />
            <View style={{ flexDirection: 'row', marginTop: 16, gap: 10 }}>
              <TouchableOpacity onPress={() => setShowEmergencySetup(false)} style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.bg, alignItems: 'center' }}>
                <Text style={{ color: COLORS.textSecondary, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmEmergencyContact} style={{ flex: 1, padding: 14, borderRadius: 10, backgroundColor: COLORS.green, alignItems: 'center' }}>
                <Text style={{ color: '#FFF', fontWeight: '700' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PIN Setup Modal */}
      <Modal visible={showPinSetup} animationType="slide" statusBarTranslucent>
        <LockScreen
          onUnlock={handlePinSetupComplete}
          isSetup={true}
        />
      </Modal>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.blue} />
        }
      >
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={[styles.avatar, { backgroundColor: planInfo.color + '20' }]}>
            <Ionicons name={planInfo.icon} size={28} color={planInfo.color} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{displayName || email.split('@')[0]}</Text>
            <Text style={styles.profileEmail}>{email}</Text>
            <View style={[styles.planBadge, { backgroundColor: planInfo.color + '20' }]}>
              <Text style={[styles.planBadgeText, { color: planInfo.color }]}>{planInfo.name}</Text>
            </View>
          </View>
        </View>

        {/* Security */}
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="lock-closed"
            label="PIN Lock"
            value={pinEnabled ? 'On' : 'Off'}
            onPress={handlePinToggle}
            iconColor={pinEnabled ? COLORS.green : COLORS.textSecondary}
          />
          <SettingRow
            icon="finger-print"
            label="Biometric Unlock"
            isToggle
            toggleValue={bioEnabled}
            onToggle={handleBioToggle}
            iconColor={bioEnabled ? COLORS.green : COLORS.textSecondary}
          />
          {pinEnabled && (
            <SettingRow
              icon="refresh"
              label="Change PIN"
              onPress={() => {
                Alert.alert(
                  'Change PIN',
                  'Remove current PIN and set a new one?',
                  [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Change',
                      onPress: async () => {
                        await clearPIN();
                        setPinEnabled(false);
                        setBioEnabled(false);
                        setShowPinSetup(true);
                      },
                    },
                  ]
                );
              }}
            />
          )}
        </View>

        {/* Duress PIN - Hidden Safety */}
        {pinEnabled && (
          <>
            <Text style={styles.sectionTitle}>Hidden Safety</Text>
            <View style={styles.sectionCard}>
              <SettingRow
                icon="shield-half"
                label="Duress PIN"
                value={duressEnabled ? 'Active' : 'Off'}
                onPress={handleDuressToggle}
                iconColor={duressEnabled ? COLORS.red : COLORS.textSecondary}
              />
              {duressEnabled && (
                <SettingRow
                  icon="call"
                  label="Emergency Contact"
                  value={emergencyContact || 'Not set'}
                  onPress={handleEmergencyContact}
                  iconColor={emergencyContact ? COLORS.green : COLORS.yellow}
                />
              )}
            </View>
          </>
        )}

        {/* Usage Overview */}
        <Text style={styles.sectionTitle}>Usage Overview</Text>
        <View style={styles.usageGrid}>
          <View style={styles.usageCard}>
            <Ionicons name="folder" size={20} color={COLORS.blue} />
            <Text style={styles.usageValue}>{evidenceCount}</Text>
            <Text style={styles.usageLabel}>Evidence</Text>
          </View>
          <View style={styles.usageCard}>
            <Ionicons name="mic" size={20} color={COLORS.green} />
            <Text style={styles.usageValue}>{audioCount}</Text>
            <Text style={styles.usageLabel}>Audio</Text>
          </View>
          <View style={styles.usageCard}>
            <Ionicons name="camera" size={20} color={COLORS.orange} />
            <Text style={styles.usageValue}>{photoCount}</Text>
            <Text style={styles.usageLabel}>Photos</Text>
          </View>
        </View>

        {/* Monthly Usage */}
        <Text style={styles.sectionTitle}>Monthly Usage</Text>
        <View style={styles.sectionCard}>
          <View style={styles.usageRow}>
            <Text style={styles.usageRowLabel}>Recording Time</Text>
            <Text style={styles.usageRowValue}>
              {formatDuration(monthlyRecording)} / {formatDuration(limits.recording)}
            </Text>
          </View>
          <View style={styles.usageBarBg}>
            <View style={[styles.usageBarFill, { width: Math.min((monthlyRecording / limits.recording) * 100, 100) + '%' }]} />
          </View>

          <View style={[styles.usageRow, { marginTop: 14 }]}>
            <Text style={styles.usageRowLabel}>Photos</Text>
            <Text style={styles.usageRowValue}>
              {monthlyPhotos} / {limits.photos}
            </Text>
          </View>
          <View style={styles.usageBarBg}>
            <View style={[styles.usageBarFill, { width: Math.min((monthlyPhotos / limits.photos) * 100, 100) + '%', backgroundColor: COLORS.green }]} />
          </View>

          <View style={[styles.usageRow, { marginTop: 14 }]}>
            <Text style={styles.usageRowLabel}>Reports</Text>
            <Text style={styles.usageRowValue}>
              {monthlyReports} / {limits.reports === 999 ? 'Unlimited' : limits.reports === 0 ? 'N/A' : limits.reports}
            </Text>
          </View>
          <View style={styles.usageBarBg}>
            <View style={[styles.usageBarFill, { width: limits.reports > 0 ? Math.min((monthlyReports / limits.reports) * 100, 100) + '%' : '0%', backgroundColor: COLORS.orange }]} />
          </View>
        </View>

        {/* Storage */}
        <Text style={styles.sectionTitle}>Storage</Text>
        <View style={styles.sectionCard}>
          <View style={styles.usageRow}>
            <Text style={styles.usageRowLabel}>Used</Text>
            <Text style={styles.usageRowValue}>
              {formatBytes(totalStorage)} / {formatBytes(limits.storage)}
            </Text>
          </View>
          <View style={styles.usageBarBg}>
            <View style={[
              styles.usageBarFill,
              {
                width: getStoragePercent() + '%',
                backgroundColor: getStoragePercent() > 80 ? COLORS.red : getStoragePercent() > 50 ? COLORS.orange : COLORS.blue,
              }
            ]} />
          </View>
          <Text style={styles.storageDetail}>
            {formatBytes(limits.storage - totalStorage)} remaining
          </Text>
        </View>

        {/* Recording */}
        <Text style={styles.sectionTitle}>Recording</Text>
        <View style={styles.sectionCard}>
          <SettingRow icon="musical-notes" label="High Quality Audio" isToggle toggleValue={highQuality} onToggle={setHighQuality} />
          <SettingRow icon="cloud-upload" label="Auto Cloud Backup" isToggle toggleValue={cloudBackup} onToggle={setCloudBackup} />
        </View>

        {/* Plan */}
        <Text style={styles.sectionTitle}>Plan</Text>
        <View style={styles.sectionCard}>
          <SettingRow icon="shield-checkmark" label="Current Plan" value={planInfo.name} iconColor={planInfo.color} onPress={() => navigation.navigate('PlanScreen')} />
          <SettingRow icon="card" label="Manage Subscription" onPress={() => navigation.navigate('PlanScreen')} />
          {plan === 'free' && (
            <TouchableOpacity style={styles.upgradeCard} onPress={() => navigation.navigate('PlanScreen')}>
              <Ionicons name="rocket" size={20} color={COLORS.blue} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.upgradeTitle}>Upgrade to Guard</Text>
                <Text style={styles.upgradeDesc}>Unlock PDF reports, more storage, and longer recordings</Text>
              </View>
              <Text style={styles.upgradePrice}>.99/mo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* About */}
        <Text style={styles.sectionTitle}>About</Text>
        <View style={styles.sectionCard}>
          <SettingRow icon="shield-checkmark" label="Privacy Policy" onPress={() => Alert.alert('Privacy Policy', 'Coming soon.')} />
          <SettingRow icon="document" label="Terms of Service" onPress={() => Alert.alert('Terms of Service', 'Coming soon.')} />
          <SettingRow icon="help-circle" label="Help Center" onPress={() => Alert.alert('Help Center', 'Contact: support@verihush.com')} />
          <SettingRow icon="information-circle" label="Version" value="1.0.0 (beta)" />
        </View>

        {/* Account */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.sectionCard}>
          <SettingRow
            icon="log-out"
            label={loggingOut ? 'Logging out...' : 'Log Out'}
            onPress={handleLogout}
            iconColor={COLORS.orange}
          />
          <SettingRow
            icon="trash"
            label="Delete Account"
            onPress={handleDeleteAccount}
            iconColor={COLORS.red}
            danger
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  header: { paddingTop: 50, paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  scrollContent: { paddingHorizontal: 20 },
  profileCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card,
    borderRadius: 16, padding: 18, marginTop: 10, marginBottom: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  profileInfo: { flex: 1, marginLeft: 14 },
  profileName: { color: COLORS.textPrimary, fontSize: 17, fontWeight: '700' },
  profileEmail: { color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  planBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginTop: 6 },
  planBadgeText: { fontSize: 11, fontWeight: '700' },
  usageGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  usageCard: {
    flex: 1, backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border,
  },
  usageValue: { color: COLORS.textPrimary, fontSize: 22, fontWeight: '800', marginTop: 6 },
  usageLabel: { color: COLORS.textSecondary, fontSize: 10, marginTop: 2, textTransform: 'uppercase' },
  sectionTitle: {
    color: COLORS.textSecondary, fontSize: 12, fontWeight: '700',
    textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8, marginTop: 8,
  },
  sectionCard: {
    backgroundColor: COLORS.card, borderRadius: 14, paddingHorizontal: 14,
    paddingVertical: 10, marginBottom: 16, borderWidth: 1, borderColor: COLORS.border,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 13, borderBottomWidth: 0.5, borderBottomColor: COLORS.border,
  },
  settingLeft: { flexDirection: 'row', alignItems: 'center' },
  settingIconBox: {
    width: 32, height: 32, borderRadius: 8,
    justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  settingLabel: { color: COLORS.textPrimary, fontSize: 15 },
  settingRight: { flexDirection: 'row', alignItems: 'center' },
  settingValue: { color: COLORS.textSecondary, fontSize: 13, marginRight: 6 },
  usageRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  usageRowLabel: { color: COLORS.textSecondary, fontSize: 13 },
  usageRowValue: { color: COLORS.textPrimary, fontSize: 13, fontWeight: '600' },
  usageBarBg: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  usageBarFill: { height: 6, backgroundColor: COLORS.blue, borderRadius: 3 },
  storageDetail: { color: COLORS.textSecondary, fontSize: 11, marginTop: 6 },
  upgradeCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.blue + '10',
    borderRadius: 12, padding: 14, marginTop: 8, borderWidth: 1, borderColor: COLORS.blue + '30',
  },
  upgradeTitle: { color: COLORS.blue, fontSize: 14, fontWeight: '700' },
  upgradeDesc: { color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  upgradePrice: { color: COLORS.blue, fontSize: 15, fontWeight: '800' },
});













