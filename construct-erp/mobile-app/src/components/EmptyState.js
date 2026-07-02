import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function EmptyState({ icon = 'tray-remove-outline', title = 'Nothing here yet', subtitle }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.badgeOuter}>
        <View style={styles.badgeInner}>
          <MaterialCommunityIcons name={icon} size={34} color={theme.colors.primary} />
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 56, paddingHorizontal: 24 },
  badgeOuter: {
    width: 88, height: 88, borderRadius: 44, backgroundColor: `${theme.colors.primary}0D`,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeInner: {
    width: 64, height: 64, borderRadius: 32, backgroundColor: `${theme.colors.primary}17`,
    alignItems: 'center', justifyContent: 'center',
  },
  title: { marginTop: 16, fontSize: 15, fontWeight: '700', color: theme.colors.text },
  subtitle: { marginTop: 4, fontSize: 13, color: theme.colors.muted, textAlign: 'center', lineHeight: 18 },
});
