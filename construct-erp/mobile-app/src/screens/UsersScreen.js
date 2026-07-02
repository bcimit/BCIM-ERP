import makeListScreen from './generic/makeListScreen';
import { usersAPI } from '../api/client';

export default makeListScreen({
  title: 'Users',
  icon: 'account-multiple-outline',
  queryKey: 'users-list',
  projectScoped: false,
  fetcher: () => usersAPI.list(),
  primary: (item) => item.name,
  secondary: (item) => item.email,
  meta: (item) => item.role || null,
  status: (item) => item.is_active === false ? 'inactive' : 'active',
  avatar: true,
});
