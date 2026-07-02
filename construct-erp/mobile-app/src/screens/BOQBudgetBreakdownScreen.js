import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { boqBudgetAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

function money(n) {
  const v = Number(n || 0);
  const abs = Math.abs(v);
  if (abs >= 1e7) return `₹${(v / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(v / 1e5).toFixed(1)}L`;
  return `₹${v.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function itemSpent(item) {
  return Object.values(item.breakdown || {}).reduce(
    (s, c) => s + Number(c.advance || 0) + Number(c.invoiced || 0) + Number(c.prorated || 0), 0
  );
}
function itemBudget(item) {
  return Object.values(item.breakdown || {}).reduce((s, c) => s + Number(c.amount || 0), 0);
}

function ItemCostHeadTable({ item }) {
  const rows = Object.entries(item.breakdown || {})
    .map(([head, cell]) => {
      const budget = Number(cell.amount || 0);
      const spent = Number(cell.advance || 0) + Number(cell.invoiced || 0) + Number(cell.prorated || 0);
      const balance = budget - spent;
      const estimated = Number(cell.prorated || 0) > 0 && Number(cell.advance || 0) === 0 && Number(cell.invoiced || 0) === 0;
      return { head, budget, spent, balance, estimated };
    })
    .filter(r => r.budget > 0 || r.spent > 0)
    .sort((a, b) => b.spent - a.spent || b.budget - a.budget);

  if (!rows.length) {
    return <Text style={styles.noBreakdown}>No cost-head budget allocated for this item</Text>;
  }

  return (
    <View style={styles.chTable}>
      <View style={[styles.chRow, styles.chHeaderRow]}>
        <Text style={[styles.chCell, styles.chHead, styles.chHeaderText]}>Cost Head</Text>
        <Text style={[styles.chCell, styles.chNum, styles.chHeaderText]}>Budget</Text>
        <Text style={[styles.chCell, styles.chNum, styles.chHeaderText]}>Spent</Text>
        <Text style={[styles.chCell, styles.chNum, styles.chHeaderText]}>Balance</Text>
      </View>
      {rows.map((r, i) => (
        <View key={r.head} style={[styles.chRow, i !== rows.length - 1 && styles.chRowBorder, r.balance < 0 && styles.chRowOver]}>
          <Text style={[styles.chCell, styles.chHead, styles.chHeadText]} numberOfLines={1}>{r.head}</Text>
          <Text style={[styles.chCell, styles.chNum, styles.chValue]}>{r.budget > 0 ? money(r.budget) : '—'}</Text>
          <Text style={[styles.chCell, styles.chNum, styles.chValue]}>
            {r.spent > 0 ? `${r.estimated ? '≈' : ''}${money(r.spent)}` : '—'}
          </Text>
          <Text style={[styles.chCell, styles.chNum, styles.chValue, r.balance < 0 && styles.chValueOver]}>
            {(r.budget > 0 || r.spent > 0) ? money(r.balance) : '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

function ItemRow({ item, expanded, onToggle }) {
  const isUnlinked = item.id === 'project-level-unlinked';
  const budget = itemBudget(item);
  const spent = itemSpent(item);
  const balance = budget - spent;
  const pct = budget > 0 ? Math.round((spent / budget) * 100) : (spent > 0 ? 100 : 0);
  const over = budget > 0 && spent > budget;

  return (
    <Card style={styles.itemCard}>
      <TouchableOpacity activeOpacity={0.7} onPress={onToggle}>
        <View style={styles.itemTop}>
          <View style={{ flex: 1 }}>
            {!isUnlinked && <Text style={styles.itemNo}>{item.item_no}</Text>}
            <Text style={styles.itemDesc} numberOfLines={expanded ? undefined : 2}>{item.description}</Text>
          </View>
          <MaterialCommunityIcons name={expanded ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
        </View>

        {!isUnlinked && (
          <Text style={styles.itemMeta}>{item.quantity ?? 0} {item.unit || ''} × ₹{Number(item.rate || 0).toLocaleString('en-IN')} = {money(item.amount)}</Text>
        )}

        {(budget > 0 || spent > 0) && (
          <>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${Math.min(100, pct)}%`, backgroundColor: over ? theme.colors.danger : theme.colors.success }]} />
            </View>
            <View style={styles.itemMetaRow}>
              <Text style={styles.itemMetaCol}>Budget: <Text style={styles.itemMetaColStrong}>{money(budget)}</Text></Text>
              <Text style={styles.itemMetaCol}>Spent: <Text style={[styles.itemMetaColStrong, over && { color: theme.colors.danger }]}>{money(spent)}</Text></Text>
              <Text style={styles.itemMetaCol}>Balance: <Text style={[styles.itemMetaColStrong, balance < 0 && { color: theme.colors.danger }]}>{money(balance)}</Text></Text>
            </View>
          </>
        )}
      </TouchableOpacity>

      {expanded && <ItemCostHeadTable item={item} />}
    </Card>
  );
}

export default function BOQBudgetBreakdownScreen() {
  const { selectedProject } = useAuth();
  const [expandedChapters, setExpandedChapters] = useState({});
  const [expandedItem, setExpandedItem] = useState(null);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['boq-budget-breakdown', selectedProject?.id],
    queryFn: () => boqBudgetAPI.list(selectedProject?.id).then(r => r.data ?? {}),
    enabled: !!selectedProject?.id,
  });

  const items = data?.data || [];

  const chapters = useMemo(() => {
    const map = {};
    for (const item of items) {
      const key = item.id === 'project-level-unlinked' ? '__unlinked' : (item.chapter_name || 'Uncategorized');
      if (!map[key]) map[key] = { name: item.id === 'project-level-unlinked' ? 'Unlinked Spend' : key, items: [] };
      map[key].items.push(item);
    }
    return Object.values(map);
  }, [items]);

  const grandTotals = useMemo(() => items.reduce((acc, item) => ({
    budget: acc.budget + itemBudget(item),
    spent: acc.spent + itemSpent(item),
  }), { budget: 0, spent: 0 }), [items]);

  const toggleChapter = (name) => setExpandedChapters(p => ({ ...p, [name]: !p[name] }));

  return (
    <Screen>
      <ScreenHeader title="BOQ Budget Breakdown" subtitle={selectedProject?.name} showBack />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load BOQ budget breakdown" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="ruler-square" title="No BOQ items found" />
      ) : (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}>
          <Card style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Project Totals</Text>
            <View style={styles.summaryRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Total Budget</Text>
                <Text style={styles.summaryValue}>{money(grandTotals.budget)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Total Spent</Text>
                <Text style={[styles.summaryValue, grandTotals.spent > grandTotals.budget && { color: '#FCA5A5' }]}>{money(grandTotals.spent)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.summaryLabel}>Balance</Text>
                <Text style={[styles.summaryValue, (grandTotals.budget - grandTotals.spent) < 0 && { color: '#FCA5A5' }]}>{money(grandTotals.budget - grandTotals.spent)}</Text>
              </View>
            </View>
          </Card>

          {chapters.map((chapter) => {
            const chOpen = !!expandedChapters[chapter.name];
            const chBudget = chapter.items.reduce((s, i) => s + itemBudget(i), 0);
            const chSpent = chapter.items.reduce((s, i) => s + itemSpent(i), 0);
            return (
              <View key={chapter.name}>
                <TouchableOpacity style={styles.chapterHeader} activeOpacity={0.7} onPress={() => toggleChapter(chapter.name)}>
                  <MaterialCommunityIcons name="folder-outline" size={16} color={theme.colors.primary} />
                  <Text style={styles.chapterName} numberOfLines={1}>{chapter.name}</Text>
                  <Text style={styles.chapterCount}>{chapter.items.length}</Text>
                  <Text style={styles.chapterAmt}>{money(chSpent)} / {money(chBudget)}</Text>
                  <MaterialCommunityIcons name={chOpen ? 'chevron-up' : 'chevron-down'} size={18} color={theme.colors.muted} />
                </TouchableOpacity>
                {chOpen && chapter.items.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    expanded={expandedItem === item.id}
                    onToggle={() => setExpandedItem(expandedItem === item.id ? null : item.id)}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryCard: { backgroundColor: theme.colors.dark },
  summaryTitle: { fontSize: 12, fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.4 },
  summaryRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  summaryLabel: { fontSize: 10, color: '#94A3B8', fontWeight: '600' },
  summaryValue: { fontSize: 15, fontWeight: '800', color: '#fff', marginTop: 3 },
  chapterHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: 12, paddingVertical: 10, marginTop: 6,
  },
  chapterName: { flex: 1, fontSize: 13, fontWeight: '700', color: theme.colors.text },
  chapterCount: {
    fontSize: 10, fontWeight: '700', color: theme.colors.muted, backgroundColor: theme.colors.surface,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999,
  },
  chapterAmt: { fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary },
  itemCard: { marginTop: 6, marginLeft: 10 },
  itemTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  itemNo: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  itemDesc: { fontSize: 12, fontWeight: '600', color: theme.colors.text, marginTop: 2 },
  itemMeta: { fontSize: 10, color: theme.colors.muted, marginTop: 4 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: theme.colors.surface, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  itemMetaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  itemMetaCol: { fontSize: 10, color: theme.colors.muted },
  itemMetaColStrong: { fontSize: 10, fontWeight: '700', color: theme.colors.text },
  noBreakdown: { fontSize: 11, color: theme.colors.muted, fontStyle: 'italic', marginTop: 10, textAlign: 'center' },
  chTable: { marginTop: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, overflow: 'hidden' },
  chRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 8 },
  chHeaderRow: { backgroundColor: theme.colors.surface },
  chRowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  chRowOver: { backgroundColor: '#FEF2F2' },
  chCell: { fontSize: 10 },
  chHead: { flex: 1.4 },
  chNum: { flex: 1, textAlign: 'right' },
  chHeaderText: { fontWeight: '700', color: theme.colors.muted, textTransform: 'uppercase', fontSize: 9 },
  chHeadText: { color: theme.colors.text, fontWeight: '600' },
  chValue: { color: theme.colors.text, fontWeight: '600' },
  chValueOver: { color: theme.colors.danger },
});
