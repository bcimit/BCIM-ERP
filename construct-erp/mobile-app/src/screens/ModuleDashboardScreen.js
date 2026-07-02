import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { projectDashboardAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

// Shared dashboard for P&E / Procurement / QS / Accounts / HR — the backend
// only exposes one general project-KPI endpoint (GET /projects/:id/dashboard:
// BOQ, billing, workers, incidents, low-stock materials), so every module
// dashboard surfaces that same data instead of duplicating five bespoke
// (and unverified) endpoints.
export default function ModuleDashboardScreen({ route }) {
  const title = route?.params?.title || 'Dashboard';
  const { selectedProject } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['module-dashboard', selectedProject?.id],
    queryFn: () => projectDashboardAPI.get(selectedProject.id).then(r => r.data ?? {}),
    enabled: !!selectedProject?.id,
  });

  if (isError) {
    return (
      <Screen>
        <ScreenHeader title={title} subtitle={selectedProject?.name} showBack />
        <ErrorState message="Couldn't load dashboard" onRetry={refetch} />
      </Screen>
    );
  }

  const boq = data?.boq || {};
  const billing = data?.billing || {};
  const workers = data?.workers || {};
  const incidents = data?.incidents || {};
  const lowStock = data?.low_stock_materials || [];

  return (
    <Screen>
      <ScreenHeader title={title} subtitle={selectedProject?.name} showBack />
      {!isLoading && (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}>
          <View style={styles.row}>
            <Card style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>BOQ Items</Text>
              <Text style={styles.kpiValue}>{boq.items ?? '—'}</Text>
              <Text style={styles.kpiSub}>₹{Number(boq.total_value || 0).toLocaleString('en-IN')}</Text>
            </Card>
            <Card style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Billing</Text>
              <Text style={styles.kpiValue}>₹{Number(billing.certified || 0).toLocaleString('en-IN')}</Text>
              <Text style={styles.kpiSub}>Billed: ₹{Number(billing.billed || 0).toLocaleString('en-IN')}</Text>
            </Card>
          </View>
          <View style={styles.row}>
            <Card style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Active Workers</Text>
              <Text style={styles.kpiValue}>{workers.total ?? '—'}</Text>
            </Card>
            <Card style={styles.kpiCard}>
              <Text style={styles.kpiLabel}>Open Incidents</Text>
              <Text style={[styles.kpiValue, Number(incidents.open) > 0 && styles.kpiWarn]}>{incidents.open ?? '—'}</Text>
            </Card>
          </View>

          <Text style={styles.sectionTitle}>Low Stock Materials</Text>
          {lowStock.length === 0 ? (
            <EmptyState icon="check-circle-outline" title="Stock levels healthy" />
          ) : (
            lowStock.map((m, i) => (
              <Card key={i} style={styles.stockRow}>
                <MaterialCommunityIcons name="alert-outline" size={18} color={theme.colors.warning} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.stockName}>{m.material_name}</Text>
                  <Text style={styles.stockSub}>Closing: {m.closing_stock} · Min: {m.minimum_level}</Text>
                </View>
              </Card>
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  kpiCard: { flex: 1 },
  kpiLabel: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  kpiValue: { fontSize: 20, fontWeight: '800', color: theme.colors.text, marginTop: 6 },
  kpiWarn: { color: theme.colors.warning },
  kpiSub: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: 4 },
  stockRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stockName: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  stockSub: { fontSize: 11, color: theme.colors.muted, marginTop: 2 },
});
