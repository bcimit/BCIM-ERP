import makeListScreen from './generic/makeListScreen';
import { pettyCashAPI } from '../api/client';

export default makeListScreen({
  title: 'Petty Cash Tracker',
  icon: 'cash-multiple',
  queryKey: 'petty-cash-list',
  fetcher: (projectId) => pettyCashAPI.list(projectId),
  primary: (item) => item.description || item.purpose || `Entry #${item.id}`,
  secondary: (item) => item.category,
  meta: (item) => item.amount != null ? `₹${Number(item.amount).toLocaleString('en-IN')}` : null,
  status: (item) => item.status,
});
