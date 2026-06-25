// src/pages/accounts/ChartOfAccountsPage.jsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';
import {
  BookOpen, Plus, Search, X, Sparkles, Trash2, Pencil,
  ChevronDown, ChevronRight, Scale, TrendingUp, TrendingDown,
  Wallet, Landmark, PiggyBank, ArrowDownLeft, ArrowUpRight,
} from 'lucide-react';
import { chartOfAccountsAPI, projectAPI } from '../../api/client';
import { inr } from '../dashboards/DashKPI';

const TYPES = ['asset', 'liability', 'equity', 'income', 'expense'];

// Display metadata per account type. `nature` = the side that increases the account.
const TYPE_META = {
  asset:     { label: 'Assets',      nature: 'Dr', icon: Wallet,    badge: 'bg-blue-50 text-blue-600 border-blue-100',       bar: 'bg-blue-500',    text: 'text-blue-600',    soft: 'bg-blue-50' },
  liability: { label: 'Liabilities', nature: 'Cr', icon: Landmark,  badge: 'bg-amber-50 text-amber-600 border-amber-100',     bar: 'bg-amber-500',   text: 'text-amber-600',   soft: 'bg-amber-50' },
  equity:    { label: 'Equity',      nature: 'Cr', icon: PiggyBank, badge: 'bg-purple-50 text-purple-600 border-purple-100',  bar: 'bg-purple-500',  text: 'text-purple-600',  soft: 'bg-purple-50' },
  income:    { label: 'Income',      nature: 'Cr', icon: ArrowDownLeft,  badge: 'bg-emerald-50 text-emerald-600 border-emerald-100', bar: 'bg-emerald-500', text: 'text-emerald-600', soft: 'bg-emerald-50' },
  expense:   { label: 'Expenses',    nature: 'Dr', icon: ArrowUpRight,   badge: 'bg-red-50 text-red-600 border-red-100',         bar: 'bg-red-500',     text: 'text-red-600',     soft: 'bg-red-50' },
};

const F = 'w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white';
const EMPTY = { code: '', name: '', account_type: 'asset', sub_type: '', opening_balance: '' };

// Show a signed natural balance as |amount| + Dr/Cr nature.
function balanceParts(account) {
  const bal = Number(account.balance || 0);
  const natural = TYPE_META[account.account_type]?.nature || 'Dr';
  const side = bal >= 0 ? natural : (natural === 'Dr' ? 'Cr' : 'Dr');
  return { amount: Math.abs(bal), side };
}

/* ── Create / Edit modal ─────────────────────────────────────────────────── */
function AccountModal({ initial, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!initial?.id;
  const [form, setForm] = useState(isEdit ? {
    code: initial.code, name: initial.name, account_type: initial.account_type,
    sub_type: initial.sub_type || '', opening_balance: initial.opening_balance || '',
  } : { ...EMPTY });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const saveMut = useMutation({
    mutationFn: () => isEdit
      ? chartOfAccountsAPI.update(initial.id, form).then(r => r.data)
      : chartOfAccountsAPI.create(form).then(r => r.data),
    onSuccess: () => {
      toast.success(isEdit ? 'Account updated' : 'Account created');
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      onClose();
    },
    onError: e => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-xl border border-slate-200 shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-800">{isEdit ? 'Edit Account' : 'New Account'}</p>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Code</label>
              <input className={clsx(F, 'font-mono')} value={form.code} onChange={e => set('code', e.target.value)} placeholder="1000" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Account Type</label>
              <select className={F} value={form.account_type} onChange={e => set('account_type', e.target.value)}>
                {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Account Name</label>
            <input className={F} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Cash in Hand" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Sub-Type</label>
              <input className={F} value={form.sub_type} onChange={e => set('sub_type', e.target.value)} placeholder="Current Asset" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Opening Balance (₹)</label>
              <input type="number" step="0.01" className={F} value={form.opening_balance} onChange={e => set('opening_balance', e.target.value)} />
            </div>
          </div>
          <p className="text-[11px] text-slate-400">
            {TYPE_META[form.account_type]?.nature === 'Dr'
              ? 'Debit-natured: increases with debits (assets & expenses).'
              : 'Credit-natured: increases with credits (liabilities, equity & income).'}
          </p>
        </div>
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">Cancel</button>
          <button onClick={() => {
              if (!form.code.trim() || !form.name.trim()) return toast.error('Code and Name are required');
              saveMut.mutate();
            }}
            disabled={saveMut.isPending}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
            {saveMut.isPending ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Ledger drill-down drawer ────────────────────────────────────────────── */
function LedgerDrawer({ account, projectId, onClose }) {
  const meta = TYPE_META[account.account_type];
  const { data, isLoading } = useQuery({
    queryKey: ['coa-txns', account.id, projectId],
    queryFn: () => chartOfAccountsAPI.transactions(account.id, { project_id: projectId || undefined }).then(r => r.data?.data),
  });
  const txns = data?.transactions ?? [];

  return (
    <div className="fixed inset-0 z-[65] flex justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-slate-500">{account.code}</span>
              <span className={clsx('px-2 py-0.5 rounded-full text-[10px] font-medium border', meta.badge)}>{meta.label}</span>
            </div>
            <h2 className="text-lg font-semibold text-slate-800 mt-1">{account.name}</h2>
            {account.sub_type && <p className="text-xs text-slate-400">{account.sub_type}</p>}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>

        {/* Balance summary */}
        <div className="grid grid-cols-3 divide-x divide-slate-100 border-b border-slate-100">
          {[
            ['Opening', data?.opening_balance],
            ['Movements', txns.length, true],
            ['Closing', data?.closing_balance],
          ].map(([label, val, isCount]) => (
            <div key={label} className="px-6 py-3">
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-sm font-semibold font-mono text-slate-800 mt-0.5">
                {isCount ? `${val} ${val === 1 ? 'entry' : 'entries'}` : `₹${inr(val || 0)}`}
              </p>
            </div>
          ))}
        </div>

        {/* Ledger table */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex justify-center py-16"><div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" /></div>
          ) : txns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
              <BookOpen className="w-9 h-9 opacity-20" />
              <p className="text-sm">No posted transactions{projectId ? ' for this project' : ''}.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b border-slate-100">
                <tr className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                  <th className="px-4 py-2.5 text-left">Date</th>
                  <th className="px-4 py-2.5 text-left">Entry / Narration</th>
                  <th className="px-3 py-2.5 text-right">Debit</th>
                  <th className="px-3 py-2.5 text-right">Credit</th>
                  <th className="px-4 py-2.5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {txns.map(t => (
                  <tr key={t.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">{t.entry_date ? new Date(t.entry_date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-2.5">
                      <div className="font-mono text-[11px] text-slate-400">{t.entry_no}</div>
                      <div className="text-slate-700 text-xs">{t.description || t.narration || '—'}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700">{Number(t.debit) ? inr(t.debit) : '—'}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-slate-700">{Number(t.credit) ? inr(t.credit) : '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-semibold text-slate-800">{inr(t.running_balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Account row ─────────────────────────────────────────────────────────── */
function AccountRow({ a, onOpen, onEdit, onDelete }) {
  const { amount, side } = balanceParts(a);
  return (
    <tr className="hover:bg-slate-50 group">
      <td className="pl-10 pr-4 py-2.5 font-mono text-xs text-slate-500">{a.code}</td>
      <td className="px-4 py-2.5">
        <button onClick={() => onOpen(a)} className="font-medium text-slate-800 hover:text-blue-600 text-left">{a.name}</button>
      </td>
      <td className="px-4 py-2.5 text-slate-500 text-xs">{a.sub_type || '—'}</td>
      <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-400">{Number(a.opening_balance) ? inr(a.opening_balance) : '—'}</td>
      <td className="px-4 py-2.5 text-right">
        <button onClick={() => onOpen(a)} className="font-mono font-semibold text-slate-800 hover:text-blue-600">
          ₹{inr(amount)} <span className="text-[10px] font-medium text-slate-400">{side}</span>
        </button>
      </td>
      <td className="px-4 py-2.5 text-right whitespace-nowrap">
        <button onClick={() => onEdit(a)} className="text-slate-300 group-hover:text-blue-600 mr-2"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={() => onDelete(a)} className="text-slate-300 group-hover:text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
      </td>
    </tr>
  );
}

/* ── Opening Balances bulk-edit modal ────────────────────────────────────── */
function OpeningBalancesModal({ accounts, onClose }) {
  const qc = useQueryClient();
  const [vals, setVals] = useState(() => {
    const m = {};
    accounts.forEach(a => { m[a.code] = a.opening_balance != null ? String(a.opening_balance) : ''; });
    return m;
  });

  const saveMut = useMutation({
    mutationFn: () => {
      const balances = Object.entries(vals)
        .filter(([, v]) => v !== '' && !isNaN(parseFloat(v)))
        .map(([code, v]) => ({ code, opening_balance: parseFloat(v) }));
      return chartOfAccountsAPI.setOpeningBalances(balances).then(r => r.data);
    },
    onSuccess: d => {
      toast.success(`Updated opening balances for ${d.updated} account(s)`);
      qc.invalidateQueries({ queryKey: ['chart-of-accounts'] });
      onClose();
    },
    onError: e => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  const byType = useMemo(() => {
    const m = {};
    accounts.forEach(a => { (m[a.account_type] = m[a.account_type] || []).push(a); });
    return m;
  }, [accounts]);

  return (
    <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl border border-slate-200 shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <p className="text-sm font-semibold text-slate-800">Set Opening Balances</p>
            <p className="text-xs text-slate-400 mt-0.5">Enter your trial balance figures as of your accounting start date</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-4 h-4" /></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {TYPES.filter(t => byType[t]?.length).map(t => {
            const m = TYPE_META[t];
            return (
              <div key={t}>
                <p className={clsx('text-xs font-semibold uppercase tracking-wide mb-2', m.text)}>{m.label} — {m.nature}-natured</p>
                <div className="grid grid-cols-1 gap-1.5">
                  {(byType[t] || []).map(a => (
                    <div key={a.code} className="flex items-center gap-3">
                      <span className="font-mono text-xs text-slate-400 w-12 shrink-0">{a.code}</span>
                      <span className="text-sm text-slate-700 flex-1 truncate">{a.name}</span>
                      <input
                        type="number" step="0.01" placeholder="0.00"
                        className="w-36 border border-slate-200 rounded px-2 py-1 text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-200"
                        value={vals[a.code] ?? ''}
                        onChange={e => setVals(v => ({ ...v, [a.code]: e.target.value }))}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-slate-50/60">
          <p className="text-xs text-slate-400">Blank fields are skipped. Enter Dr-side amounts as positive, Cr-side as negative if contra.</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50">Cancel</button>
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
              className="px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {saveMut.isPending ? 'Saving…' : 'Save Opening Balances'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function ChartOfAccountsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [modal, setModal] = useState(null);     // null | {} | account
  const [drill, setDrill] = useState(null);      // account being viewed
  const [collapsed, setCollapsed] = useState({}); // { [type]: true }
  const [obModal, setObModal] = useState(false);  // opening balances
  const qc = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['coa-projects'],
    queryFn: () => projectAPI.list().then(r => r.data?.data ?? r.data ?? []),
    staleTime: 5 * 60 * 1000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ['chart-of-accounts', typeFilter, search, projectFilter],
    queryFn: () => chartOfAccountsAPI.list({ account_type: typeFilter || undefined, search: search || undefined, project_id: projectFilter || undefined }).then(r => r.data),
  });
  const rows = data?.data ?? [];

  const seedMut = useMutation({
    mutationFn: () => chartOfAccountsAPI.seed().then(r => r.data),
    onSuccess: (d) => { toast.success(`Seeded ${d?.data?.length ?? ''} standard accounts`); qc.invalidateQueries({ queryKey: ['chart-of-accounts'] }); },
    onError: e => toast.error(e?.response?.data?.error || 'Seed failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => chartOfAccountsAPI.remove(id),
    onSuccess: () => { toast.success('Account deleted'); qc.invalidateQueries({ queryKey: ['chart-of-accounts'] }); },
    onError: e => toast.error(e?.response?.data?.error || 'Delete failed'),
  });

  // Totals per type (natural balance)
  const totals = useMemo(() => {
    const t = { asset: 0, liability: 0, equity: 0, income: 0, expense: 0 };
    rows.forEach(r => { t[r.account_type] = (t[r.account_type] || 0) + Number(r.balance || 0); });
    return t;
  }, [rows]);

  const counts = useMemo(() => {
    const c = { asset: 0, liability: 0, equity: 0, income: 0, expense: 0 };
    rows.forEach(r => { c[r.account_type] = (c[r.account_type] || 0) + 1; });
    return c;
  }, [rows]);

  const netIncome = (totals.income || 0) - (totals.expense || 0);
  // Assets = Liabilities + Equity + (Income − Expense)
  const lhs = totals.asset || 0;
  const rhs = (totals.liability || 0) + (totals.equity || 0) + netIncome;
  const diff = lhs - rhs;
  const balanced = Math.abs(diff) < 1;

  // Group accounts by type → sub_type
  const grouped = useMemo(() => {
    return TYPES
      .map(type => {
        const accts = rows.filter(r => r.account_type === type);
        if (!accts.length) return null;
        const subMap = {};
        accts.forEach(a => {
          const k = a.sub_type || 'Other';
          (subMap[k] = subMap[k] || []).push(a);
        });
        const subGroups = Object.entries(subMap)
          .map(([sub, items]) => ({ sub, items, subtotal: items.reduce((s, a) => s + Number(a.balance || 0), 0) }))
          .sort((a, b) => a.sub.localeCompare(b.sub));
        return { type, accts, subGroups, total: totals[type], count: accts.length };
      })
      .filter(Boolean);
  }, [rows, totals]);

  const allCollapsed = grouped.length > 0 && grouped.every(g => collapsed[g.type]);
  const toggleAll = () => {
    if (allCollapsed) setCollapsed({});
    else setCollapsed(Object.fromEntries(TYPES.map(t => [t, true])));
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Chart of Accounts</h1>
              <p className="text-xs text-slate-400">Ledger accounts grouped by type — click any account to see its entries</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {rows.length === 0 && !isLoading && (
              <button onClick={() => seedMut.mutate()} disabled={seedMut.isPending}
                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-blue-200 text-blue-600 rounded-md hover:bg-blue-50 disabled:opacity-50">
                <Sparkles className="w-4 h-4" /> {seedMut.isPending ? 'Seeding…' : 'Seed Standard COA'}
              </button>
            )}
            {rows.length > 0 && (
              <button onClick={() => setObModal(true)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm border border-slate-200 text-slate-600 rounded-md hover:bg-slate-50">
                <Scale className="w-4 h-4" /> Opening Balances
              </button>
            )}
            <button onClick={() => setModal({})}
              className="flex items-center gap-1.5 px-4 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
              <Plus className="w-4 h-4" /> New Account
            </button>
          </div>
        </div>
      </div>

      {/* Summary cards */}
      <div className="px-6 pt-5 grid grid-cols-2 md:grid-cols-5 gap-3">
        {TYPES.map(t => {
          const m = TYPE_META[t];
          const Icon = m.icon;
          return (
            <button key={t} onClick={() => setTypeFilter(typeFilter === t ? '' : t)}
              className={clsx('bg-white border rounded-xl p-4 text-left transition-all hover:shadow-sm',
                typeFilter === t ? 'border-blue-300 ring-2 ring-blue-100' : 'border-slate-200')}>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{m.label}</span>
                <Icon className={clsx('w-4 h-4', m.text)} />
              </div>
              <div className="text-lg font-semibold text-slate-800 mt-1.5 font-mono">₹{inr(totals[t] || 0)}</div>
              <div className="text-[11px] text-slate-400 mt-0.5">{counts[t] || 0} account{counts[t] !== 1 ? 's' : ''} · {m.nature} balance</div>
            </button>
          );
        })}
      </div>

      {/* Accounting equation strip */}
      {rows.length > 0 && !projectFilter && (
        <div className="px-6 pt-3">
          <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center gap-x-6 gap-y-2">
            <div className="flex items-center gap-2">
              <Scale className={clsx('w-4 h-4', balanced ? 'text-emerald-500' : 'text-amber-500')} />
              <span className="text-xs font-semibold text-slate-600">Accounting Equation</span>
            </div>
            <div className="flex items-center gap-2 text-sm font-mono">
              <span className="text-blue-600">Assets ₹{inr(lhs)}</span>
              <span className="text-slate-300">=</span>
              <span className="text-amber-600">Liab ₹{inr(totals.liability || 0)}</span>
              <span className="text-slate-300">+</span>
              <span className="text-purple-600">Equity ₹{inr(totals.equity || 0)}</span>
              <span className="text-slate-300">+</span>
              <span className={clsx(netIncome >= 0 ? 'text-emerald-600' : 'text-red-600')}>Net Income ₹{inr(netIncome)}</span>
            </div>
            <div className="ml-auto flex items-center gap-3">
              <span className="flex items-center gap-1 text-xs">
                {netIncome >= 0 ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
                <span className="text-slate-400">Income ₹{inr(totals.income || 0)} − Expense ₹{inr(totals.expense || 0)}</span>
              </span>
              <span className={clsx('px-2.5 py-1 rounded-full text-[11px] font-medium border',
                balanced ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100')}>
                {balanced ? 'Balanced' : `Off by ₹${inr(Math.abs(diff))}`}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="px-6 pt-4 pb-3 flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input className="pl-8 pr-3 py-2 text-sm border border-slate-200 rounded-md bg-white w-56 focus:outline-none focus:ring-2 focus:ring-blue-200"
            placeholder="Search code or name…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{TYPE_META[t].label}</option>)}
        </select>
        <select className="border border-slate-200 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200"
          value={projectFilter} onChange={e => setProjectFilter(e.target.value)}>
          <option value="">All Projects (company-wide)</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.project_code ? `${p.project_code} — ` : ''}{p.name}</option>)}
        </select>
        {grouped.length > 0 && (
          <button onClick={toggleAll} className="text-xs text-slate-500 hover:text-blue-600 px-2 py-2">
            {allCollapsed ? 'Expand all' : 'Collapse all'}
          </button>
        )}
        <span className="ml-auto text-xs text-slate-400">{rows.length} account{rows.length !== 1 ? 's' : ''}</span>
      </div>
      {projectFilter && (
        <div className="px-6 pb-2">
          <p className="text-[11px] text-amber-600 bg-amber-50 border border-amber-100 rounded-md px-3 py-1.5 inline-block">
            Project view — balances reflect only this project's posted entries; company-wide opening balances are excluded.
          </p>
        </div>
      )}

      {/* Grouped accounts */}
      <div className="px-6 pb-12 space-y-4">
        {isLoading ? (
          <div className="bg-white border border-slate-200 rounded-xl flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-xl flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <BookOpen className="w-10 h-10 opacity-20" />
            <p className="text-sm font-medium">No accounts {search || typeFilter ? 'match your filters' : 'yet'}</p>
            {!search && !typeFilter && <button onClick={() => seedMut.mutate()} className="text-sm text-blue-600 hover:underline">Seed the standard Chart of Accounts</button>}
          </div>
        ) : (
          grouped.map(g => {
            const m = TYPE_META[g.type];
            const Icon = m.icon;
            const isCollapsed = collapsed[g.type];
            return (
              <div key={g.type} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
                {/* Section header */}
                <button onClick={() => setCollapsed(c => ({ ...c, [g.type]: !c[g.type] }))}
                  className="w-full flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 hover:bg-slate-50/60">
                  <span className={clsx('w-1.5 h-6 rounded-full', m.bar)} />
                  {isCollapsed ? <ChevronRight className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  <Icon className={clsx('w-4 h-4', m.text)} />
                  <span className="font-semibold text-slate-800 text-sm">{m.label}</span>
                  <span className="text-[11px] text-slate-400">{g.count} account{g.count !== 1 ? 's' : ''}</span>
                  <span className="ml-auto font-mono font-semibold text-slate-800">₹{inr(g.total)}</span>
                  <span className="text-[10px] font-medium text-slate-400 w-5 text-right">{m.nature}</span>
                </button>

                {!isCollapsed && (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 text-[10px] font-medium uppercase tracking-wider text-slate-400">
                        <th className="pl-10 pr-4 py-2 text-left w-24">Code</th>
                        <th className="px-4 py-2 text-left">Account</th>
                        <th className="px-4 py-2 text-left w-40">Sub-Type</th>
                        <th className="px-4 py-2 text-right w-32">Opening</th>
                        <th className="px-4 py-2 text-right w-40">Balance</th>
                        <th className="px-4 py-2 w-20" />
                      </tr>
                    </thead>
                    <tbody>
                      {g.subGroups.map(sg => (
                        <React.Fragment key={sg.sub}>
                          <tr className="bg-slate-50/40">
                            <td colSpan={4} className="pl-10 pr-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{sg.sub}</td>
                            <td className="px-4 py-1.5 text-right font-mono text-[11px] text-slate-400">₹{inr(sg.subtotal)}</td>
                            <td />
                          </tr>
                          {sg.items.map(a => (
                            <AccountRow key={a.id} a={a}
                              onOpen={setDrill}
                              onEdit={setModal}
                              onDelete={(acc) => { if (window.confirm(`Delete account ${acc.code} — ${acc.name}?`)) deleteMut.mutate(acc.id); }} />
                          ))}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            );
          })
        )}
      </div>

      {modal !== null && <AccountModal initial={modal.id ? modal : null} onClose={() => setModal(null)} />}
      {drill && <LedgerDrawer account={drill} projectId={projectFilter} onClose={() => setDrill(null)} />}
      {obModal && <OpeningBalancesModal accounts={rows} onClose={() => setObModal(false)} />}
    </div>
  );
}
