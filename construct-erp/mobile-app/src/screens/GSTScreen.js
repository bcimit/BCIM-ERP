import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { invoiceAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import ErrorState from '../components/ErrorState';
import { theme } from '../theme';

export default function GSTScreen() {
  const { selectedProject } = useAuth();
  const { data: summary, isError, refetch } = useQuery({
    queryKey: ['gst-summary', selectedProject?.id],
    queryFn: () => invoiceAPI.gstSummary(selectedProject?.id).then(r => r.data?.data ?? r.data ?? {}),
    enabled: !!selectedProject?.id,
  });

  if (isError) {
    return (
      <Screen>
        <ScreenHeader title="GST" showBack />
        <ErrorState message="Couldn't load GST summary" onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="GST" subtitle={selectedProject?.name} showBack />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}>
        <View style={styles.row}>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Output GST</Text>
            <Text style={styles.kpiValue}>₹{Number(summary?.output_gst || 0).toLocaleString('en-IN')}</Text>
          </Card>
          <Card style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Input Tax Credit</Text>
            <Text style={styles.kpiValue}>₹{Number(summary?.input_tax_credit || 0).toLocaleString('en-IN')}</Text>
          </Card>
        </View>
        <Card style={styles.netCard}>
          <Text style={styles.netLabel}>Net GST Payable</Text>
          <Text style={styles.netValue}>₹{Number(summary?.net_payable || (summary?.output_gst || 0) - (summary?.input_tax_credit || 0)).toLocaleString('en-IN')}</Text>
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  kpiCard: { flex: 1 },
  kpiLabel: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  kpiValue: { fontSize: 18, fontWeight: '800', color: theme.colors.text, marginTop: 6 },
  netCard: { alignItems: 'center', backgroundColor: theme.colors.dark },
  netLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  netValue: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 4 },
});
