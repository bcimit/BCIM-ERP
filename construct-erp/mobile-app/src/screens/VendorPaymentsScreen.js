import makeListScreen from './generic/makeListScreen';
import { vendorPaymentsAPI } from '../api/client';

export default makeListScreen({
  title: 'Vendor Payments',
  icon: 'wallet-outline',
  queryKey: 'vendor-payments-list',
  fetcher: (projectId) => vendorPaymentsAPI.list(projectId),
  primary: (item) => item.payment_number || `Payment #${item.id}`,
  secondary: (item) => item.vendor_name,
  meta: (item) => item.amount != null ? `₹${Number(item.amount).toLocaleString('en-IN')}` : null,
  status: (item) => item.status,
});
