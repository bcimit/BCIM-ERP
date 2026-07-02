import makeDetailScreen from './generic/makeDetailScreen';
import { billsAPI } from '../api/client';

export default makeDetailScreen({
  title: 'Bill',
  queryKey: 'bill-detail',
  fetcher: (id) => billsAPI.detail(id),
  headerTitle: (d) => d.bill_number || d.sl_number || `BILL-${d.id}`,
  headerSubtitle: (d) => d.project_name,
  status: (d) => d.status,
  fields: [
    { label: 'Vendor', value: (d) => d.vendor_name },
    { label: 'Amount', value: (d) => (d.amount ?? d.total_amount) != null ? `₹${Number(d.amount ?? d.total_amount).toLocaleString('en-IN')}` : null },
    { label: 'Bill Type', value: (d) => d.bill_type || d.source_type },
  ],
});
