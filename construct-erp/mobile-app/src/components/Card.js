import React from 'react';
import { Text, View } from 'react-native';
import { theme } from '../theme';

export function Card({ children, style }) {
  return (
    <View style={[{
      backgroundColor: theme.colors.card,
      borderColor: theme.colors.border,
      borderWidth: 1,
      borderRadius: theme.spacing.radius,
      padding: 14,
      marginBottom: 12
    }, style]}>
      {children}
    </View>
  );
}

export function Label({ children }) {
  return <Text style={{ color: theme.colors.muted, fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.6 }}>{children}</Text>;
}

export function Value({ children, color = theme.colors.text }) {
  return <Text style={{ color, fontSize: 18, fontWeight: '900', marginTop: 4 }}>{children}</Text>;
}

export function EmptyState({ text = 'No records found.' }) {
  return (
    <Card style={{ alignItems: 'center', paddingVertical: 28 }}>
      <Text style={{ color: theme.colors.muted, fontWeight: '800' }}>{text}</Text>
    </Card>
  );
}
