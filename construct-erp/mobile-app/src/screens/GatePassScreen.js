import makeListScreen from './generic/makeListScreen';
import { gatePassAPI } from '../api/client';

export default makeListScreen({
  title: 'Gate Pass',
  icon: 'logout',
  queryKey: 'gate-pass-list',
  fetcher: (projectId) => gatePassAPI.list(projectId),
  primary: (item) => item.pass_number || `Pass #${item.id}`,
  secondary: (item) => item.material_description || item.purpose,
  meta: (item) => item.vehicle_no ? `Vehicle: ${item.vehicle_no}` : null,
  status: (item) => item.status,
});
