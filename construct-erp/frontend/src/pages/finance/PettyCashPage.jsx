import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Plus, X, Search, TrendingDown, TrendingUp, Wallet, FileText,
  ArrowRight, ChevronDown,
} from 'lucide-react';
import { pettyCashAPI, projectAPI } from '../../api/client';
import dayjs from 'dayjs';
import { clsx } from 'clsx';
import { PageHeader, KpiCard as ThemeKpiCard, Theme } from '../../theme';

const CATEGORIES = [
  'Transport & Travel',
  'Meals & Refreshments',
  'Printing & Stationery',
  'Communication',
  'Site Consumables',
  'Postage & Courier',
  'Miscellaneous',
];

const inr = v => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const EMPTY_FORM = {
  entry_type: 'expense', entry_date: '', category: '', description: '',
  amount: '', voucher_number: '', received_by: '', project_id: '',
};

function KpiCard({ label, value, icon: Icon, color = 'slate' }) {
  const C = {
    slate:   'text-slate-900 bg-slate-50 border-slate-200',
    red:     'text-red-600 bg-red-50 border-red-100',
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    amber:   'text-amber-600 bg-amber-50 border-amber-100',
  };
  return (
    <div className={`bg-white border rounded-xl p-4 flex items-center gap-3 ${C[color]}`}>
      {Icon && (
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${C[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      )}
      <div>
        <p className="text-[11px] text-slate-900 font-medium font-medium">{label}</p>
        <p className="text-lg font-medium mt-0.5 text-slate-800">{value}</p>
      </div>
    </div>
  );
}

const TAB_OPTS = [
  { key: 'all',           label: 'All Entries' },
  { key: 'expense',       label: 'Expenses' },
  { key: 'replenishment', label: 'Replenishments' },
];

export default function PettyCashPage() {
  const qc = useQueryClient();

  const [activeTab, setActiveTab]   = useState('all');
  const [projectId, setProjectId]   = useState('');
  const [fromDate, setFromDate]     = useState('');
  const [toDate, setToDate]         = useState('');
  const [search, setSearch]         = useState('');
  const [showModal, setShowModal]   = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);

  const queryParams = useMemo(() => ({
    ...(projectId ? { project_id: projectId } : {}),
    ...(fromDate  ? { from_date: fromDate }   : {}),
    ...(toDate    ? { to_date: toDate }        : {}),
  }), [projectId, fromDate, toDate]);

  const { data: projectsRes } = useQuery({ queryKey: ['projects-simple'], queryFn: () => projectAPI.list().then(r => r.data) });
  const { data: entriesRes, isFetching } = useQuery({
    queryKey: ['petty-cash', queryParams],
    queryFn: () => pettyCashAPI.list(queryParams).then(r => r.data),
  });
  const { data: summaryRes } = useQuery({
    queryKey: ['petty-cash-summary', queryParams],
    queryFn: () => pettyCashAPI.summary(queryParams).then(r => r.data),
  });

  const projects = Array.isArray(projectsRes) ? projectsRes : (projectsRes?.data ?? []);
  const entries  = Array.isArray(entriesRes?.data) ? entriesRes.data : [];
  const summary  = summaryRes?.data ?? summaryRes ?? {};

  const totalExpenses      = Number(summary.total_expenses || 0);
  const totalReplenishment = Number(summary.total_replenishment || 0);
  const balance            = totalReplenishment - totalExpenses;
  const expenseCount       = Number(summary.expense_count || 0);

  const filtered = useMemo(() => {
    let rows = entries;
    if (activeTab !== 'all') rows = rows.filter(e => e.entry_type === activeTab);
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(e =>
        (e.description || '').toLowerCase().includes(q) ||
        (e.category    || '').toLowerCase().includes(q) ||
        (e.voucher_number || '').toLowerCase().includes(q) ||
        (e.received_by || '').toLowerCase().includes(q)
      );
    }
    return rows;
  }, [entries, activeTab, search]);

  const tabCounts = useMemo(() => ({
    all:           entries.length,
    expense:       entries.filter(e => e.entry_type === 'expense').length,
    replenishment: entries.filter(e => e.entry_type === 'replenishment').length,
  }), [entries]);

  const createMut = useMutation({
    mutationFn: d => pettyCashAPI.create(d),
    onSuccess: () => {
      toast.success('Entry saved');
      qc.invalidateQueries({ queryKey: ['petty-cash'] });
      qc.invalidateQueries({ queryKey: ['petty-cash-summary'] });
      setShowModal(false);
      setForm(EMPTY_FORM);
    },
    onError: e => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: id => pettyCashAPI.delete(id),
    onSuccess: () => {
      toast.success('Deleted');
      qc.invalidateQueries({ queryKey: ['petty-cash'] });
      qc.invalidateQueries({ queryKey: ['petty-cash-summary'] });
    },
  });

  const canSubmit = !!form.project_id && !!form.entry_date && !!form.amount && Number(form.amount) > 0;

  return (
    <div style={{ background: Theme.pageBg, minHeight: '100vh' }}>

      <PageHeader
        title="Petty Cash"
        subtitle="Site cash box — expenses & replenishments"
        breadcrumbs={[{ label: 'Finance', href: '/finance' }, { label: 'Petty Cash' }]}
        actions={
          <button
            onClick={() => { setForm(EMPTY_FORM); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors shadow-sm"
            style={{ background: '#fff', color: Theme.navyDark, border: '1px solid rgba(255,255,255,0.4)' }}
          >
            <Plus className="w-4 h-4" /> New Entry
          </button>
        }
      />

      <div className="p-6 space-y-5 max-w-7xl mx-auto">

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <ThemeKpiCard icon={TrendingUp}   label="Total Replenishment"  value={inr(totalReplenishment)} color="emerald" />
        <ThemeKpiCard icon={TrendingDown} label="Total Expenses"        value={inr(totalExpenses)}       color="red"     />
        <ThemeKpiCard icon={Wallet}       label="Current Balance"       value={inr(balance)}             color={balance >= 0 ? 'emerald' : 'red'} />
        <ThemeKpiCard icon={FileText}     label="Vouchers Issued"        value={expenseCount}             color="amber"   />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-sm">
        <select
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white min-w-[180px]"
          value={projectId} onChange={e => setProjectId(e.target.value)}
        >
          <option value="">All Projects</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        <span className="text-slate-900 font-medium text-xs">to</span>
        <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400" />
        {(projectId || fromDate || toDate) && (
          <button onClick={() => { setProjectId(''); setFromDate(''); setToDate(''); }}
            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Clear</button>
        )}
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-indigo-400 bg-white w-56"
            placeholder="Search entries..."
            value={search} onChange={e => setSearch(e.target.value)}
          />
          {search && <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-3.5 h-3.5" /></button>}
        </div>
      </div>

      {/* Tabs + Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="flex items-center gap-1 px-4 pt-3 border-b border-slate-200">
          {TAB_OPTS.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={clsx('px-3 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap mr-1',
                activeTab === t.key ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-900 font-medium hover:text-slate-800')}>
              {t.label}
              <span className="ml-1.5 text-[10px] text-slate-400">({tabCounts[t.key] ?? 0})</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Date', 'Voucher #', 'Category', 'Description', 'Received By', 'Project', 'Type', 'Amount', ''].map((h, i) => (
                  <th key={i} className={clsx('px-4 py-3 text-[11px] font-medium text-slate-900 font-medium text-left whitespace-nowrap',
                    h === 'Amount' ? 'text-right' : '')}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isFetching && entries.length === 0 && (
                <tr><td colSpan={9} className="py-12 text-center text-sm text-slate-400">Loading…</td></tr>
              )}
              {!isFetching && filtered.length === 0 && (
                <tr><td colSpan={9} className="py-16 text-center text-sm text-slate-400">No petty cash entries found</td></tr>
              )}
              {filtered.map(e => {
                const isExp = e.entry_type === 'expense';
                return (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-xs text-slate-900 whitespace-nowrap">
                      {e.entry_date ? dayjs(e.entry_date).format('DD MMM YYYY') : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600 font-semibold">
                      {e.voucher_number || '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">{e.category || '—'}</td>
                    <td className="px-4 py-3 text-sm text-slate-900 font-medium max-w-[220px] truncate">{e.description || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{e.received_by || '—'}</td>
                    <td className="px-4 py-3 text-xs text-slate-900 font-medium whitespace-nowrap">{e.project_name}</td>
                    <td className="px-4 py-3">
                      <span className={clsx('px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide',
                        isExp ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-700 border border-emerald-100')}>
                        {isExp ? 'Expense' : 'Replenish'}
                      </span>
                    </td>
                    <td className={clsx('px-4 py-3 text-right font-mono font-medium text-sm',
                      isExp ? 'text-red-600' : 'text-emerald-600')}>
                      {isExp ? '−' : '+'}{inr(e.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { if (window.confirm('Delete this entry?')) deleteMut.mutate(e.id); }}
                        className="text-[11px] text-red-400 hover:text-red-600 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 border-t border-slate-200">
                  <td colSpan={7} className="px-4 py-3 text-xs font-medium text-slate-600">{filtered.length} entries</td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-slate-800">
                    {inr(filtered.reduce((s, e) => s + (e.entry_type === 'expense' ? -1 : 1) * Number(e.amount), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 bg-indigo-50 border border-indigo-200 rounded-lg flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-indigo-600" />
                </div>
                <h2 className="text-base font-medium text-slate-800">New Petty Cash Entry</h2>
              </div>
              <button onClick={() => setShowModal(false)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">

              {/* Entry type toggle */}
              <div>
                <p className="text-xs font-medium text-slate-900 font-medium uppercase tracking-wider mb-2">Entry Type</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'expense',       label: 'Expense',       desc: 'Cash paid out' },
                    { key: 'replenishment', label: 'Replenishment', desc: 'Cash received / top-up' },
                  ].map(({ key, label, desc }) => (
                    <button key={key} type="button"
                      onClick={() => setForm(f => ({ ...f, entry_type: key }))}
                      className={clsx('flex flex-col items-start p-3 rounded-xl border text-left transition-all',
                        form.entry_type === key
                          ? key === 'expense'
                            ? 'border-red-400 bg-red-50 ring-1 ring-red-200'
                            : 'border-emerald-400 bg-emerald-50 ring-1 ring-emerald-200'
                          : 'border-slate-200 hover:border-slate-300 bg-white')}>
                      <span className={clsx('text-xs font-bold',
                        form.entry_type === key ? (key === 'expense' ? 'text-red-700' : 'text-emerald-700') : 'text-slate-700')}>{label}</span>
                      <span className="text-[10px] text-slate-900 font-medium mt-0.5">{desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Project */}
              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1.5">Project *</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white"
                  value={form.project_id} onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                >
                  <option value="">Select project...</option>
                  {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-900 mb-1.5">Date *</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    value={form.entry_date} onChange={e => setForm(f => ({ ...f, entry_date: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-900 mb-1.5">Amount (₹) *</label>
                  <input type="number" placeholder="0" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono outline-none focus:border-indigo-400"
                    value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-900 mb-1.5">Category</label>
                  <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400 bg-white"
                    value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                    <option value="">— Select —</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-900 mb-1.5">Voucher #</label>
                  <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                    placeholder="PC-001" value={form.voucher_number} onChange={e => setForm(f => ({ ...f, voucher_number: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1.5">Description</label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="What was this for?" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-900 mb-1.5">Received By <span className="text-slate-900 font-medium font-normal">(for expenses)</span></label>
                <input className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
                  placeholder="Staff / vendor name" value={form.received_by} onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))} />
              </div>

              <div className="flex gap-3 pt-1 border-t border-slate-100">
                <button className="flex-1 py-2.5 border border-slate-200 text-slate-900 hover:bg-slate-50 text-sm font-medium rounded-lg"
                  onClick={() => setShowModal(false)}>Cancel</button>
                <button
                  className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2"
                  disabled={!canSubmit || createMut.isPending}
                  onClick={() => createMut.mutate(form)}
                >
                  {createMut.isPending ? 'Saving…' : <><ArrowRight className="w-4 h-4" /> Save Entry</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
