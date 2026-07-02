import makeDetailScreen from './generic/makeDetailScreen';
import dayjs from 'dayjs';
import { invoiceAPI } from '../api/client';

export default makeDetailScreen({
  title: 'Invoice',
  queryKey: 'invoice-detail',
  fetcher: (id) => invoiceAPI.detail(id),
  headerTitle: (d) => d.invoice_number || `INV-${d.id}`,
  headerSubtitle: (d) => d.project_name,
  status: (d) => d.status,
  fields: [
    { label: 'Vendor', value: (d) => d.vendor_name },
    { label: 'Invoice Date', value: (d) => d.invoice_date ? dayjs(d.invoice_date).format('DD MMM YYYY') : null },
    { label: 'Total Amount', value: (d) => d.total_amount != null ? `₹${Number(d.total_amount).toLocaleString('en-IN')}` : null },
    { label: 'Verified By', value: (d) => d.verified_by_name },
    { label: 'Authorized By', value: (d) => d.authorized_by_name },
  ],
});
