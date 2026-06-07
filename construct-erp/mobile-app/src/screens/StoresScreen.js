import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Card, EmptyState, Label } from '../components/Card';
import { listByProject } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function StoresScreen() {
  const { selectedProject } = useAuth();
  const [stock, setStock] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (selectedProject?.id === 'all') return setStock([]);
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      setStock(await listByProject('/inventory', selectedProject.id));
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load stock records');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [selectedProject?.id]);

  return (
    <Screen
      title="Stores Stock"
      subtitle={selectedProject?.name}
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ marginTop: 10, color: theme.colors.muted, fontWeight: '800' }}>Loading stock...</Text>
        </Card>
      ) : stock.length === 0 ? (
        <EmptyState text="No stock records found for this project." />
      ) : stock.map((row) => (
        <Card key={row.id}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '900' }}>{row.material_name}</Text>
          <Text style={{ color: theme.colors.muted, fontWeight: '700', marginTop: 4 }}>{row.category || 'Material'} · {row.site_location || 'Main store'}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <View><Label>Closing</Label><Text style={{ fontWeight: '900' }}>{row.closing_stock || 0} {row.unit || ''}</Text></View>
            <View><Label>Minimum</Label><Text style={{ fontWeight: '900' }}>{row.minimum_level || row.reorder_level || '-'}</Text></View>
            <View><Label>Rate</Label><Text style={{ fontWeight: '900' }}>{row.unit_rate || '-'}</Text></View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
