import makeDetailScreen from './generic/makeDetailScreen';
import { materialTrackerAPI } from '../api/client';

export default makeDetailScreen({
  title: 'Material Tracker',
  queryKey: 'material-tracker-detail',
  fetcher: (id) => materialTrackerAPI.detail(id),
  headerTitle: (d) => d.material_name || d.reference || `MT-${d.id}`,
  headerSubtitle: (d) => d.project_name,
  status: (d) => d.status,
  fields: [
    { label: 'Vendor', value: (d) => d.vendor_name },
    { label: 'Ordered Qty', value: (d) => d.ordered_qty },
    { label: 'Received Qty', value: (d) => d.received_qty },
    { label: 'Unit', value: (d) => d.unit },
  ],
});
