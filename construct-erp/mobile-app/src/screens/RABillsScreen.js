import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { raBillAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function RABillsScreen() {
  const navigation = useNavigation();
  const { selectedProject } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['ra-bills-list', selectedProject?.id],
    queryFn: () => raBillAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="RA Bills" subtitle={selectedProject?.name} showBack />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load RA bills" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="receipt" title="No RA bills yet" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('RABillDetail', { id: item.id })}>
              <Card>
                <View style={styles.rowTop}>
                  <View style={styles.refWrap}>
                    <MaterialCommunityIcons name="receipt" size={16} color={theme.colors.primary} />
                    <Text style={styles.ref}>RA Bill #{item.bill_number || item.id}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.date}>{item.bill_date ? dayjs(item.bill_date).format('DD MMM YYYY') : '—'}</Text>
                <View style={styles.metaRow}>
                  {!!item.gross_amount && <Text style={styles.amount}>₹{Number(item.gross_amount).toLocaleString('en-IN')}</Text>}
                  {item.certified_by_name ? <Text style={styles.meta}>Certified by {item.certified_by_name}</Text> : null}
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
  date: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  amount: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  meta: { fontSize: 11, color: theme.colors.muted },
});
