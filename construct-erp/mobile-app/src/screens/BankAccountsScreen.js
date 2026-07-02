import makeListScreen from './generic/makeListScreen';
import { bankAccountsAPI } from '../api/client';

export default makeListScreen({
  title: 'Bank Accounts',
  icon: 'bank-outline',
  queryKey: 'bank-accounts-list',
  projectScoped: false,
  fetcher: () => bankAccountsAPI.list(),
  primary: (item) => item.account_name || item.bank_name || `Account #${item.id}`,
  secondary: (item) => item.account_number ? `A/C: ${item.account_number}` : null,
  meta: (item) => item.balance != null ? `Balance: ₹${Number(item.balance).toLocaleString('en-IN')}` : null,
});
