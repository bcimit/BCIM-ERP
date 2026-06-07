import React, { useMemo, useState } from 'react';
import { Text, TextInput, TouchableOpacity, View } from 'react-native';
import Screen from '../components/Screen';
import { Card } from '../components/Card';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function ProjectSelectScreen() {
  const { projects, selectProject, canUseAllProjects, signOut } = useAuth();
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) => `${p.name || ''} ${p.project_code || p.code || ''}`.toLowerCase().includes(q));
  }, [projects, search]);

  return (
    <Screen
      title="Select Project"
      subtitle="Choose the working project before opening ERP data"
      right={<TouchableOpacity onPress={signOut}><Text style={{ color: '#fff', fontWeight: '900' }}>Logout</Text></TouchableOpacity>}
    >
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search project..."
        style={{ backgroundColor: '#fff', borderColor: theme.colors.border, borderWidth: 1, borderRadius: 14, padding: 14, fontWeight: '800', marginBottom: 12 }}
      />
      {canUseAllProjects && (
        <TouchableOpacity onPress={() => selectProject({ id: 'all', name: 'All Projects', project_code: 'GLOBAL' })}>
          <Card style={{ borderColor: theme.colors.primary2 }}>
            <Text style={{ color: theme.colors.primary, fontWeight: '900', fontSize: 16 }}>All Projects</Text>
            <Text style={{ color: theme.colors.muted, marginTop: 4, fontWeight: '700' }}>Global management view</Text>
          </Card>
        </TouchableOpacity>
      )}
      {filtered.map((project) => (
        <TouchableOpacity key={project.id} onPress={() => selectProject(project)}>
          <Card>
            <Text style={{ color: theme.colors.text, fontWeight: '900', fontSize: 16 }}>{project.name}</Text>
            <Text style={{ color: theme.colors.muted, marginTop: 4, fontWeight: '700' }}>{project.project_code || project.code || 'No project code'}</Text>
          </Card>
        </TouchableOpacity>
      ))}
    </Screen>
  );
}
