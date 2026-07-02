import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import ScreenHeader from '../components/ScreenHeader';
import { theme } from '../theme';

// Shown for modules that exist in the web sidebar but don't have a
// dedicated mobile screen yet. Keeps the full menu navigable end-to-end
// while those screens get built out module by module.
export default function PlaceholderScreen({ route }) {
  const title = route?.params?.title || 'Module';
  return (
    <Screen>
      <ScreenHeader title={title} showBack />
      <View style={styles.wrap}>
        <MaterialCommunityIcons name="hammer-wrench" size={40} color={theme.colors.muted} />
        <Text style={styles.title}>Coming soon on mobile</Text>
        <Text style={styles.subtitle}>{title} isn't available in the app yet. Use the web dashboard for this module.</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  title: { marginTop: 14, fontSize: 16, fontWeight: '700', color: theme.colors.text },
  subtitle: { marginTop: 6, fontSize: 13, color: theme.colors.muted, textAlign: 'center', lineHeight: 19 },
});
