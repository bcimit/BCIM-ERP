import makeListScreen from './generic/makeListScreen';
import { appraisalAPI } from '../api/client';

export default makeListScreen({
  title: 'Performance',
  icon: 'star-outline',
  queryKey: 'performance-list',
  projectScoped: false,
  fetcher: () => appraisalAPI.list(),
  primary: (item) => item.employee_name || `Appraisal #${item.id}`,
  secondary: (item) => item.review_period || item.cycle,
  meta: (item) => item.rating ? `Rating: ${item.rating}` : null,
  status: (item) => item.status,
});
