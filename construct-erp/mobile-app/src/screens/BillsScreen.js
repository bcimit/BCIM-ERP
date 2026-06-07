import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Card, EmptyState, Label } from '../components/Card';
import { apiRequest, listByProject, normalizePayload } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { currency, theme } from '../theme';

export default function BillsScreen() {
  const { selectedProject } = useAuth();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      if (selectedProject?.id === 'all') {
        setBills(normalizePayload(await apiRequest('/tqs/bills')));
      } else {
        setBills(await listByProject('/tqs/bills', selectedProject.id));
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load bills');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [selectedProject?.id]);

  return (
    <Screen
      title="Bill Tracker"
      subtitle={selectedProject?.name}
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ marginTop: 10, color: theme.colors.muted, fontWeight: '800' }}>Loading bills...</Text>
        </Card>
      ) : bills.length === 0 ? (
        <EmptyState text="No bills found." />
      ) : bills.slice(0, 80).map((bill) => (
        <Card key={bill.id}>
          <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '900' }}>{bill.sl_number || bill.bill_number || 'Bill'}</Text>
          <Text style={{ color: theme.colors.text, marginTop: 4, fontWeight: '900' }}>{bill.vendor_name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <View><Label>Invoice</Label><Text style={{ fontWeight: '900' }}>{bill.inv_number || '-'}</Text></View>
            <View><Label>Total</Label><Text style={{ fontWeight: '900' }}>{currency(bill.total_amount)}</Text></View>
            <View><Label>Status</Label><Text style={{ fontWeight: '900' }}>{bill.workflow_status || bill.status || '-'}</Text></View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
