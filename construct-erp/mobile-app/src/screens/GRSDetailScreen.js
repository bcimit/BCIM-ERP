import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { grsAPI } from '../api/client';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import Button from '../components/Button';
import ErrorState from '../components/ErrorState';
import ListSkeleton from '../components/ListSkeleton';
import { theme } from '../theme';

export default function GRSDetailScreen({ route }) {
  const { id } = route.params;
  const qc = useQueryClient();

  const { data: grs, isLoading, isError, refetch } = useQuery({
    queryKey: ['grs-detail', id],
    queryFn: () => grsAPI.detail(id).then(r => r.data?.data ?? null),
  });

  const ackMutation = useMutation({
    mutationFn: () => grsAPI.acknowledge(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grs-detail', id] });
      qc.invalidateQueries({ queryKey: ['grs-list'] });
    },
    onError: (e) => Alert.alert('Failed', e?.response?.data?.error || 'Could not acknowledge'),
  });

  const cancelMutation = useMutation({
    mutationFn: () => grsAPI.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['grs-detail', id] });
      qc.invalidateQueries({ queryKey: ['grs-list'] });
    },
    onError: (e) => Alert.alert('Failed', e?.response?.data?.error || 'Could not cancel'),
  });

  const confirmAck = () => Alert.alert('Acknowledge GRS', 'Confirm materials received in good condition?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Acknowledge', onPress: () => ackMutation.mutate() },
  ]);

  const confirmCancel = () => Alert.alert('Cancel GRS', 'This cannot be undone.', [
    { text: 'No', style: 'cancel' },
    { text: 'Cancel GRS', style: 'destructive', onPress: () => cancelMutation.mutate() },
  ]);

  if (isError) {
    return (
      <Screen>
        <ScreenHeader title="GRS" showBack />
        <ErrorState message="Couldn't load GRS" onRetry={refetch} />
      </Screen>
    );
  }

  const items = grs?.items || [];

  return (
    <Screen>
      <ScreenHeader title={grs?.grs_number || 'GRS'} subtitle={grs?.project_name} showBack right={grs && <StatusBadge status={grs.status} />} />
      {isLoading && <ListSkeleton rows={4} />}
      {!isLoading && grs && (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}>
          <Card>
            <MetaRow label="Vehicle No." value={grs.vehicle_no} />
            <MetaRow label="Date & Time" value={grs.date_time ? dayjs(grs.date_time).format('DD MMM YYYY, HH:mm') : '—'} />
            <MetaRow label="Security In-charge" value={grs.security_incharge} last />
          </Card>

          {(grs.po_number || grs.po_ref_number) && (
            <Card style={styles.poCard}>
              <MaterialCommunityIcons name="file-document-outline" size={16} color={theme.colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.poLabel}>Linked Purchase Order</Text>
                <Text style={styles.poValue}>{grs.po_number || grs.po_ref_number}{grs.vendor_name ? ` — ${grs.vendor_name}` : ''}</Text>
              </View>
            </Card>
          )}

          <Text style={styles.sectionTitle}>Items Received ({items.length})</Text>
          {items.map((it, i) => (
            <Card key={i} style={styles.itemRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{it.particulars}</Text>
                {it.remarks ? <Text style={styles.itemRemarks}>{it.remarks}</Text> : null}
              </View>
              <Text style={styles.itemQty}>{it.quantity ?? '—'} {it.unit || ''}</Text>
            </Card>
          ))}

          {grs.status === 'acknowledged' && (
            <Card style={styles.ackBanner}>
              <Text style={styles.ackTitle}>Acknowledged</Text>
              <Text style={styles.ackSub}>By {grs.acknowledged_by_name}{grs.acknowledged_at ? ` · ${dayjs(grs.acknowledged_at).format('DD MMM YYYY, HH:mm')}` : ''}</Text>
            </Card>
          )}

          {grs.status === 'pending' && (
            <View style={{ gap: 10, marginTop: 8 }}>
              <Button title="Acknowledge — Received in Good Condition" onPress={confirmAck} loading={ackMutation.isPending} />
              <Button title="Cancel GRS" variant="outline" onPress={confirmCancel} loading={cancelMutation.isPending} />
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

function MetaRow({ label, value, last }) {
  return (
    <View style={[styles.metaRow, !last && styles.metaRowBorder]}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  metaRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  metaLabel: { fontSize: 12, color: theme.colors.muted },
  metaValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  poCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' },
  poLabel: { fontSize: 11, color: theme.colors.primary, fontWeight: '700', textTransform: 'uppercase' },
  poValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemName: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  itemRemarks: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  itemQty: { fontSize: 14, fontWeight: '700', color: theme.colors.success },
  ackBanner: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' },
  ackTitle: { fontSize: 12, fontWeight: '800', color: theme.colors.success, textTransform: 'uppercase' },
  ackSub: { fontSize: 12, color: '#065F46', marginTop: 4 },
});
