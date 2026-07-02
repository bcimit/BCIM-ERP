import makeDetailScreen from './generic/makeDetailScreen';
import dayjs from 'dayjs';
import { raBillAPI } from '../api/client';

export default makeDetailScreen({
  title: 'RA Bill',
  queryKey: 'ra-bill-detail',
  fetcher: (id) => raBillAPI.detail(id),
  headerTitle: (d) => `RA Bill #${d.bill_number || d.id}`,
  headerSubtitle: (d) => d.project_name,
  status: (d) => d.status,
  fields: [
    { label: 'Bill Date', value: (d) => d.bill_date ? dayjs(d.bill_date).format('DD MMM YYYY') : null },
    { label: 'Gross Amount', value: (d) => d.gross_amount != null ? `₹${Number(d.gross_amount).toLocaleString('en-IN')}` : null },
    { label: 'Net Payable', value: (d) => d.net_payable != null ? `₹${Number(d.net_payable).toLocaleString('en-IN')}` : null },
    { label: 'Certified By', value: (d) => d.certified_by_name },
    { label: 'Verified By', value: (d) => d.verified_by_name },
  ],
});
