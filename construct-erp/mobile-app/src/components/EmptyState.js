import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function EmptyState({ icon = 'tray-remove-outline', title = 'Nothing here yet', subtitle }) {
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name={icon} size={40} color={theme.colors.muted} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  title: { marginTop: 12, fontSize: 15, fontWeight: '600', color: theme.colors.text },
  subtitle: { marginTop: 4, fontSize: 13, color: theme.colors.muted, textAlign: 'center' },
});
