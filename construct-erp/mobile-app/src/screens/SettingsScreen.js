import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import Card from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { changeProject, selectedProject } = useAuth();

  const rows = [
    { icon: 'account-multiple-outline', label: 'Users', onPress: () => navigation.navigate('Users') },
    { icon: 'office-building-outline',  label: 'Change Project', onPress: changeProject },
    { icon: 'account-circle-outline',   label: 'My Profile', onPress: () => navigation.navigate('Profile') },
  ];

  return (
    <Screen>
      <ScreenHeader title="Settings" subtitle={selectedProject?.name} showBack />
      <View style={{ padding: theme.spacing.md, gap: 1 }}>
        {rows.map(r => (
          <TouchableOpacity key={r.label} onPress={r.onPress}>
            <Card style={styles.row}>
              <MaterialCommunityIcons name={r.icon} size={20} color={theme.colors.textSecondary} />
              <Text style={styles.label}>{r.label}</Text>
              <MaterialCommunityIcons name="chevron-right" size={18} color={theme.colors.muted} />
            </Card>
          </TouchableOpacity>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  label: { flex: 1, fontSize: 14, fontWeight: '600', color: theme.colors.text },
});
