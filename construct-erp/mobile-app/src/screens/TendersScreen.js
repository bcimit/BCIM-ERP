import makeListScreen from './generic/makeListScreen';
import { tenderAPI } from '../api/client';

export default makeListScreen({
  title: 'Tender Register',
  icon: 'gavel',
  queryKey: 'tenders-list',
  projectScoped: false,
  fetcher: () => tenderAPI.list(),
  primary: (item) => item.tender_number || item.title || `Tender #${item.id}`,
  secondary: (item) => item.title || item.description,
  meta: (item) => item.due_date ? `Due: ${item.due_date}` : null,
  status: (item) => item.status,
});
