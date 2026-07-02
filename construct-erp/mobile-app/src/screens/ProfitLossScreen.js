import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { reportsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function ProfitLossScreen() {
  const { selectedProject } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['project-pl', selectedProject?.id],
    queryFn: () => reportsAPI.projectPL(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const rows = data || [];
  const p = rows[0]; // scoped to selectedProject, so a single row is expected

  return (
    <Screen>
      <ScreenHeader title="Profit & Loss" subtitle={selectedProject?.name} showBack />
      {isError ? (
        <ErrorState message="Couldn't load P&L" onRetry={refetch} />
      ) : !isLoading && !p ? (
        <EmptyState icon="chart-line" title="No P&L data for this project" />
      ) : !isLoading && p ? (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}>
          <Card style={styles.marginCard}>
            <Text style={styles.marginLabel}>Gross Margin</Text>
            <Text style={styles.marginValue}>₹{Number(p.gross_margin || 0).toLocaleString('en-IN')}</Text>
          </Card>

          <Text style={styles.sectionTitle}>Revenue</Text>
          <Card>
            <Row label="Gross Billed" value={p.gross_billed} />
            <Row label="Net Billed" value={p.net_billed} />
            <Row label="Received from Client" value={p.received_from_client} last />
          </Card>

          <Text style={styles.sectionTitle}>Cost</Text>
          <Card>
            <Row label="Vendor Certified" value={p.vendor_certified} negative />
            <Row label="Vendor Paid" value={p.vendor_paid} negative />
            <Row label="Vendor Outstanding" value={p.vendor_outstanding} negative />
            <Row label="Other Cost" value={p.other_cost} negative last />
          </Card>

          <Text style={styles.sectionTitle}>Holds</Text>
          <Card>
            <Row label="TDS Held" value={p.tds_held} />
            <Row label="Retention Held" value={p.retention_held} last />
          </Card>
        </ScrollView>
      ) : null}
    </Screen>
  );
}

function Row({ label, value, negative, last }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, negative && styles.rowValueNeg]}>
        {negative ? '-' : ''}₹{Number(value || 0).toLocaleString('en-IN')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  marginCard: { alignItems: 'center', backgroundColor: theme.colors.dark },
  marginLabel: { fontSize: 12, color: '#94A3B8', fontWeight: '600' },
  marginValue: { fontSize: 26, fontWeight: '800', color: '#fff', marginTop: 4 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  rowLabel: { fontSize: 13, color: theme.colors.textSecondary },
  rowValue: { fontSize: 13, fontWeight: '700', color: theme.colors.text },
  rowValueNeg: { color: theme.colors.danger },
});
