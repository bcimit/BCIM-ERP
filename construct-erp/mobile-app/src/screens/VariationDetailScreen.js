import makeDetailScreen from './generic/makeDetailScreen';
import dayjs from 'dayjs';
import { variationAPI } from '../api/client';

export default makeDetailScreen({
  title: 'Variation Order',
  queryKey: 'variation-detail',
  fetcher: (id) => variationAPI.detail(id),
  headerTitle: (d) => d.vo_number || `VO-${d.id}`,
  headerSubtitle: (d) => d.project_name,
  status: (d) => d.status,
  fields: [
    { label: 'Title', value: (d) => d.title || d.description },
    { label: 'Requested By', value: (d) => d.requested_by_name },
    { label: 'Date', value: (d) => d.created_at ? dayjs(d.created_at).format('DD MMM YYYY') : null },
    { label: 'Amount', value: (d) => d.amount != null ? `₹${Number(d.amount).toLocaleString('en-IN')}` : null },
  ],
  itemsKey: 'items',
  itemFields: [
    { label: 'Description', value: (it) => it.description },
    { label: 'Quantity', value: (it) => `${it.quantity ?? '—'} ${it.unit || ''}` },
  ],
});
