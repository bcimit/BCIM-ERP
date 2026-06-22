// src/pages/qs/BOQBudgetBreakdownPage.jsx
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clsx } from 'clsx';
import toast from 'react-hot-toast';
import { Percent, IndianRupee, AlertTriangle } from 'lucide-react';
import { boqBudgetAPI, projectAPI } from '../../api/client';

const inr = (v) => `₹${(parseFloat(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function EditableCell({ value, onSave, mode }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? '');

  const commit = () => {
    setEditing(false);
    if (parseFloat(val || 0) !== parseFloat(value || 0)) onSave(parseFloat(val) || 0);
  };

  if (editing) return (
    <input
      autoFocus
      type="number"
      value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
      className="w-20 border border-blue-400 rounded px-1 py-0.5 text-xs text-right focus:outline-none"
    />
  );

  return (
    <button
      onClick={() => { setVal(value ?? ''); setEditing(true); }}
      className="w-20 text-right text-xs hover:bg-blue-50 rounded px-1 py-0.5"
    >
      {value ? (mode === 'pct' ? `${parseFloat(value).toFixed(1)}%` : inr(value)) : <span className="text-slate-400 italic">—</span>}
    </button>
  );
}

export default function BOQBudgetBreakdownPage() {
  const [projectId, setProjectId] = useState('');
  const [mode, setMode] = useState('amount'); // 'amount' | 'pct' — which field is primary edit
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

  const items = data?.data || [];
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

  const totals = useMemo(() => {
    const t = {};
    const ta = {};
    for (const h of costHeads) { t[h] = 0; ta[h] = 0; }
    let grand = 0;
    let grandActual = 0;
    let unallocated = 0;
    for (const item of items) {
      for (const h of costHeads) {
        const v = item.breakdown?.[h]?.amount || 0;
        const a = item.breakdown?.[h]?.actual || 0;
        t[h] += v;
        ta[h] += a;
        grand += v;
        grandActual += a;
      }
      unallocated += item.unallocated_actual || 0;
    }
    return { byHead: t, byHeadActual: ta, grand, grandActual, unallocated };
  }, [items, costHeads]);

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">BOQ Budget Breakdown</h1>
          <p className="text-sm text-slate-500">Allocate each BOQ item's budget across cost sub-headings</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={projectId}
            onChange={e => setProjectId(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">Select project…</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button
            onClick={() => setMode(mode === 'amount' ? 'pct' : 'amount')}
            className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
            title="Toggle entry mode"
          >
            {mode === 'amount' ? <IndianRupee size={14} /> : <Percent size={14} />}
            {mode === 'amount' ? 'Amount' : 'Percent'}
          </button>
        </div>
      </div>

      {!projectId && (
        <div className="text-center text-slate-400 py-20 text-sm">Select a project to view its BOQ items.</div>
      )}

      {projectId && isLoading && (
        <div className="text-center text-slate-400 py-20 text-sm">Loading…</div>
      )}

      {projectId && !isLoading && (
        <div className="overflow-x-auto border border-slate-200 rounded-xl">
          <table className="min-w-full text-xs">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-slate-600 sticky left-0 bg-slate-50">Item No</th>
                <th className="px-3 py-2 text-left font-medium text-slate-600 min-w-[220px]">Description</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Amount</th>
                {costHeads.map(h => (
                  <th key={h} className="px-3 py-2 text-right font-medium text-slate-600 whitespace-nowrap">{h}</th>
                ))}
                <th className="px-3 py-2 text-right font-medium text-amber-600 whitespace-nowrap">Unallocated</th>
                <th className="px-3 py-2 text-right font-medium text-slate-600">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.map(item => {
                const itemTotal = costHeads.reduce((s, h) => s + (item.breakdown?.[h]?.amount || 0), 0);
                const over = itemTotal > parseFloat(item.amount || 0) + 0.01;
                return (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-3 py-2 sticky left-0 bg-white">{item.item_no}</td>
                    <td className="px-3 py-2">{item.description}</td>
                    <td className="px-3 py-2 text-right font-medium">{inr(item.amount)}</td>
                    {costHeads.map(h => {
                      const cell = item.breakdown?.[h] || {};
                      const actual = cell.actual || 0;
                      const budgetAmt = cell.amount || 0;
                      const overActual = actual > budgetAmt + 0.01;
                      return (
                        <td key={h} className="px-1 py-1">
                          <EditableCell
                            value={mode === 'pct' ? cell.pct : cell.amount}
                            mode={mode}
                            onSave={v => saveCell(item, h, mode, v)}
                          />
                          {actual > 0 && (
                            <div className={clsx('text-[10px] text-right pr-1', overActual ? 'text-rose-500' : 'text-emerald-600')}>
                              Actual: {inr(actual)}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    <td className="px-3 py-2 text-right text-amber-600">
                      {item.unallocated_actual > 0 ? inr(item.unallocated_actual) : <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {over
                        ? <span className="inline-flex items-center gap-1 text-rose-600"><AlertTriangle size={12} /> Over</span>
                        : <span className="text-emerald-600">OK</span>}
                    </td>
                  </tr>
                );
              })}

              {items.length === 0 && (
                <tr><td colSpan={costHeads.length + 5} className="text-center py-12 text-slate-400">No BOQ items found for this project.</td></tr>
              )}
            </tbody>
            {items.length > 0 && (
              <tfoot className="bg-slate-50 font-medium">
                <tr>
                  <td className="px-3 py-2 sticky left-0 bg-slate-50" colSpan={2}>Total</td>
                  <td className="px-3 py-2 text-right">
                    {inr(items.reduce((s, i) => s + parseFloat(i.amount || 0), 0))}
                  </td>
                  {costHeads.map(h => (
                    <td key={h} className="px-3 py-2 text-right">
                      {inr(totals.byHead[h])}
                      {totals.byHeadActual[h] > 0 && (
                        <div className="text-[10px] text-emerald-600 font-normal">Actual: {inr(totals.byHeadActual[h])}</div>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right text-amber-600">{totals.unallocated > 0 ? inr(totals.unallocated) : '—'}</td>
                  <td className="px-3 py-2 text-right">{inr(totals.grand)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </div>
  );
}
