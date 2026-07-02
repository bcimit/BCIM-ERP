import makeListScreen from './generic/makeListScreen';
import { hireRentalAPI } from '../api/client';

export default makeListScreen({
  title: 'Hire & Rental',
  icon: 'truck-outline',
  queryKey: 'hire-rental-list',
  fetcher: (projectId) => hireRentalAPI.list(projectId),
  primary: (item) => item.order_number || `Order #${item.id}`,
  secondary: (item) => item.vendor_name || item.equipment_name,
  meta: (item) => item.rental_period || null,
  status: (item) => item.status,
});
