import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, RefreshControl, Alert, Modal, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../utils/supabase';
import { t } from '../i18n';
import { useFocusEffect } from '@react-navigation/native';

const COLORS = {
  bg: '#071325', card: '#0F2140', blue: '#4D8EFF', green: '#10B981',
  red: '#FF5451', yellow: '#FBBF24', textPrimary: '#FFFFFF',
  textSecondary: '#8899AA', border: '#1A3055',
};

const FILTERS = ['All', 'Audio', 'Photo', 'Notes'];

export default function EvidenceScreen({ navigation, route, duressMode }) {
  const [activeFilter, setActiveFilter] = useState('All');
  const [evidence, setEvidence] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

  useFocusEffect(
    useCallback(() => { loadEvidence(); }, [])
  );

  const loadEvidence = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase
        .from('evidence')
        .select('*')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setEvidence(data || []);
    } catch (error) { console.log('Load error:', error.message); }
    finally { setLoading(false); }
  };

  const onRefresh = async () => { setRefreshing(true); await loadEvidence(); setRefreshing(false); };

  const filteredEvidence = activeFilter === 'All' ? evidence
    : evidence.filter(e => {
        if (activeFilter === 'Audio') return e.type === 'audio';
        if (activeFilter === 'Photo') return e.type === 'photo';
        if (activeFilter === 'Notes') return e.type === 'note';
        return true;
      });

  const getTypeIcon = (type) => {
    if (type === 'audio') return { name: 'mic', color: COLORS.blue };
    if (type === 'photo') return { name: 'image', color: COLORS.green };
    return { name: 'document-text', color: COLORS.yellow };
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return (d.getMonth()+1) + '/' + d.getDate() + ' ' + String(d.getHours()).padStart(2,'0') + ':' + String(d.getMinutes()).padStart(2,'0');
  };

  const formatDuration = (secs) => {
    if (!secs) return '';
    return Math.floor(secs/60) + ':' + String(secs%60).padStart(2,'0');
  };

  const deleteEvidence = async (item) => {
    Alert.alert('Delete Evidence', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          if (item.file_url) await supabase.storage.from('evidence-files').remove([item.file_url]);
          const hashResult = await supabase.from('hash_log').delete().eq('evidence_id', item.id);
          const evidenceResult = await supabase.from('evidence').delete().eq('id', item.id);
          
          if (evidenceResult.error) {
            Alert.alert('Delete Failed', evidenceResult.error.message);
          } else {
            setEvidence(prev => prev.filter(e => e.id !== item.id));
            Alert.alert('Deleted', 'Evidence removed successfully');
          }
        } catch (error) { Alert.alert('Error', error.message); }
      }}
    ]);
  };

  const handleAddOption = (type) => {
    setShowAddModal(false);
    if (type === 'audio' || type === 'photo') {
      navigation.navigate('Record');
    }
  };


  // Duress mode: show empty decoy screen
  if (duressMode) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Evidence</Text>
        </View>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <Ionicons name="folder-open-outline" size={64} color={COLORS.textSecondary} />
          <Text style={{ color: COLORS.textSecondary, fontSize: 16, marginTop: 12 }}>{t('evidence.no_files')}</Text>
          <Text style={{ color: COLORS.textSecondary, fontSize: 13, marginTop: 4 }}>{t('evidence.start_recording')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.bg} />
      <View style={styles.header}>
        <Text style={styles.title}>{t('evidence.title')}</Text>
        <Text style={styles.subtitle}>{evidence.length} file(s) secured</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f} style={[styles.filterBtn, activeFilter === f && styles.filterBtnActive]}
            onPress={() => setActiveFilter(f)}>
            <Text style={[styles.filterText, activeFilter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.blue} />}>
        {filteredEvidence.length === 0 && !loading ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="shield-checkmark" size={48} color={COLORS.blue} />
            </View>
            <Text style={styles.emptyTitle}>{t('evidence.no_yet')}</Text>
            <Text style={styles.emptyDesc}>{t('evidence.no_yet_desc')}</Text>
          </View>
        ) : (
          filteredEvidence.map((item) => {
            const icon = getTypeIcon(item.type);
            return (
              <TouchableOpacity key={item.id} style={styles.evidenceCard}
                onPress={() => navigation.navigate('EvidenceDetail', { item })}
                onLongPress={() => deleteEvidence(item)}>
                <View style={[styles.iconCircle, { backgroundColor: icon.color + '20' }]}>
                  <Ionicons name={icon.name} size={22} color={icon.color} />
                </View>
                <View style={styles.evidenceInfo}>
                  <Text style={styles.evidenceTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
                  <View style={styles.evidenceMeta}>
                    <Text style={styles.metaText}>{formatDate(item.created_at)}</Text>
                    {item.duration ? <Text style={styles.metaText}> · {formatDuration(item.duration)}</Text> : null}
                    {item.city ? <Text style={styles.metaText}> · {item.city}</Text> : null}
                  </View>
                  <View style={styles.hashRow}>
                    <Ionicons name="finger-print" size={12} color={COLORS.green} />
                    <Text style={styles.hashText}> {item.sha256_hash ? item.sha256_hash.substring(0,16) + '...' : 'No hash'}</Text>
                  </View>
                </View>
                <Ionicons name="shield-checkmark" size={18} color={COLORS.green} />
              </TouchableOpacity>
            );
          })
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={() => setShowAddModal(true)}>
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={() => setShowAddModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowAddModal(false)}>
          <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t('evidence.add')}</Text>

            <TouchableOpacity style={styles.modalOption} onPress={() => handleAddOption('audio')}>
              <View style={[styles.modalIconCircle, { backgroundColor: COLORS.blue + '20' }]}>
                <Ionicons name="mic" size={22} color={COLORS.blue} />
              </View>
              <Text style={styles.modalOptionText}>{t('evidence.audio_recording')}</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalOption} onPress={() => handleAddOption('photo')}>
              <View style={[styles.modalIconCircle, { backgroundColor: COLORS.green + '20' }]}>
                <Ionicons name="camera" size={22} color={COLORS.green} />
              </View>
              <Text style={styles.modalOptionText}>Photo</Text>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity style={[styles.modalOption, { opacity: 0.5 }]} disabled>
              <View style={[styles.modalIconCircle, { backgroundColor: COLORS.yellow + '20' }]}>
                <Ionicons name="create" size={22} color={COLORS.yellow} />
              </View>
              <Text style={styles.modalOptionText}>Note (Coming Soon)</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setShowAddModal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 60, paddingHorizontal: 20, paddingBottom: 10 },
  title: { fontSize: 24, fontWeight: '800', color: COLORS.textPrimary },
  subtitle: { fontSize: 14, color: COLORS.textSecondary, marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 10, marginBottom: 10 },
  filterBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.card, marginRight: 8, borderWidth: 1, borderColor: COLORS.border },
  filterBtnActive: { backgroundColor: COLORS.blue, borderColor: COLORS.blue },
  filterText: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: '#FFF' },
  scrollContent: { paddingHorizontal: 20 },
  emptyState: { alignItems: 'center', marginTop: 40 },
  emptyIconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: COLORS.blue + '15', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 10 },
  emptyDesc: { fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', lineHeight: 22 },
  evidenceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: COLORS.border },
  iconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  evidenceInfo: { flex: 1 },
  evidenceTitle: { color: COLORS.textPrimary, fontSize: 15, fontWeight: '600' },
  evidenceMeta: { flexDirection: 'row', marginTop: 4 },
  metaText: { color: COLORS.textSecondary, fontSize: 12 },
  hashRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  hashText: { color: COLORS.green, fontSize: 11, fontFamily: 'monospace' },
  fab: { position: 'absolute', bottom: 90, right: 20, width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.blue, justifyContent: 'center', alignItems: 'center', elevation: 8 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary, marginBottom: 20, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  modalIconCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 14 },
  modalOptionText: { flex: 1, fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
  modalCancelBtn: { marginTop: 16, paddingVertical: 14, borderRadius: 12, backgroundColor: COLORS.border, alignItems: 'center' },
  modalCancelText: { fontSize: 16, fontWeight: '600', color: COLORS.textSecondary },
});





