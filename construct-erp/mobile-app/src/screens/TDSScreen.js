import makeListScreen from './generic/makeListScreen';
import { tdsAPI } from '../api/client';

export default makeListScreen({
  title: 'TDS',
  icon: 'shield-check-outline',
  queryKey: 'tds-list',
  fetcher: (projectId) => tdsAPI.list(projectId),
  primary: (item) => item.deductee_name || item.vendor_name || `TDS #${item.id}`,
  secondary: (item) => item.section ? `Section ${item.section}` : null,
  meta: (item) => item.tds_amount != null ? `₹${Number(item.tds_amount).toLocaleString('en-IN')}` : null,
  status: (item) => item.status,
});
