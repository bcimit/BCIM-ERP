import makeDetailScreen from './generic/makeDetailScreen';
import dayjs from 'dayjs';
import { ignAPI } from '../api/client';

export default makeDetailScreen({
  title: 'IGN Entry',
  queryKey: 'ign-detail',
  fetcher: (id) => ignAPI.detail(id),
  headerTitle: (d) => d.ign_number || `IGN-${d.id}`,
  headerSubtitle: (d) => d.project_name,
  status: (d) => d.status,
  fields: [
    { label: 'Supplier', value: (d) => d.supplier_name || d.vendor_name },
    { label: 'Vehicle No.', value: (d) => d.vehicle_no },
    { label: 'DC Number', value: (d) => d.dc_number },
    { label: 'Bill Number', value: (d) => d.bill_number },
    { label: 'Inspected By', value: (d) => d.inspected_by },
    { label: 'Date', value: (d) => d.date_time ? dayjs(d.date_time).format('DD MMM YYYY, HH:mm') : null },
    { label: 'Remarks', value: (d) => d.remarks },
  ],
  itemsKey: 'items',
  itemFields: [
    { label: 'Material', value: (it) => it.particulars || it.material_name },
    { label: 'Quantity', value: (it) => `${it.quantity ?? '—'} ${it.unit || ''}` },
    { label: 'Remarks', value: (it) => it.remarks },
  ],
});
