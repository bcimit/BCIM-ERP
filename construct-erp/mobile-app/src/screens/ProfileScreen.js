import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import Avatar from '../components/Avatar';
import { theme } from '../theme';

export default function ProfileScreen() {
  const { user, selectedProject, changeProject, logout } = useAuth();

  const confirmLogout = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: logout },
    ]);
  };

  const rows = [
    { icon: 'office-building-outline', label: 'Change Project', onPress: changeProject },
    { icon: 'bell-outline',            label: 'Notifications', onPress: () => {} },
    { icon: 'shield-lock-outline',     label: 'Privacy & Security', onPress: () => {} },
    { icon: 'help-circle-outline',     label: 'Help & Support', onPress: () => {} },
  ];

  return (
    <Screen>
      <ScreenHeader title="Profile" />
      <View style={{ padding: theme.spacing.md }}>
        <Card style={styles.profileCard}>
          <Avatar name={user?.name || user?.full_name} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name || user?.full_name || 'User'}</Text>
            <Text style={styles.email}>{user?.email}</Text>
            {user?.role ? <Text style={styles.role}>{user.role}</Text> : null}
          </View>
        </Card>

        {selectedProject && (
          <View style={styles.projectRow}>
            <MaterialCommunityIcons name="office-building-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.projectText}>{selectedProject.name}</Text>
          </View>
        )}

        <View style={{ marginTop: 16, gap: 1 }}>
          {rows.map(r => (
            <TouchableOpacity key={r.label} style={styles.row} onPress={r.onPress}>
              <MaterialCommunityIcons name={r.icon} size={20} color={theme.colors.textSecondary} />
              <Text style={styles.rowLabel}>{r.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.muted} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={confirmLogout}>
          <MaterialCommunityIcons name="logout" size={18} color={theme.colors.danger} />
          <Text style={styles.logoutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  name: { fontSize: 17, fontWeight: '700', color: theme.colors.text },
  email: { fontSize: 13, color: theme.colors.muted, marginTop: 2 },
  role: { fontSize: 11, color: theme.colors.primary, fontWeight: '700', marginTop: 4, textTransform: 'capitalize' },
  projectRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingHorizontal: 4 },
  projectText: { fontSize: 13, color: theme.colors.textSecondary, fontWeight: '500' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.colors.card,
    borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 14, paddingVertical: 13,
  },
  rowLabel: { flex: 1, fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  logoutBtn: {
    marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: theme.colors.danger, borderRadius: theme.radius.md, height: 48,
  },
  logoutText: { color: theme.colors.danger, fontWeight: '700', fontSize: 14 },
});
