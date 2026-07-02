import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import Screen from '../../components/Screen';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import ErrorState from '../../components/ErrorState';
import ListSkeleton from '../../components/ListSkeleton';
import EmptyState from '../../components/EmptyState';
import { theme } from '../../theme';

// Factory for a standard "header fields + optional item table" detail
// screen backed by a single GET /:id endpoint. Covers the many modules
// whose web counterpart is just "show the record + its line items."
//
// config: {
//   title, queryKey, fetcher(id) -> Promise<record>,
//   headerTitle(data) -> string, headerSubtitle(data) -> string,
//   status(data) -> string | null,
//   fields: [{ label, value(data) }],
//   itemsKey: 'items' (optional — key on data holding an array),
//   itemFields: [{ label, value(item) }] (columns rendered per item row),
// }
export default function makeDetailScreen(config) {
  return function GenericDetailScreen({ route }) {
    const { id } = route.params;

    const { data, isLoading, isError, refetch } = useQuery({
      queryKey: [config.queryKey, id],
      queryFn: () => config.fetcher(id).then(r => r.data?.data ?? r.data ?? null),
    });

    if (isError) {
      return (
        <Screen>
          <ScreenHeader title={config.title} showBack />
          <ErrorState message={`Couldn't load ${config.title.toLowerCase()}`} onRetry={refetch} />
        </Screen>
      );
    }

    const items = config.itemsKey && data ? (data[config.itemsKey] || []) : [];

    return (
      <Screen>
        <ScreenHeader
          title={!isLoading && data ? config.headerTitle(data) : config.title}
          subtitle={!isLoading && data ? config.headerSubtitle?.(data) : undefined}
          showBack
          right={!isLoading && data && config.status ? <StatusBadge status={config.status(data)} /> : null}
        />
        {isLoading && <ListSkeleton rows={4} />}
        {!isLoading && data && (
          <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}>
            <Card>
              {config.fields.map((f, i) => (
                <View key={f.label} style={[styles.row, i < config.fields.length - 1 && styles.rowBorder]}>
                  <Text style={styles.label}>{f.label}</Text>
                  <Text style={styles.value} numberOfLines={2}>{f.value(data) ?? '—'}</Text>
                </View>
              ))}
            </Card>

            {config.itemsKey && (
              <>
                <Text style={styles.sectionTitle}>Items ({items.length})</Text>
                {items.length === 0 ? (
                  <EmptyState icon="format-list-bulleted" title="No items" />
                ) : items.map((item, idx) => (
                  <Card key={idx}>
                    {config.itemFields.map((f, i) => (
                      <View key={f.label} style={[styles.row, i < config.itemFields.length - 1 && styles.rowBorder]}>
                        <Text style={styles.label}>{f.label}</Text>
                        <Text style={styles.value} numberOfLines={2}>{f.value(item) ?? '—'}</Text>
                      </View>
                    ))}
                  </Card>
                ))}
              </>
            )}
          </ScrollView>
        )}
      </Screen>
    );
  };
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  label: { fontSize: 12, color: theme.colors.muted, flexShrink: 0 },
  value: { fontSize: 13, fontWeight: '600', color: theme.colors.text, flexShrink: 1, textAlign: 'right' },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
});
