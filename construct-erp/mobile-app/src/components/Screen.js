import React from 'react';
import { RefreshControl, SafeAreaView, ScrollView, Text, View } from 'react-native';
import { theme } from '../theme';

export default function Screen({ title, subtitle, children, right, refreshing, onRefresh }) {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.bg }}>
      <View style={{
        backgroundColor: theme.colors.primary,
        paddingHorizontal: 18,
        paddingBottom: 18,
        paddingTop: 12,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>{title}</Text>
            {!!subtitle && <Text style={{ color: '#c8d7f6', marginTop: 4, fontWeight: '700' }}>{subtitle}</Text>}
          </View>
          {right}
        </View>
      </View>
      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.page, paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          onRefresh
            ? <RefreshControl
                refreshing={!!refreshing}
                onRefresh={onRefresh}
                tintColor={theme.colors.primary}
                colors={[theme.colors.primary]}
              />
            : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}
