import makeListScreen from './generic/makeListScreen';
import { lookAheadAPI } from '../api/client';

export default makeListScreen({
  title: 'Look-Ahead Plan',
  icon: 'calendar-range-outline',
  queryKey: 'look-ahead-list',
  fetcher: (projectId) => lookAheadAPI.list(projectId),
  primary: (item) => item.activity_name || item.name || `Activity #${item.id}`,
  secondary: (item) => item.location || item.remarks,
  meta: (item) => item.planned_start && item.planned_end ? `${item.planned_start} → ${item.planned_end}` : null,
  status: (item) => item.status,
});
