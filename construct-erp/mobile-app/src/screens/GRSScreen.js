import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { grsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

const FILTERS = ['all', 'pending', 'acknowledged', 'cancelled'];

export default function GRSScreen() {
  const navigation = useNavigation();
  const { selectedProject } = useAuth();
  const [filter, setFilter] = useState('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['grs-list', selectedProject?.id],
    queryFn: () => grsAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const items = (data || []).filter(g => filter === 'all' || g.status === filter);

  return (
    <Screen>
      <ScreenHeader title="Goods Receipt (Security)" subtitle={selectedProject?.name} showBack />

      <View style={styles.filters}>
        {FILTERS.map(f => (
          <TouchableOpacity key={f} onPress={() => setFilter(f)} style={[styles.filterChip, filter === f && styles.filterChipActive]}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load GRS entries" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="shield-check-outline" title="No GRS entries" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('GRSDetail', { id: item.id })}>
              <Card>
                <View style={styles.rowTop}>
                  <View style={styles.refWrap}>
                    <MaterialCommunityIcons name="shield-check-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.ref}>{item.grs_number}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.date}>{item.date_time ? dayjs(item.date_time).format('DD MMM YYYY, HH:mm') : '—'}</Text>
                <View style={styles.metaRow}>
                  <MaterialCommunityIcons name="truck-outline" size={13} color={theme.colors.muted} />
                  <Text style={styles.meta}>{item.vehicle_no || '—'}</Text>
                  <Text style={styles.metaDot}>•</Text>
                  <Text style={styles.meta}>{item.item_count || 0} items</Text>
                </View>
              </Card>
            </TouchableOpacity>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8, paddingHorizontal: theme.spacing.md, paddingVertical: 10, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  filterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.colors.surface },
  filterChipActive: { backgroundColor: theme.colors.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'capitalize' },
  filterTextActive: { color: '#fff' },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ref: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  date: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 },
  meta: { fontSize: 12, color: theme.colors.muted },
  metaDot: { color: theme.colors.muted, fontSize: 12 },
});
