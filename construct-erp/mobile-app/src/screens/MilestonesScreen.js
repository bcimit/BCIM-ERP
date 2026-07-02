import makeListScreen from './generic/makeListScreen';
import { milestonesAPI } from '../api/client';

export default makeListScreen({
  title: 'Milestones',
  icon: 'flag-outline',
  queryKey: 'milestones-list',
  fetcher: (projectId) => milestonesAPI.list(projectId),
  primary: (item) => item.name || item.title || `Milestone #${item.id}`,
  secondary: (item) => item.description,
  meta: (item) => item.target_date ? `Target: ${item.target_date}` : null,
  status: (item) => item.status,
});
