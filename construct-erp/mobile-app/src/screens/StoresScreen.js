import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { storesAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import Card from '../components/Card';
import { theme } from '../theme';

const STORE_LINKS = [
  { label: 'Goods Receipt (GRS)', screen: 'GRS',             icon: 'shield-check-outline',   color: '#0891B2' },
  { label: 'Inward Goods (IGN)',  screen: 'IGN',              icon: 'clipboard-check-outline',color: '#7C3AED' },
  { label: 'Material Request',    screen: 'MaterialRequest',  icon: 'clipboard-list-outline', color: '#EA580C' },
  { label: 'Material Tracker',    screen: 'MaterialTracker',  icon: 'truck-delivery-outline', color: '#059669' },
];

export default function StoresScreen() {
  const navigation = useNavigation();
  const { selectedProject } = useAuth();
  const { data } = useQuery({
    queryKey: ['stores-inventory', selectedProject?.id],
    queryFn: () => storesAPI.list(selectedProject?.id).then(r => r.data?.data ?? r.data ?? []),
    enabled: !!selectedProject?.id,
  });

  const stockCount = (data || []).length;

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Stores</Text>
        <Text style={styles.subtitle}>{selectedProject?.name}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 12 }}>
        <Card style={styles.summaryCard}>
          <MaterialCommunityIcons name="warehouse" size={24} color={theme.colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.summaryValue}>{stockCount}</Text>
            <Text style={styles.summaryLabel}>Stock items on hand</Text>
          </View>
        </Card>

        <Text style={styles.sectionTitle}>Operations</Text>
        {STORE_LINKS.map(item => (
          <TouchableOpacity key={item.label} onPress={() => navigation.navigate(item.screen)}>
            <Card style={styles.linkRow}>
              <View style={[styles.iconWrap, { backgroundColor: `${item.color}1A` }]}>
                <MaterialCommunityIcons name={item.icon} size={20} color={item.color} />
              </View>
              <Text style={styles.linkLabel}>{item.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.muted} />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: theme.spacing.md, paddingTop: theme.spacing.lg },
  title: { fontSize: 20, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  summaryValue: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  summaryLabel: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: theme.colors.text, marginTop: 6 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  linkLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
});
