import makeListScreen from './generic/makeListScreen';
import { storeLedgerAPI } from '../api/client';

export default makeListScreen({
  title: 'Store Ledger',
  icon: 'book-open-outline',
  queryKey: 'store-ledger-list',
  fetcher: (projectId) => storeLedgerAPI.list(projectId),
  primary: (item) => item.material_name || item.name,
  secondary: (item) => item.unit ? `Unit: ${item.unit}` : null,
  meta: (item) => `Qty: ${item.quantity ?? item.stock_qty ?? 0}`,
});
