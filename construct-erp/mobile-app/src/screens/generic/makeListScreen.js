import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import Screen from '../../components/Screen';
import ScreenHeader from '../../components/ScreenHeader';
import Card from '../../components/Card';
import StatusBadge from '../../components/StatusBadge';
import ListSkeleton from '../../components/ListSkeleton';
import ErrorState from '../../components/ErrorState';
import EmptyState from '../../components/EmptyState';
import { theme } from '../../theme';

// Factory for a standard "title / subtitle / status" list screen backed by a
// single GET endpoint. Covers the many modules whose mobile screen is just
// "browse records for the current project" — avoids near-duplicate files.
//
// config: {
//   title, icon, emptyText,
//   queryKey, fetcher(projectId) -> Promise<array>,
//   projectScoped: bool (default true),
//   primary(item) -> string, secondary(item) -> string,
//   meta(item) -> string | null,
//   status(item) -> string | null,
//   detailScreen: string (optional — route name to push with { id: item.id } on tap),
// }
export default function makeListScreen(config) {
  return function GenericListScreen() {
    const navigation = useNavigation();
    const { selectedProject } = useAuth();
    const projectId = config.projectScoped === false ? undefined : selectedProject?.id;

    const { data, isLoading, isError, refetch } = useQuery({
      queryKey: [config.queryKey, projectId],
      queryFn: () => config.fetcher(projectId).then(r => r.data?.data ?? r.data ?? []),
      enabled: config.projectScoped === false ? true : !!projectId,
    });

    const items = data || [];

    return (
      <Screen>
        <ScreenHeader title={config.title} subtitle={config.projectScoped === false ? undefined : selectedProject?.name} showBack />
        {isLoading ? (
          <ListSkeleton />
        ) : isError ? (
          <ErrorState message={`Couldn't load ${config.title.toLowerCase()}`} onRetry={refetch} />
        ) : items.length === 0 ? (
          <EmptyState icon={config.icon} title={config.emptyText || `No ${config.title.toLowerCase()} yet`} />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item, i) => String(item.id ?? i)}
            contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
            renderItem={({ item }) => {
              const status = config.status ? config.status(item) : null;
              const meta = config.meta ? config.meta(item) : null;
              const cardBody = (
                <Card>
                  <View style={styles.rowTop}>
                    <View style={styles.refWrap}>
                      <MaterialCommunityIcons name={config.icon} size={16} color={theme.colors.primary} />
                      <Text style={styles.primary} numberOfLines={1}>{config.primary(item)}</Text>
                    </View>
                    {status ? <StatusBadge status={status} /> : null}
                  </View>
                  {config.secondary ? <Text style={styles.secondary} numberOfLines={2}>{config.secondary(item)}</Text> : null}
                  {meta ? <Text style={styles.meta}>{meta}</Text> : null}
                </Card>
              );
              return config.detailScreen ? (
                <TouchableOpacity onPress={() => navigation.navigate(config.detailScreen, { id: item.id })}>
                  {cardBody}
                </TouchableOpacity>
              ) : cardBody;
            }}
          />
        )}
      </Screen>
    );
  };
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  refWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  primary: { fontSize: 13, fontWeight: '700', color: theme.colors.text, flexShrink: 1 },
  secondary: { fontSize: 13, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  meta: { fontSize: 12, color: theme.colors.muted, marginTop: 6 },
});
