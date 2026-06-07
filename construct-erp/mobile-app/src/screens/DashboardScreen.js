import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Card, Label, Value } from '../components/Card';
import { apiRequest } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { currency, theme } from '../theme';

export default function DashboardScreen() {
  const { selectedProject } = useAuth();
  const [data, setData] = useState(null);

  async function load() {
    try {
      const qs = selectedProject?.id === 'all' ? '' : `?project_id=${selectedProject.id}`;
      setData(await apiRequest(`/analytics/executive${qs}`));
    } catch (_) {}
  }

  useEffect(() => { load(); }, [selectedProject?.id]);

  const kpis = data?.kpis || data?.data?.kpis || {};

  return (
    <Screen title="Dashboard" subtitle={selectedProject?.name}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Card style={{ width: '48%' }}><Label>Portfolio</Label><Value>{currency(kpis.portfolio_value || kpis.total_contract_value)}</Value></Card>
        <Card style={{ width: '48%' }}><Label>Billing</Label><Value>{currency(kpis.certified_billing || kpis.total_billed)}</Value></Card>
        <Card style={{ width: '48%' }}><Label>Collections</Label><Value color={theme.colors.success}>{currency(kpis.collections || kpis.total_collected)}</Value></Card>
        <Card style={{ width: '48%' }}><Label>Receivable</Label><Value>{currency(kpis.receivables || kpis.outstanding)}</Value></Card>
      </View>
      <Card>
        <Text style={{ fontWeight: '900', fontSize: 16, color: theme.colors.text }}>Today Focus</Text>
        <Text style={{ marginTop: 8, color: theme.colors.muted, fontWeight: '700' }}>
          Check pending MRS, store stock, Bill Tracker approvals, and asset usage from the tabs below.
        </Text>
      </Card>
    </Screen>
  );
}
