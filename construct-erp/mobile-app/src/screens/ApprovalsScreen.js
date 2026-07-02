import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet, Modal, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { approvalsAPI } from '../api/client';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function ApprovalsScreen() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null); // { item, action }
  const [comments, setComments] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['approvals-pending'],
    queryFn: () => approvalsAPI.pending().then(r => r.data?.data ?? r.data ?? []),
  });

  const decide = useMutation({
    mutationFn: ({ entity_type, entity_id, action, comments }) => approvalsAPI.decide(entity_type, entity_id, action, comments),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals-pending'] });
      setModal(null);
      setComments('');
    },
    onError: (e) => Alert.alert('Failed', e?.response?.data?.error || 'Could not process approval'),
  });

  const items = data || [];

  const openModal = (item, action) => { setComments(''); setModal({ item, action }); };
  const submitDecision = () => {
    decide.mutate({ entity_type: modal.item.entity_type, entity_id: modal.item.id, action: modal.action, comments });
  };

  return (
    <Screen>
      <ScreenHeader title="My Approvals" subtitle={`${items.length} pending`} />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load approvals" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="check-circle-outline" title="All caught up" subtitle="No pending approvals right now." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => `${item.entity_type}-${item.id}-${i}`}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.rowTop}>
                <Text style={styles.type}>{item.doc_type || item.entity_type?.replace(/_/g, ' ')}</Text>
                {!!item.amount && <Text style={styles.amount}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>}
              </View>
              <Text style={styles.title}>{item.ref_no || item.party_name || `#${item.id}`}</Text>
              {item.party_name && item.ref_no ? <Text style={styles.sub}>{item.party_name}</Text> : null}
              {item.extra_info ? <Text style={styles.sub}>{item.extra_info}</Text> : null}
              <View style={styles.metaRow}>
                {item.project_name ? <Text style={styles.meta}>{item.project_name}</Text> : null}
                {item.doc_date ? <Text style={styles.meta}>{dayjs(item.doc_date).format('DD MMM YYYY')}</Text> : null}
              </View>
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => openModal(item, 'reject')}>
                  <MaterialCommunityIcons name="close" size={16} color={theme.colors.danger} />
                  <Text style={styles.rejectText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => openModal(item, 'approve')}>
                  <MaterialCommunityIcons name="check" size={16} color="#fff" />
                  <Text style={styles.approveText}>Approve</Text>
                </TouchableOpacity>
              </View>
            </Card>
          )}
        />
      )}

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modal?.action === 'approve' ? 'Approve' : 'Reject'} {modal?.item.doc_type || 'item'}
            </Text>
            <Text style={styles.modalSub}>{modal?.item.ref_no || modal?.item.party_name}</Text>
            <TextInput
              value={comments}
              onChangeText={setComments}
              placeholder="Add comments (optional)…"
              placeholderTextColor={theme.colors.muted}
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => setModal(null)} style={{ flex: 1 }} />
              <Button
                title={modal?.action === 'approve' ? 'Approve' : 'Reject'}
                onPress={submitDecision}
                loading={decide.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  type: { fontSize: 11, fontWeight: '700', color: theme.colors.primary, textTransform: 'uppercase' },
  amount: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  title: { fontSize: 15, fontWeight: '600', color: theme.colors.text, marginTop: 6 },
  sub: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  meta: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: theme.radius.sm },
  rejectBtn: { borderWidth: 1.5, borderColor: theme.colors.danger },
  rejectText: { color: theme.colors.danger, fontWeight: '700', fontSize: 13 },
  approveBtn: { backgroundColor: theme.colors.success },
  approveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, textTransform: 'capitalize' },
  modalSub: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
  modalInput: {
    marginTop: 14, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    padding: 12, fontSize: 13, color: theme.colors.text, height: 80, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
