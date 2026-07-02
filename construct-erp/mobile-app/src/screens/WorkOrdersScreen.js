import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { workOrderAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function WorkOrdersScreen() {
  const { selectedProject } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['work-orders-list', selectedProject?.id],
    queryFn: () => workOrderAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="Work Orders" subtitle={selectedProject?.name} showBack />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load work orders" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="hammer-wrench" title="No work orders yet" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.rowTop}>
                <View style={styles.refWrap}>
                  <MaterialCommunityIcons name="hammer-wrench" size={16} color={theme.colors.primary} />
                  <Text style={styles.ref}>{item.wo_number || `WO-${item.id}`}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.sc}>{item.sc_name || '—'}</Text>
              <View style={styles.metaRow}>
                {item.trade_type ? <Text style={styles.meta}>{item.trade_type}</Text> : null}
                {!!item.bill_count && <Text style={styles.meta}>{item.bill_count} bill{item.bill_count !== 1 ? 's' : ''}</Text>}
              </View>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ref: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  sc: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  meta: { fontSize: 12, color: theme.colors.muted, fontWeight: '600' },
});
