import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { assetAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function AssetsScreen() {
  const navigation = useNavigation();
  const { selectedProject } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['assets-list', selectedProject?.id],
    queryFn: () => assetAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="Assets" subtitle={selectedProject?.name} />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load assets" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="tools" title="No assets found" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('AssetDetail', { id: item.id })}>
              <Card style={styles.row}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name="tools" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.asset_name || item.name}</Text>
                  <Text style={styles.sub}>{item.asset_code || item.code || ''}</Text>
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
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '600', color: theme.colors.text },
  sub: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
});
