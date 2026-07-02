import makeListScreen from './generic/makeListScreen';
import { methodStatementAPI } from '../api/client';

export default makeListScreen({
  title: 'Method Statements',
  icon: 'text-box-check-outline',
  queryKey: 'method-statements-list',
  fetcher: (projectId) => methodStatementAPI.list(projectId),
  primary: (item) => item.ms_number || item.title || `MS #${item.id}`,
  secondary: (item) => item.activity_name || item.description,
  status: (item) => item.status,
});
