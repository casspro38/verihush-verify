import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { createAndSharePDF } from '../utils/pdfGenerator';
import { checkPdfQuota } from '../utils/planLimits';

const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF',
  green: '#10B981', red: '#EF4444', orange: '#F59E0B',
  textPrimary: '#FFFFFF', textSecondary: '#8899AA',
  border: '#1A3055',
};

export default function ReportScreen({ navigation }) {
  const [evidence, setEvidence] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState('create');
  const [userPlan, setUserPlan] = useState('free');
  const [userEmail, setUserEmail] = useState('');

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setUserEmail(session.user.email);

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('plan')
        .eq('id', session.user.id)
        .single();
      setUserPlan(profile?.plan || 'free');

      const { data: evData } = await supabase
        .from('evidence')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setEvidence(evData || []);

      const { data: repData } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      setReports(repData || []);
    } catch (e) {
      console.log('Load error:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  }

  function selectAll() {
    if (selectedIds.length === evidence.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(evidence.map(e => e.id));
    }
  }

  async function handleDeleteReport(reportId) {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to delete this report? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('reports').delete().eq('id', reportId);
              if (error) throw error;
              setReports(prev => prev.filter(r => r.id !== reportId));
              Alert.alert('Deleted', 'Report has been deleted.');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete: ' + e.message);
            }
          },
        },
      ]
    );
  }

  async function handleGeneratePDF() {
    if (selectedIds.length === 0) {
      Alert.alert('Select Evidence', 'Please select at least 1 evidence item for the report.');
      return;
    }

    const quota = await checkPdfQuota();
    if (!quota.allowed) {
      if (quota.plan === 'free') {
        Alert.alert('PDF Limit Reached', 'Free plan allows 1 PDF report. Upgrade to Guard for 10 reports per month.', [
          { text: 'Later', style: 'cancel' },
          { text: 'See Plans', onPress: () => navigation.getParent()?.navigate('Settings', { screen: 'PlanScreen' }) },
        ]);
      } else {
        Alert.alert('Monthly Limit Reached', 'You have used all 10 PDF reports this month. Upgrade to Proof for unlimited reports.', [
          { text: 'OK' },
        ]);
      }
      return;
    }

    setGenerating(true);
    try {
      const selectedEvidence = evidence.filter(e => selectedIds.includes(e.id));
      const result = await createAndSharePDF(selectedEvidence, userEmail);

      if (result.success) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          const now = new Date();
          const month = now.getFullYear() + '-' + ('0' + (now.getMonth() + 1)).slice(-2);
          await supabase.rpc('increment_usage', {
            p_user_id: session.user.id,
            p_month: month,
            p_field: 'report_count',
            p_amount: 1,
          });
        }
        Alert.alert(
          'PDF Created',
          'Report ID: ' + result.reportId,
          [{ text: 'OK', onPress: () => { setSelectedIds([]); loadData(); } }]
        );
      } else {
        Alert.alert('Generation Failed', result.error);
      }
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setGenerating(false);
    }
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function formatDuration(seconds) {
    if (!seconds) return '';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m + 'm ' + s + 's';
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.blue} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reports</Text>
        <View style={[styles.planBadge, { backgroundColor: userPlan === 'guard' ? '#0D2E1B' : userPlan === 'proof' ? '#2D1B3E' : '#1A3055' }]}>
          <Text style={[styles.planText, { color: userPlan === 'guard' ? COLORS.green : userPlan === 'proof' ? '#A855F7' : COLORS.blue }]}>{userPlan.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'create' && styles.tabActive]}
          onPress={() => setTab('create')}
        >
          <Ionicons name="add-circle-outline" size={16} color={tab === 'create' ? COLORS.blue : COLORS.textSecondary} />
          <Text style={[styles.tabText, tab === 'create' && styles.tabTextActive]}>  New Report</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, tab === 'history' && styles.tabActive]}
          onPress={() => setTab('history')}
        >
          <Ionicons name="time-outline" size={16} color={tab === 'history' ? COLORS.blue : COLORS.textSecondary} />
          <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>  History ({reports.length})</Text>
        </TouchableOpacity>
      </View>

      {tab === 'create' ? (
        <ScrollView
          style={styles.scrollArea}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.blue} />}
        >
          {userPlan === 'free' && (
            <View style={styles.upgradeCard}>
              <Ionicons name="lock-closed" size={28} color={COLORS.orange} />
              <Text style={styles.upgradeTitle}>Upgrade Required</Text>
              <Text style={styles.upgradeDesc}>
                Free plan allows 1 PDF report.{'\n'}
                Upgrade to Guard ($3.99/mo) for 10 reports per month.
              </Text>
            </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Select Evidence ({selectedIds.length}/{evidence.length})</Text>
            {evidence.length > 0 && (
              <TouchableOpacity onPress={selectAll}>
                <Text style={styles.selectAllText}>
                  {selectedIds.length === evidence.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {evidence.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="folder-open-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No evidence yet</Text>
              <Text style={styles.emptySubText}>Record audio or take photos in the Record tab first</Text>
            </View>
          ) : (
            evidence.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.evidenceCard, isSelected && styles.evidenceCardSelected]}
                  onPress={() => toggleSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <Ionicons name="checkmark" size={14} color="#FFF" />}
                  </View>
                  <Ionicons
                    name={item.type === 'audio' ? 'mic' : item.type === 'photo' ? 'camera' : 'create'}
                    size={20}
                    color={item.type === 'audio' ? COLORS.blue : item.type === 'photo' ? COLORS.green : COLORS.orange}
                    style={{ marginRight: 12 }}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.evidenceTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                    <Text style={styles.evidenceMeta}>
                      {formatDate(item.created_at)}
                      {item.city ? '  ·  ' + item.city : ''}
                      {item.duration ? '  ·  ' + formatDuration(item.duration) : ''}
                      {item.file_size ? '  ·  ' + (item.file_size / 1024).toFixed(0) + 'KB' : ''}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}

          {evidence.length > 0 && (
            <TouchableOpacity
              style={[
                styles.generateBtn,
                (selectedIds.length === 0 || generating) && styles.generateBtnDisabled,
              ]}
              onPress={handleGeneratePDF}
              disabled={selectedIds.length === 0 || generating}
            >
              {generating ? (
                <ActivityIndicator color="#FFF" size="small" />
              ) : (
                <>
                  <Ionicons name="document-text" size={20} color="#FFF" />
                  <Text style={styles.generateBtnText}>
                    Generate PDF Report ({selectedIds.length} items)
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <View style={styles.infoCard}>
            <Text style={styles.infoTitle}>What's included in the report</Text>
            {[
              'SHA-256 hash certificate',
              'Hash chain integrity verification',
              'Evidence timeline & statistics',
              'GPS location & consent law info',
              'File size & recording duration',
              'QR code for independent verification',
            ].map((text, i) => (
              <View key={i} style={styles.infoRow}>
                <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                <Text style={styles.infoText}>{text}</Text>
              </View>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      ) : (
        <ScrollView
          style={styles.scrollArea}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); loadData(); }} tintColor={COLORS.blue} />}
        >
          {reports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Ionicons name="documents-outline" size={48} color={COLORS.textSecondary} />
              <Text style={styles.emptyText}>No reports yet</Text>
              <Text style={styles.emptySubText}>Select evidence in the New Report tab and generate a PDF</Text>
            </View>
          ) : (
            reports.map((rep) => (
              <View key={rep.id} style={styles.reportCard}>
                <View style={styles.reportHeader}>
                  <Ionicons name="document-text" size={22} color={COLORS.blue} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.reportTitle}>{rep.title}</Text>
                    <Text style={styles.reportMetaText}>
                      {formatDate(rep.created_at)}  ·  {rep.total_evidence_count} items
                      {rep.total_duration_seconds ? '  ·  ' + formatDuration(rep.total_duration_seconds) : ''}
                    </Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: rep.status === 'completed' ? '#062E1B' : '#2D1B00' }]}>
                    <Text style={{ color: rep.status === 'completed' ? COLORS.green : COLORS.orange, fontSize: 11, fontWeight: '700' }}>
                      {rep.status === 'completed' ? 'Done' : 'Pending'}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteReport(rep.id)} style={{ marginLeft: 8, padding: 6 }}>
                    <Ionicons name="trash-outline" size={20} color={COLORS.red} />
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 40 }} />
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 50, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textPrimary },
  planBadge: { paddingHorizontal: 12, paddingVertical: 5, borderRadius: 12 },
  planText: { fontSize: 11, fontWeight: '800', letterSpacing: 1 },
  tabRow: { flexDirection: 'row', marginHorizontal: 20, marginBottom: 16, backgroundColor: COLORS.card, borderRadius: 12, padding: 4 },
  tabBtn: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: '#1A3055' },
  tabText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  tabTextActive: { color: COLORS.blue },
  scrollArea: { flex: 1, paddingHorizontal: 20 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 20 },
  sectionTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '700', flex: 1 },
  selectAllText: { color: COLORS.blue, fontSize: 13, fontWeight: '600', minWidth: 80, textAlign: 'right' },
  evidenceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1.5, borderColor: COLORS.border },
  evidenceCardSelected: { borderColor: COLORS.blue, backgroundColor: '#0D1F3C' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.textSecondary, marginRight: 12, justifyContent: 'center', alignItems: 'center' },
  checkboxChecked: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  evidenceTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '600' },
  evidenceMeta: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  generateBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.blue, borderRadius: 14, paddingVertical: 16, marginTop: 20, marginBottom: 8 },
  generateBtnDisabled: { backgroundColor: '#1A3055', opacity: 0.5 },
  generateBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 8 },
  emptyCard: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 12 },
  emptySubText: { color: COLORS.textSecondary, fontSize: 13, marginTop: 6 },
  upgradeCard: { backgroundColor: '#2D1B00', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 20, borderWidth: 1.5, borderColor: COLORS.orange },
  upgradeTitle: { color: COLORS.orange, fontSize: 17, fontWeight: '800', marginTop: 10 },
  upgradeDesc: { color: '#D4A574', fontSize: 13, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  infoCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginTop: 20, borderWidth: 1, borderColor: COLORS.border },
  infoTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700', marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  infoText: { color: COLORS.textSecondary, fontSize: 13, marginLeft: 8 },
  reportCard: { backgroundColor: COLORS.card, borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  reportHeader: { flexDirection: 'row', alignItems: 'center' },
  reportTitle: { color: COLORS.textPrimary, fontSize: 14, fontWeight: '700' },
  reportMetaText: { color: COLORS.textSecondary, fontSize: 11, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
});



