import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import { theme } from '../theme';

// There is no GET /vendors/:id endpoint on the backend, so unlike the other
// detail screens this one renders straight from the record the list screen
// already fetched (passed via navigation params) instead of re-fetching.
export default function VendorDetailScreen({ route }) {
  const vendor = route.params?.vendor || {};

  const fields = [
    { label: 'Type', value: vendor.vendor_type },
    { label: 'Contact Person', value: vendor.contact_person },
    { label: 'Phone', value: vendor.phone },
    { label: 'Email', value: vendor.email },
    { label: 'GSTIN', value: vendor.gstin },
    { label: 'PAN', value: vendor.pan },
    { label: 'Address', value: vendor.address },
  ];

  return (
    <Screen>
      <ScreenHeader title={vendor.name || 'Vendor'} subtitle={vendor.vendor_code} showBack />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}>
        <Card>
          {fields.map((f, i) => (
            <View key={f.label} style={[styles.row, i < fields.length - 1 && styles.rowBorder]}>
              <Text style={styles.label}>{f.label}</Text>
              <Text style={styles.value} numberOfLines={2}>{f.value || '—'}</Text>
            </View>
          ))}
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, gap: 12 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: theme.colors.border },
  label: { fontSize: 12, color: theme.colors.muted, flexShrink: 0 },
  value: { fontSize: 13, fontWeight: '600', color: theme.colors.text, flexShrink: 1, textAlign: 'right' },
});
