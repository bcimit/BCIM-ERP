import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { theme } from '../theme';

export default function ErrorState({ message = 'Something went wrong', onRetry }) {
  return (
    <View style={styles.wrap}>
      <MaterialCommunityIcons name="alert-circle-outline" size={40} color={theme.colors.danger} />
      <Text style={styles.title}>{message}</Text>
      {onRetry && (
        <TouchableOpacity onPress={onRetry} style={styles.btn}>
          <Text style={styles.btnText}>Retry</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  title: { marginTop: 12, fontSize: 14, fontWeight: '600', color: theme.colors.text, textAlign: 'center' },
  btn: { marginTop: 14, paddingVertical: 8, paddingHorizontal: 18, borderRadius: theme.radius.sm, backgroundColor: theme.colors.primary },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
});
