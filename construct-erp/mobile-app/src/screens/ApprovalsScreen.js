import React, { useState, useMemo } from 'react';
import { View, Text, SectionList, TouchableOpacity, TextInput, StyleSheet, Modal, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import { approvalsAPI } from '../api/client';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import Avatar from '../components/Avatar';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const TYPE_META = {
  'SC Bill':           { icon: 'receipt',                    color: '#4F46E5' },
  'Work Order':        { icon: 'briefcase-outline',          color: '#059669' },
  'Measurement Book':  { icon: 'layers-outline',             color: '#0D9488' },
  'NMR Muster Roll':   { icon: 'file-document-outline',      color: '#1D4ED8' },
  'Retention Release': { icon: 'shield-check-outline',       color: '#D97706' },
  'NCR':               { icon: 'alert-outline',              color: '#DC2626' },
  'Submittal':         { icon: 'file-document-outline',      color: '#7C3AED' },
  'Purchase Order':    { icon: 'cart-outline',                color: '#EA580C' },
  'MRS':               { icon: 'package-variant-closed',     color: '#0891B2' },
  'Petty Cash':        { icon: 'bank-outline',               color: '#D97706' },
};
const DEFAULT_META = { icon: 'file-outline', color: theme.colors.primary };

const MRS_STATUS_LABEL = {
  pending: 'Awaiting Store Manager', stores_verified: 'Awaiting Project Manager',
  verified_tower: 'Awaiting Project Manager', approved_pm: 'Awaiting Project Director',
  approved_srpm: 'Awaiting Project Director', approved_mgmt: 'Awaiting MD Approval',
  approved_md: 'Fully Approved', rejected: 'Rejected',
};
const PO_STATUS_LABEL = { pending: 'Awaiting Procurement Approval', verified_audit: 'Awaiting MD Authorization', released_mgmt: 'Awaiting MD Authorization' };
const WO_STATUS_LABEL = { draft: 'Awaiting Procurement Approval', pending: 'Awaiting Procurement Approval', submitted: 'Awaiting MD Authorization', active: 'Awaiting MD Authorization' };

function statusLabel(item) {
  if (item.doc_type === 'MRS') return MRS_STATUS_LABEL[item.status] || item.status;
  if (item.doc_type === 'Purchase Order') return PO_STATUS_LABEL[item.status] || item.status;
  if (item.entity_type === 'work_order') return WO_STATUS_LABEL[item.status] || item.status;
  return (item.status || '').replace(/_/g, ' ');
}
function daysOld(createdAt) {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
}
function daysAgoLabel(createdAt) {
  const d = daysOld(createdAt);
  return d <= 0 ? 'Today' : d === 1 ? '1 day ago' : `${d} days ago`;
}

const TYPE_ORDER = ['MRS', 'Purchase Order', 'Work Order', 'SC Bill', 'Measurement Book', 'NMR Muster Roll', 'Petty Cash', 'Retention Release', 'NCR', 'Submittal'];

export default function ApprovalsScreen() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [collapsed, setCollapsed] = useState({});
  const [modal, setModal] = useState(null);
  const [comments, setComments] = useState('');

  const { data: raw, isLoading, isError, refetch } = useQuery({
    queryKey: ['approvals-pending'],
    queryFn: () => approvalsAPI.pending().then(r => r.data ?? {}),
  });

  const allItems = raw?.data || [];
  const summary = raw?.summary || {};
  const total = raw?.total || 0;

  const toggleSection = (type) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setCollapsed(prev => ({ ...prev, [type]: !prev[type] }));
  };

  const sections = useMemo(() => {
    let items = allItems;
    if (search) {
      const q = search.toLowerCase();
      items = items.filter(i => [i.ref_no, i.party_name, i.project_name, i.doc_type, i.extra_info].some(v => v?.toLowerCase().includes(q)));
    }

    const grouped = {};
    items.forEach(item => {
      const type = item.doc_type || 'Other';
      if (!grouped[type]) grouped[type] = [];
      grouped[type].push(item);
    });

    const orderedTypes = TYPE_ORDER.filter(t => grouped[t]);
    Object.keys(grouped).forEach(t => { if (!orderedTypes.includes(t)) orderedTypes.push(t); });

    return orderedTypes.map(type => {
      const data = grouped[type];
      const urgentCount = data.filter(i => daysOld(i.created_at) >= 3).length;
      data.sort((a, b) => daysOld(b.created_at) - daysOld(a.created_at));
      return { type, data, urgentCount, totalAmount: data.reduce((s, i) => s + (Number(i.amount) || 0), 0) };
    });
  }, [allItems, search]);

  const decide = useMutation({
    mutationFn: ({ entity_type, entity_id, action, comments }) => approvalsAPI.decide(entity_type, entity_id, action, comments),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals-pending'] });
      setModal(null);
      setComments('');
    },
    onError: (e) => Alert.alert('Failed', e?.response?.data?.error || 'Could not process approval'),
  });

  const openModal = (item, action) => { setComments(''); setModal({ item, action }); };
  const submitDecision = () => {
    if (modal.action === 'reject' && !comments.trim()) return Alert.alert('Rejection reason required');
    decide.mutate({ entity_type: modal.item.entity_type, entity_id: modal.item.id, action: modal.action, comments });
  };

  const sectionListData = useMemo(() => {
    return sections.map(s => ({
      type: s.type,
      urgentCount: s.urgentCount,
      totalAmount: s.totalAmount,
      data: collapsed[s.type] ? [] : s.data,
      count: s.data.length,
    }));
  }, [sections, collapsed]);

  return (
    <Screen>
      <ScreenHeader title="My Approvals" subtitle={`${total} item${total !== 1 ? 's' : ''} waiting for your action`} />

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load approvals" onRetry={refetch} />
      ) : total === 0 ? (
        <EmptyState icon="check-circle-outline" title="All caught up" subtitle="No pending approvals right now." />
      ) : (
        <>
          {/* KPI chips row */}
          <View style={styles.chipRow}>
            {sections.map(s => {
              const meta = TYPE_META[s.type] || DEFAULT_META;
              return (
                <View key={s.type} style={[styles.chip, { borderColor: `${meta.color}40` }]}>
                  <MaterialCommunityIcons name={meta.icon} size={13} color={meta.color} />
                  <Text style={[styles.chipText, { color: meta.color }]}>{s.type}</Text>
                  <View style={[styles.chipCount, { backgroundColor: `${meta.color}1A` }]}>
                    <Text style={[styles.chipCountText, { color: meta.color }]}>{s.data.length}</Text>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Search */}
          <View style={styles.searchWrap}>
            <MaterialCommunityIcons name="magnify" size={18} color={theme.colors.muted} />
            <TextInput value={search} onChangeText={setSearch} placeholder="Search ref, party, project…" placeholderTextColor={theme.colors.muted} style={styles.searchInput} />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close-circle" size={18} color={theme.colors.muted} />
              </TouchableOpacity>
            ) : null}
          </View>

          <SectionList
            sections={sectionListData}
            keyExtractor={(item, i) => `${item.entity_type}-${item.id}-${i}`}
            contentContainerStyle={{ paddingBottom: 30 }}
            stickySectionHeadersEnabled={false}
            renderSectionHeader={({ section }) => {
              const meta = TYPE_META[section.type] || DEFAULT_META;
              const isCollapsed = collapsed[section.type];
              return (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => toggleSection(section.type)}
                  style={[styles.sectionHeader, { borderLeftColor: meta.color }]}
                >
                  <View style={[styles.sectionIconWrap, { backgroundColor: `${meta.color}1A` }]}>
                    <MaterialCommunityIcons name={meta.icon} size={18} color={meta.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sectionTitle}>{section.type}</Text>
                    <View style={styles.sectionSubRow}>
                      <Text style={styles.sectionCount}>{section.count} pending</Text>
                      {section.urgentCount > 0 && (
                        <View style={styles.urgentChip}>
                          <MaterialCommunityIcons name="alert" size={10} color={theme.colors.danger} />
                          <Text style={styles.urgentChipText}>{section.urgentCount} urgent</Text>
                        </View>
                      )}
                      {section.totalAmount > 0 && (
                        <Text style={styles.sectionAmount}>₹{Number(section.totalAmount).toLocaleString('en-IN')}</Text>
                      )}
                    </View>
                  </View>
                  <MaterialCommunityIcons
                    name={isCollapsed ? 'chevron-down' : 'chevron-up'}
                    size={22}
                    color={theme.colors.muted}
                  />
                </TouchableOpacity>
              );
            }}
            renderSectionFooter={({ section }) => {
              if (collapsed[section.type]) {
                return (
                  <TouchableOpacity onPress={() => toggleSection(section.type)} style={styles.collapsedFooter}>
                    <Text style={styles.collapsedFooterText}>Tap to expand {section.count} items</Text>
                  </TouchableOpacity>
                );
              }
              return null;
            }}
            renderItem={({ item }) => {
              const meta = TYPE_META[item.doc_type] || DEFAULT_META;
              const urgentItem = daysOld(item.created_at) >= 3;
              return (
                <View style={styles.itemWrap}>
                  <Card style={[styles.itemCard, { borderLeftColor: urgentItem ? theme.colors.danger : meta.color }]}>
                    <View style={styles.rowTop}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.badgeRow}>
                          {urgentItem && (
                            <View style={styles.urgentBadge}>
                              <MaterialCommunityIcons name="alert" size={10} color={theme.colors.danger} />
                              <Text style={styles.urgentBadgeText}>{daysOld(item.created_at)}d overdue</Text>
                            </View>
                          )}
                          <Text style={styles.statusLabel}>{statusLabel(item)}</Text>
                        </View>
                      </View>
                      {!!item.amount && <Text style={styles.amount}>₹{Number(item.amount).toLocaleString('en-IN')}</Text>}
                    </View>

                    <Text style={styles.title}>{item.ref_no || item.party_name || `#${item.id}`}</Text>
                    {item.party_name && item.ref_no ? <Text style={styles.sub}>{item.party_name}</Text> : null}
                    {item.extra_info ? <Text style={styles.sub}>{item.extra_info}</Text> : null}

                    <View style={styles.metaRow}>
                      {item.project_name ? <Text style={styles.meta}>{item.project_name}</Text> : null}
                      {item.submitted_by ? (
                        <View style={styles.submittedByWrap}>
                          <Avatar name={item.submitted_by} size={16} style={styles.submittedByAvatar} />
                          <Text style={styles.meta}>{item.submitted_by}</Text>
                        </View>
                      ) : null}
                      <Text style={styles.meta}>{daysAgoLabel(item.created_at)}</Text>
                    </View>

                    <View style={styles.actions}>
                      <TouchableOpacity style={[styles.actionBtn, styles.rejectBtn]} onPress={() => openModal(item, 'reject')}>
                        <MaterialCommunityIcons name="close" size={16} color={theme.colors.danger} />
                        <Text style={styles.rejectText}>Reject</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.actionBtn, styles.approveBtn]} onPress={() => openModal(item, 'approve')}>
                        <MaterialCommunityIcons name="check" size={16} color="#fff" />
                        <Text style={styles.approveText}>{item.entity_type === 'work_order' ? 'Authorise' : 'Approve'}</Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                </View>
              );
            }}
            ListEmptyComponent={<EmptyState icon="magnify-close" title="No items match your search" />}
          />
        </>
      )}

      <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {modal?.action === 'approve' ? 'Approve' : 'Reject'} {modal?.item.doc_type || 'item'}
            </Text>
            <Text style={styles.modalSub}>{modal?.item.ref_no || modal?.item.party_name}</Text>
            <TextInput
              value={comments}
              onChangeText={setComments}
              placeholder={modal?.action === 'approve' ? 'Add any remarks (optional)…' : 'State the reason for rejection…'}
              placeholderTextColor={theme.colors.muted}
              multiline
              numberOfLines={3}
              style={styles.modalInput}
            />
            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => setModal(null)} style={{ flex: 1 }} />
              <Button
                title={modal?.action === 'approve' ? 'Approve' : 'Reject'}
                onPress={submitDecision}
                loading={decide.isPending}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 6,
    paddingHorizontal: theme.spacing.md, paddingTop: theme.spacing.md, paddingBottom: 4,
  },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 5,
    borderRadius: 999, borderWidth: 1, backgroundColor: theme.colors.card,
  },
  chipText: { fontSize: 11, fontWeight: '700' },
  chipCount: { paddingHorizontal: 5, paddingVertical: 1, borderRadius: 999, minWidth: 18, alignItems: 'center' },
  chipCountText: { fontSize: 10, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md, marginTop: 10, paddingHorizontal: 12, height: 42,
    borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: theme.colors.text },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: theme.spacing.md, marginTop: 16, marginBottom: 6,
    paddingVertical: 12, paddingHorizontal: 14,
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border,
    borderLeftWidth: 4,
  },
  sectionIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '800', color: theme.colors.text },
  sectionSubRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  sectionCount: { fontSize: 11, fontWeight: '600', color: theme.colors.muted },
  sectionAmount: { fontSize: 11, fontWeight: '700', color: theme.colors.primary },
  urgentChip: {
    flexDirection: 'row', alignItems: 'center', gap: 2,
    backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 999,
  },
  urgentChipText: { fontSize: 10, fontWeight: '700', color: theme.colors.danger },
  collapsedFooter: {
    marginHorizontal: theme.spacing.md, marginBottom: 4,
    paddingVertical: 8, alignItems: 'center',
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.sm,
    borderWidth: 1, borderColor: theme.colors.border, borderStyle: 'dashed',
  },
  collapsedFooterText: { fontSize: 12, fontWeight: '600', color: theme.colors.muted },
  itemWrap: { paddingHorizontal: theme.spacing.md, marginBottom: 8 },
  itemCard: { borderLeftWidth: 4 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  urgentBadge: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#FEE2E2', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 999 },
  urgentBadgeText: { fontSize: 10, fontWeight: '800', color: theme.colors.danger },
  statusLabel: { fontSize: 11, color: theme.colors.muted, textTransform: 'capitalize' },
  amount: { fontSize: 13, fontWeight: '800', color: theme.colors.primary },
  title: { fontSize: 14, fontWeight: '700', color: theme.colors.text, marginTop: 8 },
  sub: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  metaRow: { flexDirection: 'row', gap: 10, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' },
  meta: { fontSize: 11, color: theme.colors.muted, fontWeight: '600' },
  submittedByWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  submittedByAvatar: { marginRight: 0 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 38, borderRadius: theme.radius.sm },
  rejectBtn: { borderWidth: 1.5, borderColor: theme.colors.danger },
  rejectText: { color: theme.colors.danger, fontWeight: '700', fontSize: 13 },
  approveBtn: { backgroundColor: theme.colors.success },
  approveText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, textTransform: 'capitalize' },
  modalSub: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
  modalInput: {
    marginTop: 14, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    padding: 12, fontSize: 13, color: theme.colors.text, height: 80, textAlignVertical: 'top',
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
