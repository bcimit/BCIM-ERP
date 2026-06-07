import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Card, EmptyState, Label } from '../components/Card';
import { listByProject } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function MaterialRequestScreen() {
  const { selectedProject } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    if (selectedProject?.id === 'all') return setItems([]);
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      setItems(await listByProject('/stores/mrs', selectedProject.id));
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load material requests');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [selectedProject?.id]);

  return (
    <Screen
      title="Material Requests"
      subtitle={selectedProject?.name}
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ marginTop: 10, color: theme.colors.muted, fontWeight: '800' }}>Loading MRS...</Text>
        </Card>
      ) : items.length === 0 ? (
        <EmptyState text="No MRS found for this project." />
      ) : items.map((mr) => (
        <Card key={mr.id}>
          <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '900' }}>
            {mr.mrs_number || mr.serial_no_formatted || 'MRS'}
          </Text>
          <View style={{ flexDirection: 'row', marginTop: 10, gap: 18 }}>
            <View><Label>Status</Label><Text style={{ fontWeight: '900' }}>{mr.status || 'Pending'}</Text></View>
            <View><Label>Priority</Label><Text style={{ fontWeight: '900' }}>{mr.priority || '-'}</Text></View>
            <View><Label>Items</Label><Text style={{ fontWeight: '900' }}>{mr.item_count || mr.items?.length || 0}</Text></View>
          </View>
          {!!mr.remarks && <Text style={{ marginTop: 10, color: theme.colors.muted, fontWeight: '700' }}>{mr.remarks}</Text>}
        </Card>
      ))}
    </Screen>
  );
}
