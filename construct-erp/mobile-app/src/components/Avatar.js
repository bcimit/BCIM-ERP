import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../theme';

const PALETTE = ['#2563EB', '#0891B2', '#7C3AED', '#059669', '#EA580C', '#D97706', '#DB2777', '#4F46E5'];

function colorFor(name) {
  const str = name || '?';
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

function initialsFor(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

export default function Avatar({ name, size = 40, style }) {
  const bg = colorFor(name);
  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius: size / 2, backgroundColor: bg }, style]}>
      <Text style={[styles.text, { fontSize: size * 0.4 }]}>{initialsFor(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#fff', fontWeight: '800' },
});
