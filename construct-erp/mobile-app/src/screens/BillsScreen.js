import React, { useState } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { billsAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

dayjs.extend(relativeTime);

// ─── workflow stages ──────────────────────────────────────────────────────────
const STAGES = [
  { key: 'pending',             label: 'Pending',     short: 'Pend',  color: '#6366f1' },
  { key: 'document_controller', label: 'Doc Control', short: 'DC',    color: '#f59e0b' },
  { key: 'stores',              label: 'Stores',      short: 'Stores',color: '#06b6d4' },
  { key: 'pm',                  label: 'PM',          short: 'PM',    color: '#8b5cf6' },
  { key: 'qs',                  label: 'QS',          short: 'QS',    color: '#3b82f6' },
  { key: 'accounts',            label: 'Accounts',    short: 'Accts', color: '#ec4899' },
  { key: 'paid',                label: 'Paid',        short: 'Paid',  color: '#10b981' },
];

const STATUS_COLOR = {
  pending:             { bg: '#ede9fe', text: '#5b21b6' },
  document_controller: { bg: '#fef3c7', text: '#92400e' },
  stores:              { bg: '#cffafe', text: '#155e75' },
  pm:                  { bg: '#ede9fe', text: '#4c1d95' },
  qs:                  { bg: '#dbeafe', text: '#1e40af' },
  accounts:            { bg: '#fce7f3', text: '#9d174d' },
  paid:                { bg: '#d1fae5', text: '#065f46' },
};

function money(n) {
  const v = Number(n || 0);
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (v >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${v.toLocaleString('en-IN')}`;
}

// ─── KPI card ────────────────────────────────────────────────────────────────
function KpiCard({ label, value, sub, color, icon }) {
  return (
    <View style={[styles.kpiCard, { backgroundColor: color }]}>
      <View style={styles.kpiTop}>
        <View>
          <Text style={styles.kpiLabel}>{label}</Text>
          <Text style={styles.kpiValue}>{value ?? '—'}</Text>
          {sub ? <Text style={styles.kpiSub}>{sub}</Text> : null}
        </View>
        <MaterialCommunityIcons name={icon} size={28} color="rgba(255,255,255,0.35)" />
      </View>
    </View>
  );
}

// ─── stage bubble ─────────────────────────────────────────────────────────────
function StageBubble({ num, label, count, color, active }) {
  return (
    <View style={styles.stageBubbleWrap}>
      <View style={[styles.stageBubble, { backgroundColor: active ? color : '#e2e8f0' }]}>
        <Text style={[styles.stageBubbleCount, { color: active ? '#fff' : '#94a3b8' }]}>
          {count}
        </Text>
      </View>
      <Text style={[styles.stageLabel, active && { color, fontWeight: '700' }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

// ─── main screen ─────────────────────────────────────────────────────────────
export default function BillsScreen() {
  const navigation = useNavigation();
  const { selectedProject } = useAuth();
  const [filter, setFilter] = useState('all');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['bills-list', selectedProject?.id],
    queryFn: () => billsAPI.list(selectedProject?.id).then(r =>
      Array.isArray(r.data) ? r.data : (r.data?.data ?? [])
    ),
    staleTime: 60_000,
  });

  const bills = data ?? [];
  const now = dayjs();

  // KPI counts
  const open        = bills.filter(b => b.workflow_status !== 'paid');
  const inApproval  = bills.filter(b => ['pending','document_controller','stores','pm'].includes(b.workflow_status));
  const atQS        = bills.filter(b => b.workflow_status === 'qs');
  const atAccounts  = bills.filter(b => b.workflow_status === 'accounts');
  const paidMonth   = bills.filter(b => b.workflow_status === 'paid' && dayjs(b.updated_at).isSame(now, 'month'));
  const totalAmt    = bills.reduce((s, b) => s + parseFloat(b.total_amount || 0), 0);

  // stage counts for pipeline
  const stageCounts = Object.fromEntries(
    STAGES.map(s => [s.key, bills.filter(b => b.workflow_status === s.key).length])
  );

  // filtered list
  const filtered = filter === 'all' ? bills
    : bills.filter(b => b.workflow_status === filter);

  const FILTERS = [
    { key: 'all',      label: 'All' },
    { key: 'pending',  label: 'Pending' },
    { key: 'qs',       label: 'QS' },
    { key: 'accounts', label: 'Accounts' },
    { key: 'paid',     label: 'Paid' },
  ];

  return (
    <Screen>
      {/* ── header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Bill Tracker</Text>
          <Text style={styles.headerSub}>
            {selectedProject?.name ?? 'All Projects'} · Invoice & payment pipeline
          </Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('BillDetail', { id: null })}>
          <MaterialCommunityIcons name="plus" size={16} color="#fff" />
          <Text style={styles.headerBtnText}>New Bill</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={theme.colors.primary} />
      ) : isError ? (
        <ErrorState message="Couldn't load bills" onRetry={refetch} />
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* ── KPI cards ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.kpiRow}>
            <KpiCard label="OPEN BILLS"     value={open.length}       sub={`${bills.length} total`}       color="#6366f1" icon="receipt-clock" />
            <KpiCard label="IN APPROVAL"    value={inApproval.length} sub="Pending sign-off"              color="#f59e0b" icon="clock-outline" />
            <KpiCard label="AT QS"          value={atQS.length}       sub="Awaiting certification"        color="#3b82f6" icon="file-check-outline" />
            <KpiCard label="AT ACCOUNTS"    value={atAccounts.length} sub="Awaiting payment"              color="#ec4899" icon="bank-outline" />
            <KpiCard label="PAID THIS MONTH" value={paidMonth.length} sub={money(paidMonth.reduce((s,b)=>s+parseFloat(b.paid_amount||b.total_amount||0),0))} color="#10b981" icon="check-circle-outline" />
            <KpiCard label="TOTAL VALUE"    value={money(totalAmt)}   sub={`${bills.length} bills`}       color="#0ea5e9" icon="currency-inr" />
          </ScrollView>

          {/* ── pipeline ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="timeline-check-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>Bill Pipeline</Text>
              <Text style={styles.sectionSub}>{bills.length} TOTAL BILLS</Text>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pipelineRow}>
              {STAGES.map((s, i) => (
                <React.Fragment key={s.key}>
                  <StageBubble
                    num={i + 1}
                    label={s.short}
                    count={stageCounts[s.key]}
                    color={s.color}
                    active={stageCounts[s.key] > 0}
                  />
                  {i < STAGES.length - 1 && (
                    <View style={styles.pipelineConnector} />
                  )}
                </React.Fragment>
              ))}
            </ScrollView>

            <View style={styles.pipelineSummary}>
              <View style={styles.pipelineSummaryBox}>
                <Text style={styles.pipelineSummaryValue}>{inApproval.length}</Text>
                <Text style={[styles.pipelineSummaryLabel, { color: '#f59e0b' }]}>In Approval</Text>
              </View>
              <View style={[styles.pipelineSummaryBox, styles.pipelineSummaryMid]}>
                <Text style={[styles.pipelineSummaryValue, { color: '#3b82f6' }]}>{atQS.length + atAccounts.length}</Text>
                <Text style={[styles.pipelineSummaryLabel, { color: '#3b82f6' }]}>Under Review</Text>
              </View>
              <View style={styles.pipelineSummaryBox}>
                <Text style={[styles.pipelineSummaryValue, { color: '#10b981' }]}>{stageCounts['paid']}</Text>
                <Text style={[styles.pipelineSummaryLabel, { color: '#10b981' }]}>Paid</Text>
              </View>
            </View>
          </View>

          {/* ── filter chips ── */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {FILTERS.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
                onPress={() => setFilter(f.key)}
              >
                <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>
                  {f.label}
                  {f.key !== 'all' && ` (${stageCounts[f.key] ?? 0})`}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* ── recent bills table ── */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <MaterialCommunityIcons name="receipt-text-outline" size={16} color={theme.colors.primary} />
              <Text style={styles.sectionTitle}>
                {filter === 'all' ? 'Recent Bills' : `${STAGES.find(s=>s.key===filter)?.label ?? filter} Bills`}
              </Text>
              <Text style={styles.sectionSub}>{filtered.length} BILLS</Text>
            </View>

            {/* table header */}
            <View style={styles.tableHead}>
              <Text style={[styles.thCell, { flex: 2 }]}>BILL NO.</Text>
              <Text style={[styles.thCell, { flex: 2 }]}>VENDOR</Text>
              <Text style={[styles.thCell, { flex: 1.5, textAlign: 'center' }]}>STATUS</Text>
              <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>AMOUNT</Text>
              <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>DATE</Text>
            </View>

            {filtered.length === 0 ? (
              <EmptyState icon="receipt" title="No bills" />
            ) : (
              filtered.slice().reverse().map((item, i) => {
                const sc = STATUS_COLOR[item.workflow_status] || { bg: '#f1f5f9', text: '#475569' };
                const label = STAGES.find(s => s.key === item.workflow_status)?.label ?? item.workflow_status ?? '—';
                return (
                  <TouchableOpacity
                    key={item.id ?? i}
                    style={[styles.tableRow, i % 2 === 1 && styles.tableRowAlt]}
                    onPress={() => navigation.navigate('BillDetail', { id: item.id })}
                  >
                    <Text style={[styles.tdBillNo, { flex: 2 }]} numberOfLines={1}>
                      {item.bill_number || item.inv_number || `BILL-${item.id}`}
                    </Text>
                    <Text style={[styles.tdVendor, { flex: 2 }]} numberOfLines={1}>
                      {item.vendor_name || '—'}
                    </Text>
                    <View style={{ flex: 1.5, alignItems: 'center' }}>
                      <View style={[styles.badge, { backgroundColor: sc.bg }]}>
                        <Text style={[styles.badgeText, { color: sc.text }]} numberOfLines={1}>{label}</Text>
                      </View>
                    </View>
                    <Text style={[styles.tdAmt, { flex: 1.2 }]}>
                      {money(item.total_amount || item.amount)}
                    </Text>
                    <Text style={[styles.tdDate, { flex: 1 }]}>
                      {item.inv_date ? dayjs(item.inv_date).fromNow(true) : '—'}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>

        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  // header
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12,
    backgroundColor: theme.colors.background,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  headerSub:   { fontSize: 12, color: theme.colors.textSecondary, marginTop: 2 },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: theme.colors.primary, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  headerBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  content: { paddingBottom: 40 },

  // kpi
  kpiRow: { gap: 10, paddingHorizontal: 16, paddingBottom: 4, paddingTop: 4 },
  kpiCard: {
    width: 150, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  kpiTop:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  kpiLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 },
  kpiValue: { fontSize: 26, fontWeight: '900', color: '#fff' },
  kpiSub:   { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 3 },

  // pipeline
  section: {
    marginHorizontal: 16, marginTop: 14,
    backgroundColor: theme.colors.card, borderRadius: 14, padding: 14,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 14 },
  sectionTitle:  { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.text },
  sectionSub:    { fontSize: 10, color: theme.colors.textSecondary, fontWeight: '600' },

  pipelineRow: { gap: 0, paddingBottom: 6 },
  stageBubbleWrap: { alignItems: 'center', width: 52 },
  stageBubble: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  stageBubbleCount: { fontSize: 15, fontWeight: '800' },
  stageLabel: { fontSize: 9, color: '#94a3b8', marginTop: 4, textAlign: 'center', fontWeight: '600' },
  pipelineConnector: {
    width: 16, height: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 18,
  },

  pipelineSummary: {
    flexDirection: 'row', marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 10,
  },
  pipelineSummaryBox: { flex: 1, alignItems: 'center' },
  pipelineSummaryMid: { borderLeftWidth: 1, borderRightWidth: 1, borderColor: theme.colors.border },
  pipelineSummaryValue: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  pipelineSummaryLabel: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // filters
  filterRow: { gap: 8, paddingHorizontal: 16, paddingTop: 14, paddingBottom: 2 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
  },
  filterChipActive: {
    backgroundColor: theme.colors.primary, borderColor: theme.colors.primary,
  },
  filterChipText:       { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  filterChipTextActive: { color: '#fff' },

  // table
  tableHead: {
    flexDirection: 'row', paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
    marginBottom: 2,
  },
  thCell: { fontSize: 9, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.4 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  tdBillNo: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  tdVendor: { fontSize: 11, color: theme.colors.text, fontWeight: '500' },
  tdAmt:    { fontSize: 11, fontWeight: '700', color: theme.colors.text, textAlign: 'right' },
  tdDate:   { fontSize: 10, color: theme.colors.textSecondary, textAlign: 'right' },
  badge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20 },
  badgeText: { fontSize: 9, fontWeight: '700' },
});
