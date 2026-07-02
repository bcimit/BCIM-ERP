import makeDetailScreen from './generic/makeDetailScreen';
import dayjs from 'dayjs';
import { poAPI } from '../api/client';

export default makeDetailScreen({
  title: 'Purchase Order',
  queryKey: 'po-detail',
  fetcher: (id) => poAPI.detail(id),
  headerTitle: (d) => d.po_number || d.serial_no_formatted || `PO-${d.id}`,
  headerSubtitle: (d) => d.project_name,
  status: (d) => d.status,
  fields: [
    { label: 'Vendor', value: (d) => d.vendor_name },
    { label: 'PO Date', value: (d) => d.po_date ? dayjs(d.po_date).format('DD MMM YYYY') : null },
    { label: 'Grand Total', value: (d) => d.grand_total != null ? `₹${Number(d.grand_total).toLocaleString('en-IN')}` : (d.total_amount != null ? `₹${Number(d.total_amount).toLocaleString('en-IN')}` : null) },
    { label: 'Delivery', value: (d) => `${d.items_received ?? 0} / ${d.items_total ?? 0} items received` },
  ],
  itemsKey: 'items',
  itemFields: [
    { label: 'Material', value: (it) => it.material_name || it.description },
    { label: 'Quantity', value: (it) => `${it.quantity ?? '—'} ${it.unit || ''}` },
    { label: 'Rate', value: (it) => it.rate != null ? `₹${Number(it.rate).toLocaleString('en-IN')}` : null },
  ],
});
