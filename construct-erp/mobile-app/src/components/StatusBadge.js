import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

const STATUS_COLORS = {
  pending:   { bg: '#FEF3C7', fg: '#92400E' },
  approved:  { bg: '#D1FAE5', fg: '#065F46' },
  rejected:  { bg: '#FEE2E2', fg: '#991B1B' },
  completed: { bg: '#D1FAE5', fg: '#065F46' },
  draft:     { bg: '#E2E8F0', fg: '#475569' },
  cancelled: { bg: '#FEE2E2', fg: '#991B1B' },
};

export default function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  const c = STATUS_COLORS[key] || { bg: theme.colors.surface, fg: theme.colors.textSecondary };
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={[styles.text, { color: c.fg }]}>{status || 'Unknown'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999 },
  text: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});
