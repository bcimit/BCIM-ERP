import makeListScreen from './generic/makeListScreen';
import { employeeDirectoryAPI } from '../api/client';

export default makeListScreen({
  title: 'Employee Directory',
  icon: 'account-group-outline',
  queryKey: 'employee-directory-list',
  projectScoped: false,
  fetcher: () => employeeDirectoryAPI.list(),
  primary: (item) => item.name || item.full_name,
  secondary: (item) => item.designation || item.department,
  meta: (item) => item.employee_code || null,
  status: (item) => item.status,
  avatar: true,
});
