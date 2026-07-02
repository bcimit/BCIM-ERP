import makeListScreen from './generic/makeListScreen';
import { ppeAPI } from '../api/client';

export default makeListScreen({
  title: 'PPE Tracker',
  icon: 'hard-hat',
  queryKey: 'ppe-list',
  fetcher: (projectId) => ppeAPI.list(projectId),
  primary: (item) => item.item_name || item.ppe_type || `PPE #${item.id}`,
  secondary: (item) => item.assigned_to_name,
  meta: (item) => item.expiry_date ? `Expires: ${item.expiry_date}` : null,
  status: (item) => item.status,
});
