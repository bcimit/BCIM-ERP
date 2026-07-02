import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, Image, Alert } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import Button from '../components/Button';
import { theme } from '../theme';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing details', 'Enter both email and password.');
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      Alert.alert('Login failed', e?.response?.data?.error || e?.response?.data?.message || 'Check your credentials and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.brand}>
        <View style={styles.logoCircle}>
          <MaterialCommunityIcons name="office-building" size={34} color="#fff" />
        </View>
        <Text style={styles.brandTitle}>BCIM ERP</Text>
        <Text style={styles.brandSubtitle}>Construction Management, on the go</Text>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@company.com"
          placeholderTextColor={theme.colors.muted}
          autoCapitalize="none"
          keyboardType="email-address"
          style={styles.input}
        />

        <Text style={styles.label}>Password</Text>
        <View style={styles.passwordRow}>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor={theme.colors.muted}
            secureTextEntry={!showPass}
            style={[styles.input, { flex: 1, marginBottom: 0 }]}
          />
          <MaterialCommunityIcons
            name={showPass ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color={theme.colors.muted}
            style={styles.eyeIcon}
            onPress={() => setShowPass(s => !s)}
          />
        </View>

        <Button title="Sign In" onPress={handleLogin} loading={loading} style={{ marginTop: 24 }} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: theme.colors.dark, justifyContent: 'center', paddingHorizontal: 24 },
  brand: { alignItems: 'center', marginBottom: 40 },
  logoCircle: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: theme.colors.primary,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  brandTitle: { fontSize: 26, fontWeight: '800', color: '#fff' },
  brandSubtitle: { fontSize: 13, color: '#94A3B8', marginTop: 4 },
  form: { backgroundColor: '#fff', borderRadius: theme.radius.lg, padding: 24 },
  label: { fontSize: 13, fontWeight: '600', color: theme.colors.textSecondary, marginBottom: 6, marginTop: 14 },
  input: {
    height: 48, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md,
    paddingHorizontal: 14, fontSize: 15, color: theme.colors.text, backgroundColor: theme.colors.surface,
  },
  passwordRow: { flexDirection: 'row', alignItems: 'center' },
  eyeIcon: { position: 'absolute', right: 14 },
});
