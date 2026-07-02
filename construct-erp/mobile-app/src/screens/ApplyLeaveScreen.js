import React, { useState } from 'react';
import { View, Text, TextInput, ScrollView, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { essAPI } from '../api/client';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Button from '../components/Button';
import { theme } from '../theme';

export default function ApplyLeaveScreen() {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const [leaveTypeId, setLeaveTypeId] = useState(null);
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate]     = useState('');
  const [reason, setReason]     = useState('');

  const { data: balances } = useQuery({
    queryKey: ['ess-leave-balances'],
    queryFn: () => essAPI.leaveBalances().then(r => r.data?.data ?? r.data ?? []),
  });

  const applyMutation = useMutation({
    mutationFn: (payload) => essAPI.applyLeave(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ess-leave-requests'] });
      qc.invalidateQueries({ queryKey: ['ess-leave-balances'] });
      Alert.alert('Submitted', 'Your leave request has been submitted for approval.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (e) => Alert.alert('Failed', e?.response?.data?.error || 'Could not submit leave request'),
  });

  const submit = () => {
    if (!leaveTypeId) return Alert.alert('Select leave type');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fromDate) || !/^\d{4}-\d{2}-\d{2}$/.test(toDate)) {
      return Alert.alert('Invalid dates', 'Use format YYYY-MM-DD for From/To dates.');
    }
    applyMutation.mutate({ leave_type_id: leaveTypeId, from_date: fromDate, to_date: toDate, reason });
  };

  return (
    <Screen>
      <ScreenHeader title="Apply Leave" showBack />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 4 }}>
        <Text style={styles.label}>Leave Type</Text>
        <View style={styles.chipsRow}>
          {(balances || []).map(b => (
            <TouchableOpacity
              key={b.leave_type_id}
              onPress={() => setLeaveTypeId(b.leave_type_id)}
              style={[styles.chip, leaveTypeId === b.leave_type_id && styles.chipActive]}
            >
              <Text style={[styles.chipText, leaveTypeId === b.leave_type_id && styles.chipTextActive]}>
                {b.leave_type_name} ({b.closing_balance})
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>From Date</Text>
        <TextInput value={fromDate} onChangeText={setFromDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.muted} style={styles.input} />

        <Text style={styles.label}>To Date</Text>
        <TextInput value={toDate} onChangeText={setToDate} placeholder="YYYY-MM-DD" placeholderTextColor={theme.colors.muted} style={styles.input} />

        <Text style={styles.label}>Reason</Text>
        <TextInput
          value={reason}
          onChangeText={setReason}
          placeholder="Briefly describe the reason…"
          placeholderTextColor={theme.colors.muted}
          multiline
          numberOfLines={4}
          style={[styles.input, styles.textarea]}
        />

        <Button title="Submit Request" onPress={submit} loading={applyMutation.isPending} style={{ marginTop: 20 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginTop: 16, marginBottom: 6 },
  input: {
    height: 46, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: 14, fontSize: 14, color: theme.colors.text, backgroundColor: theme.colors.card,
  },
  textarea: { height: 90, paddingTop: 12, textAlignVertical: 'top' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border },
  chipActive: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  chipText: { fontSize: 12, fontWeight: '600', color: theme.colors.textSecondary },
  chipTextActive: { color: '#fff' },
});
