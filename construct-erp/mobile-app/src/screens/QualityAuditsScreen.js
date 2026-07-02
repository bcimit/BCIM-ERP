import makeListScreen from './generic/makeListScreen';
import { qualityAPI } from '../api/client';

export default makeListScreen({
  title: 'Quality Audits',
  icon: 'file-search-outline',
  queryKey: 'quality-audits-list',
  fetcher: (projectId) => qualityAPI.audits(projectId),
  primary: (item) => item.audit_number || item.title || `Audit #${item.id}`,
  secondary: (item) => item.auditor_name,
  meta: (item) => item.audit_date || null,
  status: (item) => item.status,
});
