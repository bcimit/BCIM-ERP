import React from 'react';
import { View, StyleSheet } from 'react-native';
import { theme } from '../theme';

export default function ListSkeleton({ rows = 5 }) {
  return (
    <View style={{ padding: theme.spacing.md, gap: 10 }}>
      {Array.from({ length: rows }).map((_, i) => (
        <View key={i} style={styles.row} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { height: 64, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface },
});
