import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { variationAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function VariationsScreen() {
  const navigation = useNavigation();
  const { selectedProject } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['variations-list', selectedProject?.id],
    queryFn: () => variationAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="Variation Orders" subtitle={selectedProject?.name} showBack />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load variations" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="arrow-left-right" title="No variation orders yet" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('VariationDetail', { id: item.id })}>
              <Card>
                <View style={styles.rowTop}>
                  <View style={styles.refWrap}>
                    <MaterialCommunityIcons name="arrow-left-right" size={16} color={theme.colors.primary} />
                    <Text style={styles.ref}>{item.vo_number || `VO-${item.id}`}</Text>
                  </View>
                  <StatusBadge status={item.status} />
                </View>
                <Text style={styles.title} numberOfLines={2}>{item.title || item.description || '—'}</Text>
                <View style={styles.metaRow}>
                  {item.requested_by_name ? <Text style={styles.meta}>By {item.requested_by_name}</Text> : null}
                  {item.created_at ? <Text style={styles.meta}>{dayjs(item.created_at).format('DD MMM YYYY')}</Text> : null}
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
  title: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 6 },
  meta: { fontSize: 11, color: theme.colors.muted },
});
