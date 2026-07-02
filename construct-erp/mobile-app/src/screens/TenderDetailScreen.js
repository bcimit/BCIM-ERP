import makeDetailScreen from './generic/makeDetailScreen';
import dayjs from 'dayjs';
import { tenderAPI } from '../api/client';

export default makeDetailScreen({
  title: 'Tender',
  queryKey: 'tender-detail',
  fetcher: (id) => tenderAPI.detail(id),
  headerTitle: (d) => d.tender_number || d.title || `Tender #${d.id}`,
  headerSubtitle: (d) => d.title,
  status: (d) => d.status,
  fields: [
    { label: 'Description', value: (d) => d.description },
    { label: 'Due Date', value: (d) => d.due_date ? dayjs(d.due_date).format('DD MMM YYYY') : null },
    { label: 'Estimated Value', value: (d) => d.estimated_value != null ? `₹${Number(d.estimated_value).toLocaleString('en-IN')}` : null },
  ],
});
