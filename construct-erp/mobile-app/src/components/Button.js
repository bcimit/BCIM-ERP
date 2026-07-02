import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function Button({ title, onPress, loading, disabled, variant = 'primary', style }) {
  const isOutline = variant === 'outline';
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[
        styles.base,
        isOutline ? styles.outline : styles.primary,
        (disabled || loading) && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={isOutline ? theme.colors.primary : '#fff'} />
      ) : (
        <Text style={[styles.text, isOutline && styles.textOutline]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { height: 48, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
  primary: { backgroundColor: theme.colors.primary },
  outline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: theme.colors.primary },
  disabled: { opacity: 0.6 },
  text: { color: '#fff', fontWeight: '700', fontSize: 15 },
  textOutline: { color: theme.colors.primary },
});
