import makeDetailScreen from './generic/makeDetailScreen';
import { assetAPI } from '../api/client';

export default makeDetailScreen({
  title: 'Asset',
  queryKey: 'asset-detail',
  fetcher: (id) => assetAPI.detail(id),
  headerTitle: (d) => d.asset_name || d.asset_code || `Asset #${d.id}`,
  headerSubtitle: (d) => d.asset_code,
  status: (d) => d.status,
  fields: [
    { label: 'Type', value: (d) => d.asset_type },
    { label: 'Brand / Model', value: (d) => [d.brand, d.model].filter(Boolean).join(' / ') || null },
    { label: 'Current Project', value: (d) => d.current_project_name },
    { label: 'Assigned To', value: (d) => d.assigned_to_name },
    { label: 'Purchase Value', value: (d) => d.purchase_value != null ? `₹${Number(d.purchase_value).toLocaleString('en-IN')}` : null },
    { label: 'Vendor', value: (d) => d.vendor_name },
  ],
});
