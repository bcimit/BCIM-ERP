import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { poAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function PurchaseOrdersScreen() {
  const navigation = useNavigation();
  const { selectedProject } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['po-list', selectedProject?.id],
    queryFn: () => poAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="Purchase Orders" subtitle={selectedProject?.name} showBack />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load purchase orders" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="cart-outline" title="No purchase orders yet" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('PODetail', { id: item.id })}>
              <Card>
                <View style={styles.rowTop}>
                  <View style={styles.refWrap}>
                    <MaterialCommunityIcons name="cart-outline" size={16} color={theme.colors.primary} />
                    <Text style={styles.ref}>{item.po_number || item.serial_no_formatted || `PO-${item.id}`}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.vendor}>{item.vendor_name || '—'}</Text>
                <View style={styles.metaRow}>
                  <Text style={styles.meta}>Items: {item.items_received ?? 0}/{item.items_total ?? 0} received</Text>
                  {!!item.total_amount && <Text style={styles.amount}>₹{Number(item.total_amount).toLocaleString('en-IN')}</Text>}
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
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ref: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  vendor: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  meta: { fontSize: 12, color: theme.colors.muted },
  amount: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
});
