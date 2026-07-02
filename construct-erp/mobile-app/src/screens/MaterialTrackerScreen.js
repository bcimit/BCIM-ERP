import React from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { materialTrackerAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function MaterialTrackerScreen() {
  const { selectedProject } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['material-tracker', selectedProject?.id],
    queryFn: () => materialTrackerAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="Material Tracker" subtitle={selectedProject?.name} showBack />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load material tracker" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="truck-delivery-outline" title="No material loads tracked" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.rowTop}>
                <View style={styles.refWrap}>
                  <MaterialCommunityIcons name="truck-delivery-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.ref}>{item.material_name || item.reference || `MT-${item.id}`}</Text>
                </View>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.sub}>Vendor: {item.vendor_name || '—'}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>Ordered: {item.ordered_qty ?? 0}</Text>
                <Text style={styles.metaDot}>•</Text>
                <Text style={styles.meta}>Received: {item.received_qty ?? 0}</Text>
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
  refWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  ref: { fontSize: 13, fontWeight: '700', color: theme.colors.text, flexShrink: 1 },
  sub: { fontSize: 13, color: theme.colors.textSecondary, marginTop: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  meta: { fontSize: 12, color: theme.colors.muted },
  metaDot: { color: theme.colors.muted, fontSize: 12 },
});
