import makeListScreen from './generic/makeListScreen';
import { activitiesAPI } from '../api/client';

export default makeListScreen({
  title: 'Schedule & Activities',
  icon: 'clipboard-list-outline',
  queryKey: 'activities-list',
  fetcher: (projectId) => activitiesAPI.list(projectId),
  primary: (item) => item.activity_name || item.name || `Activity #${item.id}`,
  secondary: (item) => item.wbs_code ? `WBS: ${item.wbs_code}` : null,
  meta: (item) => item.start_date && item.end_date ? `${item.start_date} → ${item.end_date}` : null,
  status: (item) => item.status,
});
