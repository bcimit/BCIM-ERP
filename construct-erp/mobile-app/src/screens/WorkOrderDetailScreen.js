import makeDetailScreen from './generic/makeDetailScreen';
import { workOrderAPI } from '../api/client';

export default makeDetailScreen({
  title: 'Work Order',
  queryKey: 'work-order-detail',
  fetcher: (id) => workOrderAPI.detail(id),
  headerTitle: (d) => d.wo_number || `WO-${d.id}`,
  headerSubtitle: (d) => d.project_name,
  status: (d) => d.status,
  fields: [
    { label: 'Subcontractor', value: (d) => d.sc_name },
    { label: 'Trade Type', value: (d) => d.trade_type },
    { label: 'Contractor Type', value: (d) => d.contractor_type },
    { label: 'Bills', value: (d) => d.bill_count },
  ],
  itemsKey: 'items',
  itemFields: [
    { label: 'Description', value: (it) => it.description || it.boq_description },
    { label: 'Quantity', value: (it) => `${it.quantity ?? '—'} ${it.unit || ''}` },
    { label: 'Rate', value: (it) => it.rate != null ? `₹${Number(it.rate).toLocaleString('en-IN')}` : null },
  ],
});
