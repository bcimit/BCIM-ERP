import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { billsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function BillsScreen() {
  const navigation = useNavigation();
  const { selectedProject } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bills-list', selectedProject?.id],
    queryFn: () => billsAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="Bills" subtitle={selectedProject?.name} />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load bills" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="receipt" title="No bills yet" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('BillDetail', { id: item.id })}>
              <Card>
                <View style={styles.rowTop}>
                  <View style={styles.refWrap}>
                    <MaterialCommunityIcons name="receipt" size={16} color={theme.colors.primary} />
                    <Text style={styles.ref}>{item.bill_number || item.reference || `BILL-${item.id}`}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.vendor}>{item.vendor_name || '—'}</Text>
                <Text style={styles.amount}>₹{Number(item.amount || item.total_amount || 0).toLocaleString('en-IN')}</Text>
              </Card>
            </TouchableOpacity>
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
  vendor: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  amount: { fontSize: 15, fontWeight: '800', color: theme.colors.text, marginTop: 4 },
});
