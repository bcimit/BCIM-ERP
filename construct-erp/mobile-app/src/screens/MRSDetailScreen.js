import makeDetailScreen from './generic/makeDetailScreen';
import dayjs from 'dayjs';
import { mrsAPI } from '../api/client';

export default makeDetailScreen({
  title: 'Material Request',
  queryKey: 'mrs-detail',
  fetcher: (id) => mrsAPI.detail(id),
  headerTitle: (d) => d.mrs_number || `MRS-${d.id}`,
  headerSubtitle: (d) => d.project_name,
  status: (d) => d.status,
  fields: [
    { label: 'Raised By', value: (d) => d.raised_by_name },
    { label: 'Priority', value: (d) => d.priority },
    { label: 'Date', value: (d) => d.created_at ? dayjs(d.created_at).format('DD MMM YYYY') : null },
    { label: 'Remarks', value: (d) => d.remarks },
  ],
  itemsKey: 'items',
  itemFields: [
    { label: 'Material', value: (it) => it.material_name || it.material },
    { label: 'Quantity', value: (it) => `${it.effective_qty ?? it.quantity ?? it.qty ?? '—'} ${it.unit || ''}` },
    { label: 'Ordered Qty', value: (it) => it.ordered_qty },
    { label: 'Purpose', value: (it) => it.purpose },
  ],
});
