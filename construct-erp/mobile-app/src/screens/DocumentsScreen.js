import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Text, View } from 'react-native';
import Screen from '../components/Screen';
import { Card, EmptyState, Label } from '../components/Card';
import { apiRequest, listByProject, normalizePayload } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { theme } from '../theme';

export default function DocumentsScreen() {
  const { selectedProject } = useAuth();
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  async function load(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setLoading(true);
    try {
      if (selectedProject?.id === 'all') {
        setDocs(normalizePayload(await apiRequest('/dms')));
      } else {
        setDocs(await listByProject('/dms', selectedProject.id));
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load documents');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [selectedProject?.id]);

  return (
    <Screen
      title="Documents"
      subtitle={selectedProject?.name}
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      {loading ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ marginTop: 10, color: theme.colors.muted, fontWeight: '800' }}>Loading documents...</Text>
        </Card>
      ) : docs.length === 0 ? (
        <EmptyState text="No documents found." />
      ) : docs.slice(0, 80).map((doc) => (
        <Card key={doc.id}>
          <Text style={{ color: theme.colors.text, fontSize: 16, fontWeight: '900' }}>{doc.doc_title || doc.file_name}</Text>
          <Text style={{ color: theme.colors.muted, marginTop: 4, fontWeight: '700' }}>{doc.module || doc.doc_type || 'General'}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <View><Label>Status</Label><Text style={{ fontWeight: '900' }}>{doc.status || '-'}</Text></View>
            <View><Label>Revision</Label><Text style={{ fontWeight: '900' }}>{doc.revision_no || doc.version_no || '-'}</Text></View>
            <View><Label>Type</Label><Text style={{ fontWeight: '900' }}>{doc.file_type || '-'}</Text></View>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
