// src/pages/qs/BOQBudgetBreakdownPage.jsx — Master-detail BOQ budget allocation
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import {
  Percent, IndianRupee, AlertTriangle, ChevronRight, ChevronDown,
  Search, Layers, CheckCircle2, Wallet,
} from 'lucide-react';
import { PageHeader, KpiCard as ThemeKpiCard, Theme } from '../../theme';
import { boqBudgetAPI, projectAPI } from '../../api/client';

const inr  = (v) => `₹${(parseFloat(v) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const inr2 = (v) => `₹${(parseFloat(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const num  = (v) => parseFloat(v) || 0;

// ─── Inline editable budget cell ──────────────────────────────────────────────
function EditableBudget({ value, onSave, mode, itemAmount }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  const commit = () => {
    setEditing(false);
    const newVal = parseFloat(val || 0);
    if (mode === 'amount' && itemAmount && newVal > itemAmount + 0.01) {
      toast.error(`Cannot exceed item amount: ${inr(itemAmount)}`);
      return;
    }
    if (parseFloat(val || 0) !== parseFloat(value || 0)) onSave(newVal);
  };

  if (editing) return (
    <input
      autoFocus type="number" value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      className="w-28 border border-indigo-400 rounded-lg px-2 py-1 text-xs text-right focus:outline-none focus:ring-2 focus:ring-indigo-200"
    />
  );

  return (
    <button
      onClick={() => { setVal(value ?? ''); setEditing(true); }}
      className="w-28 text-right text-xs font-semibold hover:bg-indigo-50 rounded-lg px-2 py-1 transition border border-transparent hover:border-indigo-200"
    >
      {value ? (mode === 'pct' ? `${parseFloat(value).toFixed(1)}%` : inr(value))
             : <span className="text-slate-300 italic font-normal">set budget</span>}
    </button>
  );
}

// ─── Cost-head detail table (shown when a BOQ item is expanded) ────────────────
function CostHeadDetail({ item, costHeads, mode, onSave }) {
  const itemAmount = num(item.amount);

  // Split rows into "active" (has budget or actuals) and "empty" for clarity
  const rows = costHeads.map(h => {
    const cell = item.breakdown?.[h] || {};
    const budget   = num(cell.amount);
    const advance  = num(cell.advance);
    const invoiced = num(cell.invoiced);
    const spent    = advance + invoiced;
    const balance  = budget - spent;
    const over     = spent > budget + 0.01;
    const active   = budget > 0 || spent > 0;
    return { h, cell, budget, advance, invoiced, spent, balance, over, active };
  });
  const active = rows.filter(r => r.active);
  const empty  = rows.filter(r => !r.active);

  const Row = ({ r, dim }) => (
    <tr className={clsx('border-b border-slate-100', dim && 'opacity-60', r.over && 'bg-rose-50/40')}>
      <td className="px-3 py-2 font-medium text-slate-700">{r.h}</td>
      <td className="px-3 py-2 text-right">
        <EditableBudget
          value={mode === 'pct' ? r.cell.pct : r.cell.amount}
          mode={mode} itemAmount={itemAmount}
          onSave={v => onSave(item, r.h, mode, v)}
        />
      </td>
      <td className="px-3 py-2 text-right text-purple-600 font-medium">
        {r.advance > 0 ? inr(r.advance) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-3 py-2 text-right text-emerald-600 font-medium">
        {r.invoiced > 0 ? inr(r.invoiced) : <span className="text-slate-300">—</span>}
      </td>
      <td className="px-3 py-2 text-right font-semibold text-slate-700">
        {r.spent > 0 ? inr(r.spent) : <span className="text-slate-300">—</span>}
      </td>
      <td className={clsx('px-3 py-2 text-right font-bold', r.balance < 0 ? 'text-rose-600' : r.budget > 0 ? 'text-emerald-600' : 'text-slate-300')}>
        {r.budget > 0 || r.spent > 0 ? inr(r.balance) : '—'}
        {r.over && <div className="text-[9px] text-rose-500 font-bold">⚠ over budget</div>}
      </td>
    </tr>
  );

  return (
    <div className="bg-slate-50 px-4 py-4">
      <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-slate-200 text-[10px] uppercase tracking-wide text-slate-500 font-bold">
              <th className="px-3 py-2 text-left">Cost Head</th>
              <th className="px-3 py-2 text-right">Budget</th>
              <th className="px-3 py-2 text-right text-purple-500">Advance</th>
              <th className="px-3 py-2 text-right text-emerald-600">Invoiced</th>
              <th className="px-3 py-2 text-right">Spent</th>
              <th className="px-3 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {active.map(r => <Row key={r.h} r={r} dim={false} />)}
            {active.length > 0 && empty.length > 0 && (
              <tr><td colSpan={6} className="px-3 py-1.5 bg-slate-50 text-[10px] uppercase tracking-wide text-slate-400 font-bold">Unallocated cost heads</td></tr>
            )}
            {empty.map(r => <Row key={r.h} r={r} dim />)}
          </tbody>
        </table>
      </div>
      {num(item.unallocated_actual) > 0 && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <AlertTriangle size={13} />
          <span className="font-semibold">{inr(item.unallocated_actual)}</span> of actual spend isn't tagged to any cost head.
        </div>
      )}
    </div>
  );
}

export default function BOQBudgetBreakdownPage() {
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState('amount'); // 'amount' | 'pct'
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState({});
  const qc = useQueryClient();

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectAPI.list().then(r => {
      const d = r?.data;
      if (Array.isArray(d)) return d;
      if (d?.data) return d.data;
      return [];
    }).catch(() => []),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['boq-budget', projectId],
    queryFn: () => boqBudgetAPI.list(projectId).then(r => r.data).catch(() => ({ data: [], cost_heads: [] })),
    enabled: !!projectId,
  });

  const allItems = data?.data || [];
  const costHeads = data?.cost_heads || [];

  const updateMutation = useMutation({
    mutationFn: ({ boqItemId, entries }) => boqBudgetAPI.updateItem(boqItemId, entries),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['boq-budget', projectId] });
      if (res?.data?.over_budget) toast.error('Breakdown exceeds BOQ item amount');
      else toast.success('Saved');
    },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to save'),
  });

  const saveCell = (item, costHead, field, value) => {
    const entry = { cost_head: costHead };
    entry[field] = value;
    updateMutation.mutate({ boqItemId: item.id, entries: [entry] });
  };

  // Per-item rollups
  const items = useMemo(() => {
    return allItems
      .filter(it => !search ||
        [it.item_no, it.description].some(v => v?.toLowerCase().includes(search.toLowerCase())))
      .map(it => {
        let budgeted = 0, advance = 0, invoiced = 0;
        for (const h of costHeads) {
          const c = it.breakdown?.[h] || {};
          budgeted += num(c.amount);
          advance  += num(c.advance);
          invoiced += num(c.invoiced);
        }
        const spent = advance + invoiced;
        const amount = num(it.amount);
        return {
          ...it, amount, budgeted, advance, invoiced, spent,
          balance: budgeted - spent,
          over: budgeted > amount + 0.01,
          allocated: budgeted > 0,
        };
      });
  }, [allItems, costHeads, search]);

  const totals = useMemo(() => items.reduce((t, it) => ({
    boq:      t.boq + it.amount,
    budgeted: t.budgeted + it.budgeted,
    advance:  t.advance + it.advance,
    invoiced: t.invoiced + it.invoiced,
    spent:    t.spent + it.spent,
    balance:  t.balance + it.balance,
    allocated: t.allocated + (it.allocated ? 1 : 0),
  }), { boq: 0, budgeted: 0, advance: 0, invoiced: 0, spent: 0, balance: 0, allocated: 0 }), [items]);

  const toggle = (id) => setExpanded(e => ({ ...e, [id]: !e[id] }));

  return (
    <div style={{ background: Theme.pageBg, minHeight: '100vh' }}>
      <PageHeader
        title="BOQ Budget Breakdown"
        subtitle="Allocate each BOQ item's budget across cost heads and track advance, invoiced & balance"
        breadcrumbs={[{ label: 'QS & Billing' }, { label: 'Budget Breakdown' }]}
        actions={
          <button
            onClick={() => setMode(mode === 'amount' ? 'pct' : 'amount')}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg transition"
            style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}
            title="Toggle budget entry mode">
            {mode === 'amount' ? <IndianRupee className="w-3.5 h-3.5" /> : <Percent className="w-3.5 h-3.5" />}
            Enter as {mode === 'amount' ? 'Amount' : 'Percent'}
          </button>
        }
      />

      <div className="p-5 md:p-6 max-w-[1400px] mx-auto space-y-5">

        {/* Project selector + search */}
        <div className="flex flex-wrap gap-3">
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm shadow-sm focus:outline-none min-w-64">
            <option value="">— Select Project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {projectId && (
            <div className="relative flex-1 min-w-52">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search BOQ items…"
                className="pl-9 pr-3 py-2 border border-slate-200 bg-white rounded-xl text-sm w-full focus:outline-none shadow-sm" />
            </div>
          )}
        </div>

        {!projectId && (
          <div className="bg-white rounded-2xl border border-slate-200 py-20 text-center shadow-sm">
            <Layers className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-semibold">Select a project to view its budget breakdown</p>
            <p className="text-xs text-slate-400 mt-1">Allocate each BOQ item's budget across cost heads</p>
          </div>
        )}

        {projectId && isLoading && (
          <div className="space-y-2">{[1, 2, 3].map(n => <div key={n} className="h-14 bg-white border border-slate-200 rounded-xl animate-pulse" />)}</div>
        )}

        {projectId && !isLoading && (
          <>
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <ThemeKpiCard icon={IndianRupee} label="BOQ Value"     value={inr(totals.boq)}      color="blue"    sub="Total contract value" />
              <ThemeKpiCard icon={Wallet}      label="Budgeted"      value={inr(totals.budgeted)} color="indigo"  sub={`${totals.allocated}/${items.length} items allocated`} />
              <ThemeKpiCard icon={IndianRupee} label="Advance Paid"  value={inr(totals.advance)}  color="purple"  sub="Paid to vendors" />
              <ThemeKpiCard icon={IndianRupee} label="Invoiced"      value={inr(totals.invoiced)} color="emerald" sub="Billed actuals" />
              <ThemeKpiCard icon={CheckCircle2} label="Budget Balance" value={inr(totals.balance)} color={totals.balance >= 0 ? 'teal' : 'red'} sub="Budget minus spent" />
            </div>

            {/* Master list */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Column header */}
              <div className="grid grid-cols-[auto_90px_1fr_repeat(5,minmax(0,1fr))_90px] gap-2 items-center px-4 py-3 bg-slate-100 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <span className="w-4" />
                <span>Item No</span>
                <span>Description</span>
                <span className="text-right">BOQ Value</span>
                <span className="text-right">Budgeted</span>
                <span className="text-right text-purple-500">Advance</span>
                <span className="text-right text-emerald-600">Invoiced</span>
                <span className="text-right">Balance</span>
                <span className="text-right">Status</span>
              </div>

              <div className="divide-y divide-slate-100">
                {items.map(item => {
                  const isOpen = expanded[item.id];
                  return (
                    <div key={item.id}>
                      {/* Summary row */}
                      <button onClick={() => toggle(item.id)}
                        className={clsx('w-full grid grid-cols-[auto_90px_1fr_repeat(5,minmax(0,1fr))_90px] gap-2 items-center px-4 py-3 text-xs text-left hover:bg-slate-50 transition',
                          isOpen && 'bg-indigo-50/40')}>
                        <span className="w-4 text-slate-400">
                          {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </span>
                        <span className="font-mono font-bold text-indigo-700 truncate">{item.item_no}</span>
                        <span className="text-slate-700 font-medium truncate pr-2" title={item.description}>{item.description}</span>
                        <span className="text-right font-semibold text-slate-800">{inr(item.amount)}</span>
                        <span className={clsx('text-right font-semibold', item.over ? 'text-rose-600' : item.allocated ? 'text-indigo-700' : 'text-slate-300')}>
                          {item.budgeted > 0 ? inr(item.budgeted) : '—'}
                        </span>
                        <span className="text-right font-medium text-purple-600">{item.advance > 0 ? inr(item.advance) : <span className="text-slate-300">—</span>}</span>
                        <span className="text-right font-medium text-emerald-600">{item.invoiced > 0 ? inr(item.invoiced) : <span className="text-slate-300">—</span>}</span>
                        <span className={clsx('text-right font-bold', item.balance < 0 ? 'text-rose-600' : item.allocated ? 'text-emerald-600' : 'text-slate-300')}>
                          {item.allocated || item.spent > 0 ? inr(item.balance) : '—'}
                        </span>
                        <span className="text-right">
                          {!item.allocated
                            ? <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Not set</span>
                            : item.over
                              ? <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full"><AlertTriangle size={10} /> Over</span>
                              : <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">OK</span>}
                        </span>
                      </button>

                      {/* Detail */}
                      {isOpen && <CostHeadDetail item={item} costHeads={costHeads} mode={mode} onSave={saveCell} />}
                    </div>
                  );
                })}

                {items.length === 0 && (
                  <div className="text-center py-16 text-slate-400 text-sm">
                    {search ? 'No BOQ items match your search.' : 'No BOQ items found for this project.'}
                  </div>
                )}
              </div>

              {/* Grand total footer */}
              {items.length > 0 && (
                <div className="grid grid-cols-[auto_90px_1fr_repeat(5,minmax(0,1fr))_90px] gap-2 items-center px-4 py-3 bg-slate-900 text-xs">
                  <span className="w-4" />
                  <span className="font-bold text-white uppercase tracking-wide col-span-2">Grand Total</span>
                  <span className="text-right font-bold text-white">{inr(totals.boq)}</span>
                  <span className="text-right font-bold text-indigo-300">{inr(totals.budgeted)}</span>
                  <span className="text-right font-bold text-purple-300">{inr(totals.advance)}</span>
                  <span className="text-right font-bold text-emerald-300">{inr(totals.invoiced)}</span>
                  <span className={clsx('text-right font-bold', totals.balance < 0 ? 'text-rose-400' : 'text-emerald-300')}>{inr(totals.balance)}</span>
                  <span />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
