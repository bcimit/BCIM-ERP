import makeListScreen from './generic/makeListScreen';
import { payrollAPI } from '../api/client';

export default makeListScreen({
  title: 'Payroll',
  icon: 'cash-multiple',
  queryKey: 'payroll-list',
  projectScoped: false,
  fetcher: () => payrollAPI.list(),
  primary: (item) => `${item.month || ''} ${item.year || ''}`.trim() || `Payroll #${item.id}`,
  secondary: (item) => item.employee_count ? `${item.employee_count} employees` : null,
  meta: (item) => item.total_net_pay != null ? `₹${Number(item.total_net_pay).toLocaleString('en-IN')}` : null,
  status: (item) => item.status,
});
