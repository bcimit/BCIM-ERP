import makeListScreen from './generic/makeListScreen';
import { engineerLogAPI } from '../api/client';

export default makeListScreen({
  title: 'Engineer Daily Log',
  icon: 'notebook-outline',
  queryKey: 'engineer-log-list',
  fetcher: (projectId) => engineerLogAPI.list(projectId),
  primary: (item) => item.log_date || `Log #${item.id}`,
  secondary: (item) => item.summary || item.remarks,
  meta: (item) => item.engineer_name || null,
});
