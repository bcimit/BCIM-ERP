import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { projectAPI } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Screen from '../components/Screen';
import ListSkeleton from '../components/ListSkeleton';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { theme } from '../theme';

export default function ProjectSelectScreen() {
  const { selectProject, logout, user } = useAuth();
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectAPI.list().then(r => r.data?.data ?? r.data ?? []),
  });

  const projects = data || [];

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>Select Project</Text>
        <Text style={styles.subtitle}>Hi {user?.name || user?.full_name || 'there'}, choose a project to continue</Text>
      </View>

      {isLoading ? (
        <ListSkeleton />
      ) : isError ? (
        <ErrorState message="Couldn't load projects" onRetry={refetch} />
      ) : projects.length === 0 ? (
        <EmptyState icon="office-building-outline" title="No projects assigned" />
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={{ padding: theme.spacing.md, gap: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => selectProject(item)}>
              <View style={styles.iconWrap}>
                <MaterialCommunityIcons name="office-building-outline" size={20} color={theme.colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                {item.location ? <Text style={styles.cardSub}>{item.location}</Text> : null}
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={theme.colors.muted} />
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity onPress={logout} style={styles.logout}>
        <Text style={styles.logoutText}>Sign out</Text>
      </TouchableOpacity>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { padding: theme.spacing.md, paddingTop: theme.spacing.lg },
  title: { fontSize: 22, fontWeight: '800', color: theme.colors.text },
  subtitle: { fontSize: 13, color: theme.colors.muted, marginTop: 4 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, padding: 14,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: 15, fontWeight: '700', color: theme.colors.text },
  cardSub: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  logout: { alignItems: 'center', paddingVertical: 16 },
  logoutText: { color: theme.colors.danger, fontWeight: '600', fontSize: 13 },
});
