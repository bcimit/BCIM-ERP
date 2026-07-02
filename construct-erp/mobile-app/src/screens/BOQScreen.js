import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { boqAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function BOQScreen() {
  const { selectedProject } = useAuth();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['boq-list', selectedProject?.id],
    queryFn: () => boqAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const items = (data || []).filter(i => !search || i.description?.toLowerCase().includes(search.toLowerCase()) || i.item_no?.toLowerCase().includes(search.toLowerCase()));

  return (
    <Screen>
      <ScreenHeader title="BOQ & Estimation" subtitle={selectedProject?.name} showBack />
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search BOQ items…"
          placeholderTextColor={theme.colors.muted}
          style={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load BOQ" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="ruler-square" title="No BOQ items found" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => {
            const pct = item.quantity ? Math.min(100, Math.round((Number(item.executed_qty || 0) / Number(item.quantity)) * 100)) : 0;
            return (
              <Card>
                <View style={styles.rowTop}>
                  <Text style={styles.itemNo}>{item.item_no}</Text>
                  <Text style={styles.amount}>₹{Number(item.amount || 0).toLocaleString('en-IN')}</Text>
                </View>
                <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>{item.executed_qty ?? 0} / {item.quantity ?? 0} {item.unit || ''}</Text>
                  <Text style={styles.pct}>{pct}% done</Text>
                </View>
                <View style={styles.progressTrack}>
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>
              </Card>
            );
          }}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, paddingHorizontal: 12, height: 42,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemNo: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  amount: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  desc: { fontSize: 13, color: theme.colors.text, marginTop: 6, fontWeight: '500' },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  meta: { fontSize: 11, color: theme.colors.muted },
  pct: { fontSize: 11, fontWeight: '700', color: theme.colors.success },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: theme.colors.surface, marginTop: 6, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3, backgroundColor: theme.colors.success },
});
