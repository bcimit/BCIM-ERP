import makeListScreen from './generic/makeListScreen';
import { projectsAPI } from '../api/client';

export default makeListScreen({
  title: 'Projects',
  icon: 'office-building-outline',
  queryKey: 'projects-list',
  projectScoped: false,
  fetcher: () => projectsAPI.list(),
  primary: (item) => item.name,
  secondary: (item) => item.location,
  status: (item) => item.status,
});
