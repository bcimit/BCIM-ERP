import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    setBusy(true);
    setError('');
    try {
      await signIn(email.trim(), password);
    } catch (err) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{ flex: 1, justifyContent: 'center', padding: 22 }}>
        <View style={{ marginBottom: 28 }}>
          <Text style={{ color: theme.colors.primary, fontSize: 34, fontWeight: '900' }}>BCIM ERP</Text>
          <Text style={{ color: theme.colors.muted, fontWeight: '700', marginTop: 6 }}>Android field access for projects, stores, bills and assets.</Text>
        </View>

        <View style={{ backgroundColor: '#fff', borderRadius: 20, padding: 18, borderColor: theme.colors.border, borderWidth: 1 }}>
          {!!error && (
            <View style={{ flexDirection: 'row', gap: 8, backgroundColor: '#fff2f0', padding: 12, borderRadius: 12, marginBottom: 12 }}>
              <Ionicons name="alert-circle-outline" color={theme.colors.danger} size={18} />
              <Text style={{ color: theme.colors.danger, fontWeight: '800', flex: 1 }}>{error}</Text>
            </View>
          )}
          <Text style={{ fontWeight: '900', color: theme.colors.text, marginBottom: 8 }}>Email Address</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="name@bcim.in"
            style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14, fontWeight: '800', marginBottom: 14 }}
          />
          <Text style={{ fontWeight: '900', color: theme.colors.text, marginBottom: 8 }}>Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
            style={{ borderWidth: 1, borderColor: theme.colors.border, borderRadius: 12, padding: 14, fontWeight: '800', marginBottom: 18 }}
          />
          <TouchableOpacity
            onPress={submit}
            disabled={busy || !email || !password}
            style={{ backgroundColor: busy ? '#9db2d6' : theme.colors.primary, borderRadius: 14, padding: 16, alignItems: 'center' }}
          >
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16 }}>Sign In</Text>}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
