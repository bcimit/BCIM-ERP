import makeListScreen from './generic/makeListScreen';
import { measurementAPI } from '../api/client';

export default makeListScreen({
  title: 'Measurement Book',
  icon: 'ruler',
  queryKey: 'measurement-book-list',
  fetcher: (projectId) => measurementAPI.list(projectId),
  primary: (item) => item.boq_description || item.item_description || `Measurement #${item.id}`,
  secondary: (item) => item.location,
  meta: (item) => item.net_quantity != null ? `Qty: ${item.net_quantity} ${item.unit || ''}` : null,
  status: (item) => item.status,
});
