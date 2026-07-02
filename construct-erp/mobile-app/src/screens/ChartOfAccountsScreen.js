import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { chartOfAccountsAPI } from '../api/client';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

const TYPES = ['all', 'asset', 'liability', 'equity', 'income', 'expense'];

export default function ChartOfAccountsScreen() {
  const [type, setType] = useState('all');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['coa-list', type],
    queryFn: () => chartOfAccountsAPI.list(type !== 'all' ? { account_type: type } : {}).then(r => r.data?.data ?? r.data ?? []),
  });

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="Chart of Accounts" showBack />
      <View style={styles.filters}>
        {TYPES.map(t => (
          <TouchableOpacity key={t} onPress={() => setType(t)} style={[styles.chip, type === t && styles.chipActive]}>
            <Text style={[styles.chipText, type === t && styles.chipTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load chart of accounts" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="book-open-outline" title="No accounts found" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <Card style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.code}>{item.code}</Text>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.type}>{item.account_type}</Text>
              </View>
              <Text style={[styles.balance, Number(item.balance) < 0 && styles.balanceNeg]}>
                ₹{Number(item.balance || 0).toLocaleString('en-IN')}
              </Text>
            </Card>
          )}
        />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: theme.spacing.md, paddingVertical: 10, backgroundColor: theme.colors.card, borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.colors.surface },
  chipActive: { backgroundColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  code: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  type: { fontSize: 11, color: theme.colors.muted, marginTop: 2, textTransform: 'capitalize' },
  balance: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  balanceNeg: { color: theme.colors.danger },
});
