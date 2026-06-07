import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import Screen from '../components/Screen';
import { Card, EmptyState, Label, Value } from '../components/Card';
import { apiRequest, listByProject, lookupAssetByCode, normalizePayload } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { currency, theme } from '../theme';

export default function AssetsScreen() {
  const { selectedProject } = useAuth();
  const [assets, setAssets] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [lookupCode, setLookupCode] = useState('');
  const [lookupResult, setLookupResult] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const scannedRef = useRef(false);

  async function load(isRefresh = false) {
    isRefresh ? setRefreshing(true) : setListLoading(true);
    try {
      const projectId = selectedProject?.id;
      const plant = projectId === 'all' ? normalizePayload(await apiRequest('/assets')) : await listByProject('/assets', projectId);
      const it = projectId === 'all'
        ? normalizePayload(await apiRequest('/it-assets'))
        : normalizePayload(await apiRequest(`/it-assets?project_id=${projectId}`));
      setAssets([...plant, ...it]);
    } catch (err) {
      Alert.alert('Error', err.message || 'Unable to load assets');
    } finally {
      setListLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => { load(); }, [selectedProject?.id]);

  async function searchAsset() {
    if (!lookupCode.trim()) {
      Alert.alert('Asset Code Required', 'Scan or enter an asset code first.');
      return;
    }
    setLookupLoading(true);
    try {
      const res = await lookupAssetByCode(lookupCode.trim());
      setLookupResult(res?.data || null);
    } catch (err) {
      setLookupResult(null);
      Alert.alert('Asset Not Found', err.message || 'Unable to find asset details');
    } finally {
      setLookupLoading(false);
    }
  }

  async function openScanner() {
    if (!permission?.granted) {
      const next = await requestPermission();
      if (!next.granted) {
        Alert.alert('Camera Permission', 'Camera permission is required to scan asset QR labels.');
        return;
      }
    }
    setShowScanner(true);
  }

  function handleBarcodeScanned(result) {
    if (scannedRef.current) return; // prevent duplicate scans
    const data = String(result?.data || '').trim();
    if (!data) return;
    scannedRef.current = true;
    setShowScanner(false);
    setLookupCode(data);
    searchAssetByValue(data);
  }

  function openScannerReset() {
    scannedRef.current = false;
    openScanner();
  }

  async function searchAssetByValue(value) {
    setLookupLoading(true);
    try {
      const res = await lookupAssetByCode(value);
      setLookupResult(res?.data || null);
    } catch (err) {
      setLookupResult(null);
      Alert.alert('Asset Not Found', err.message || 'Unable to find asset details');
    } finally {
      setLookupLoading(false);
    }
  }

  return (
    <Screen
      title="Assets"
      subtitle="P&M, admin assets and IT assets"
      refreshing={refreshing}
      onRefresh={() => load(true)}
    >
      <Card>
        <Label>Scan QR / Asset Code</Label>
        <TextInput
          value={lookupCode}
          onChangeText={setLookupCode}
          placeholder="e.g. BCIM-IT-LT-001"
          autoCapitalize="characters"
          style={{
            borderWidth: 1,
            borderColor: theme.colors.border,
            borderRadius: 12,
            padding: 12,
            marginTop: 8,
            color: theme.colors.text,
            fontWeight: '900',
            backgroundColor: '#f8fafc',
          }}
        />
        <TouchableOpacity onPress={searchAsset} style={{ backgroundColor: theme.colors.primary, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 10 }}>
          {lookupLoading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '900' }}>Open Asset Details</Text>}
        </TouchableOpacity>
        <TouchableOpacity onPress={openScannerReset} style={{ backgroundColor: theme.colors.success, padding: 14, borderRadius: 14, alignItems: 'center', marginTop: 10 }}>
          <Text style={{ color: '#fff', fontWeight: '900' }}>Scan QR with Camera</Text>
        </TouchableOpacity>
      </Card>

      <Modal visible={showScanner} animationType="slide">
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={handleBarcodeScanned}
          />
          <View style={{ position: 'absolute', left: 16, right: 16, bottom: 28 }}>
            <TouchableOpacity onPress={() => setShowScanner(false)} style={{ backgroundColor: '#fff', padding: 14, borderRadius: 14, alignItems: 'center' }}>
              <Text style={{ color: theme.colors.text, fontWeight: '900' }}>Close Scanner</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {lookupResult && (
        <Card style={{ borderColor: theme.colors.primary, borderWidth: 2 }}>
          <Label>{lookupResult.source === 'it_asset' ? 'IT Asset' : 'Asset'}</Label>
          <Value>{lookupResult.asset_code}</Value>
          <Text style={{ color: theme.colors.text, marginTop: 6, fontWeight: '900' }}>{lookupResult.asset_name || '-'}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 12 }}>
            <View style={{ minWidth: '45%' }}><Label>Type</Label><Text style={{ fontWeight: '900' }}>{lookupResult.asset_type || '-'}</Text></View>
            <View style={{ minWidth: '45%' }}><Label>Status</Label><Text style={{ fontWeight: '900' }}>{lookupResult.status || '-'}</Text></View>
            <View style={{ minWidth: '45%' }}><Label>Serial No.</Label><Text style={{ fontWeight: '900' }}>{lookupResult.serial_number || '-'}</Text></View>
            <View style={{ minWidth: '45%' }}><Label>Project</Label><Text style={{ fontWeight: '900' }}>{lookupResult.project_name || '-'}</Text></View>
            <View style={{ minWidth: '45%' }}><Label>Value</Label><Text style={{ fontWeight: '900' }}>{currency(lookupResult.purchase_value || lookupResult.book_value)}</Text></View>
            {!!lookupResult.assigned_to_name && <View style={{ minWidth: '45%' }}><Label>Assigned To</Label><Text style={{ fontWeight: '900' }}>{lookupResult.assigned_to_name}</Text></View>}
          </View>
        </Card>
      )}

      {listLoading ? (
        <Card style={{ alignItems: 'center', paddingVertical: 32 }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text style={{ marginTop: 10, color: theme.colors.muted, fontWeight: '800' }}>Loading assets...</Text>
        </Card>
      ) : assets.length === 0 ? (
        <EmptyState text="No assets found." />
      ) : null}
      {!listLoading && assets.slice(0, 100).map((asset) => (
        <Card key={`${asset.id}-${asset.asset_code || asset.code}`}>
          <Text style={{ color: theme.colors.primary, fontSize: 16, fontWeight: '900' }}>{asset.asset_code || asset.code || asset.asset_id}</Text>
          <Text style={{ color: theme.colors.text, marginTop: 4, fontWeight: '900' }}>{asset.asset_name || asset.name || asset.item_name}</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
            <View><Label>Type</Label><Text style={{ fontWeight: '900' }}>{asset.asset_type || asset.category || '-'}</Text></View>
            <View><Label>Status</Label><Text style={{ fontWeight: '900' }}>{asset.status || '-'}</Text></View>
            <View><Label>Value</Label><Text style={{ fontWeight: '900' }}>{currency(asset.purchase_value || asset.book_value)}</Text></View>
          </View>
        </Card>
      ))}

    </Screen>
  );
}
