import makeListScreen from './generic/makeListScreen';
import { itAssetAPI } from '../api/client';

export default makeListScreen({
  title: 'IT Assets',
  icon: 'laptop',
  queryKey: 'it-assets-list',
  fetcher: (projectId) => itAssetAPI.list(projectId),
  primary: (item) => item.asset_tag || item.name || `Asset #${item.id}`,
  secondary: (item) => item.assigned_to_name ? `Assigned to ${item.assigned_to_name}` : item.category,
  meta: (item) => item.model || null,
  status: (item) => item.status,
});
