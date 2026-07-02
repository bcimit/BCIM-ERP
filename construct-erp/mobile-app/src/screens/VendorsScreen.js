import React, { useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { vendorAPI } from '../api/client';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function VendorsScreen() {
  const navigation = useNavigation();
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['vendors-list', search],
    queryFn: () => vendorAPI.list(search ? { search } : {}).then(r => r.data?.data ?? r.data ?? []),
  });

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="Vendors" showBack />
      <View style={styles.searchWrap}>
        <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search vendors…"
          placeholderTextColor={theme.colors.muted}
          style={styles.searchInput}
        />
      </View>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load vendors" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="account-tie-outline" title="No vendors found" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity onPress={() => navigation.navigate('VendorDetail', { vendor: item })}>
              <Card style={styles.row}>
                <View style={styles.iconWrap}>
                  <MaterialCommunityIcons name="account-tie-outline" size={18} color={theme.colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.sub}>{item.vendor_code || ''}{item.vendor_type ? ` · ${item.vendor_type}` : ''}</Text>
                  {item.contact_person ? <Text style={styles.contact}>{item.contact_person}{item.phone ? ` · ${item.phone}` : ''}</Text> : null}
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
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md, marginTop: theme.spacing.md, paddingHorizontal: 12, height: 42,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 14, fontWeight: '700', color: theme.colors.text },
  sub: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  contact: { fontSize: 12, color: theme.colors.textSecondary, marginTop: 4 },
});
