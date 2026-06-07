import React from 'react';
import { Alert, Text, TouchableOpacity } from 'react-native';
import Screen from '../components/Screen';
import { Card, Label, Value } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function ProfileScreen() {
  const { user, selectedProject, signOut, switchProject } = useAuth();

  function confirmSwitchProject() {
    Alert.alert(
      'Change Project',
      'Switch to a different project? You will be taken to the project selection screen.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Switch', style: 'default', onPress: switchProject },
      ]
    );
  }

  function confirmSignOut() {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: signOut },
      ]
    );
  }

  return (
    <Screen title="Profile" subtitle="Session and project">
      <Card>
        <Label>User</Label>
        <Value>{user?.name || user?.email}</Value>
        <Text style={{ color: theme.colors.muted, marginTop: 6, fontWeight: '800' }}>{user?.role || '-'}</Text>
      </Card>
      <Card>
        <Label>Current Project</Label>
        <Value>{selectedProject?.name}</Value>
        <Text style={{ color: theme.colors.muted, marginTop: 6, fontWeight: '800' }}>{selectedProject?.project_code || selectedProject?.code || '-'}</Text>
      </Card>
      <TouchableOpacity onPress={confirmSwitchProject} style={{ backgroundColor: theme.colors.primary2, padding: 15, borderRadius: 14, alignItems: 'center', marginBottom: 12 }}>
        <Text style={{ color: '#fff', fontWeight: '900' }}>Change Project</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={confirmSignOut} style={{ backgroundColor: theme.colors.primary, padding: 15, borderRadius: 14, alignItems: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '900' }}>Logout</Text>
      </TouchableOpacity>
    </Screen>
  );
}
