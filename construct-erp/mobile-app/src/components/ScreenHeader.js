import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';

export default function ScreenHeader({ title, subtitle, showBack = false, right }) {
  const navigation = useNavigation();
  return (
    <View style={styles.wrap}>
      <View style={styles.left}>
        {showBack && (
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={10}>
            <MaterialCommunityIcons name="arrow-left" size={22} color={theme.colors.text} />
          </TouchableOpacity>
        )}
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border, backgroundColor: theme.colors.card,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  backBtn: { padding: 4 },
  title: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  subtitle: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
});
