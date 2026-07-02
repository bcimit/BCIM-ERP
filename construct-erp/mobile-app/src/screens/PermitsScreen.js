import makeListScreen from './generic/makeListScreen';
import { permitAPI } from '../api/client';

export default makeListScreen({
  title: 'Permits',
  icon: 'file-certificate-outline',
  queryKey: 'permits-list',
  fetcher: (projectId) => permitAPI.list(projectId),
  primary: (item) => item.permit_number || item.permit_type || `Permit #${item.id}`,
  secondary: (item) => item.work_description,
  meta: (item) => item.expiry_date ? `Expires: ${item.expiry_date}` : null,
  status: (item) => item.status,
});
