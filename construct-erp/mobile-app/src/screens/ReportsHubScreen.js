import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import { theme } from '../theme';

// The web app's report hubs (Planning/Procurement/Stores/QS Reports, Reports
// Hub) each render dashboards backed by ~10 distinct chart endpoints per hub
// (report.routes.js) that aren't yet verified field-by-field. Rather than
// guess at chart data shapes, this hub links out to the data mobile already
// has real screens for, plus P&L, so nothing here is a dead end.
const REPORT_LINKS = [
  { label: 'Profit & Loss',      screen: 'ProfitLoss',    icon: 'chart-line' },
  { label: 'BOQ & Estimation',   screen: 'BOQ',            icon: 'ruler-square' },
  { label: 'RA Bills',           screen: 'RABills',        icon: 'receipt' },
  { label: 'Purchase Orders',    screen: 'PurchaseOrders', icon: 'cart-outline' },
  { label: 'Vendor Payments',    screen: 'VendorPayments', icon: 'wallet-outline' },
  { label: 'Invoices',           screen: 'Invoices',       icon: 'file-document-outline' },
  { label: 'Chart of Accounts',  screen: 'ChartOfAccounts',icon: 'book-open-outline' },
  { label: 'GST',                screen: 'GST',            icon: 'receipt-text-outline' },
];

export default function ReportsHubScreen({ route }) {
  const navigation = useNavigation();
  const title = route?.params?.title || 'Reports';

  return (
    <Screen>
      <ScreenHeader title={title} showBack />
      <ScrollView contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}>
        {REPORT_LINKS.map(item => (
          <TouchableOpacity key={item.label} onPress={() => navigation.navigate(item.screen)}>
            <Card style={styles.row}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name={item.icon} size={20} color={theme.colors.primary} />
              </View>
              <Text style={styles.label}>{item.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={theme.colors.muted} />
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  label: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
});
