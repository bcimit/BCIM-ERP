import makeListScreen from './generic/makeListScreen';
import { plantAPI } from '../api/client';

export default makeListScreen({
  title: 'Plant & Machinery',
  icon: 'crane',
  queryKey: 'plant-list',
  fetcher: (projectId) => plantAPI.list(projectId),
  primary: (item) => item.equipment_code || item.name || `Equipment #${item.id}`,
  secondary: (item) => item.equipment_type || item.category,
  meta: (item) => item.location || null,
  status: (item) => item.status,
});
