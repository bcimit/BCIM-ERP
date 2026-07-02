import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { hrServiceRequestAPI } from '../api/client';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Button from '../components/Button';
import StatusBadge from '../components/StatusBadge';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import FAB from '../components/FAB';
import { theme } from '../theme';

const TYPES = [
  { key: 'certificate', label: 'Certificate / Letter' },
  { key: 'payroll', label: 'Payroll Query' },
  { key: 'attendance', label: 'Attendance Issue' },
  { key: 'leave', label: 'Leave Query' },
  { key: 'documents', label: 'Document Correction' },
  { key: 'general', label: 'General' },
];
const PRIORITIES = ['low', 'normal', 'high', 'urgent'];

export default function HRRequestsScreen() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [requestType, setRequestType] = useState('certificate');
  const [priority, setPriority] = useState('normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['hr-service-requests'],
    queryFn: () => hrServiceRequestAPI.list().then(r => r.data?.data ?? r.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: (payload) => hrServiceRequestAPI.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['hr-service-requests'] });
      setModalOpen(false);
      setSubject('');
      setDescription('');
      Alert.alert('Submitted', 'Your HR request has been created.');
    },
    onError: (e) => Alert.alert('Failed', e?.response?.data?.error || 'Could not create request'),
  });

  const submit = () => {
    if (!subject.trim()) return Alert.alert('Subject is required');
    createMutation.mutate({ request_type: requestType, priority, subject, description });
  };

  const items = data || [];

  return (
    <Screen>
      <ScreenHeader title="HR Requests" showBack />
      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load HR requests" onRetry={refetch} />
      ) : items.length === 0 ? (
        <EmptyState icon="account-question-outline" title="No HR requests yet" subtitle="Certificates, payroll queries, and more." />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, i) => String(item.id ?? i)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10, paddingBottom: 90 }}
          renderItem={({ item }) => (
            <Card>
              <View style={styles.rowTop}>
                <Text style={styles.ref}>{item.request_no || `REQ-${item.id}`}</Text>
                <StatusBadge status={item.status} />
              </View>
              <Text style={styles.subject}>{item.subject}</Text>
              <View style={styles.metaRow}>
                <Text style={styles.meta}>{item.request_type}</Text>
                <Text style={styles.meta}>Priority: {item.priority}</Text>
              </View>
            </Card>
          )}
        />
      )}
      <FAB onPress={() => setModalOpen(true)} />

      <Modal visible={modalOpen} transparent animationType="slide" onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Raise HR Request</Text>

            <Text style={styles.label}>Request Type</Text>
            <View style={styles.chipsRow}>
              {TYPES.map(t => (
                <TouchableOpacity key={t.key} onPress={() => setRequestType(t.key)} style={[styles.chip, requestType === t.key && styles.chipActive]}>
                  <Text style={[styles.chipText, requestType === t.key && styles.chipTextActive]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Priority</Text>
            <View style={styles.chipsRow}>
              {PRIORITIES.map(p => (
                <TouchableOpacity key={p} onPress={() => setPriority(p)} style={[styles.chip, priority === p && styles.chipActive]}>
                  <Text style={[styles.chipText, priority === p && styles.chipTextActive]}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Subject *</Text>
            <TextInput value={subject} onChangeText={setSubject} placeholder="Brief subject" placeholderTextColor={theme.colors.muted} style={styles.input} />

            <Text style={styles.label}>Description</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Details…"
              placeholderTextColor={theme.colors.muted}
              multiline
              numberOfLines={3}
              style={[styles.input, styles.textarea, { marginBottom: 0 }]}
            />

            <View style={styles.modalActions}>
              <Button title="Cancel" variant="outline" onPress={() => setModalOpen(false)} style={{ flex: 1 }} />
              <Button title="Submit" onPress={submit} loading={createMutation.isPending} style={{ flex: 1 }} />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  ref: { fontSize: 12, fontWeight: '700', color: theme.colors.primary },
  subject: { fontSize: 14, fontWeight: '600', color: theme.colors.text, marginTop: 8 },
  metaRow: { flexDirection: 'row', gap: 12, marginTop: 6 },
  meta: { fontSize: 11, color: theme.colors.muted, textTransform: 'capitalize' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '85%' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 8 },
  input: {
    height: 44, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: 12, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.surface, marginBottom: 6,
  },
  textarea: { height: 80, paddingTop: 10, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 11, fontWeight: '600', color: theme.colors.textSecondary, textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
});
