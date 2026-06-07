import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { projectAPI, budgetAPI } from '../../api/client';
import * as XLSX from 'xlsx';
import { Download, AlertTriangle, CheckCircle } from 'lucide-react';

const inr = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (a, b) => (b > 0 ? ((a / b) * 100).toFixed(1) : '—');

function KPICard({ label, value, sub, color = 'text-slate-800' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-900 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-medium ${color}`}>₹{inr(value)}</p>
      {sub && <p className="text-xs text-slate-900 font-medium mt-0.5">{sub}</p>}
    </div>
  );
}

function UtilBar({ used, budget }) {
  const p = budget > 0 ? Math.min(120, (used / budget) * 100) : 0;
  const over = p > 100;
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-28 relative">
      <div
        className={`h-full rounded-full transition-all ${over ? 'bg-red-500' : p > 80 ? 'bg-amber-400' : 'bg-emerald-400'}`}
        style={{ width: `${Math.min(100, p)}%` }}
      />
    </div>
  );
}

export default function TQSCostReportPage() {
  const [projectId, setProjectId] = useState('');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectAPI.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? d?.projects ?? []); }),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ['cost-report-commitment', projectId],
    queryFn: () => projectId
      ? budgetAPI.commitment({ project_id: projectId }).then(r => r.data?.data ?? [])
      : Promise.resolve([]),
    staleTime: 60000,
    enabled: !!projectId,
  });

  const rows = data ?? [];

  const kpis = useMemo(() => rows.reduce((acc, r) => {
    const budget = parseFloat(r.budgeted || 0);
    const committed = parseFloat(r.committed || 0);
    return {
      budget:    acc.budget    + budget,
      committed: acc.committed + committed,
      paid:      acc.paid      + parseFloat(r.actual || 0),
      variance:  acc.variance  + (budget - committed),
    };
  }, { budget: 0, committed: 0, paid: 0, variance: 0 }), [rows]);

  const exportExcel = () => {
    const headers = [
      'Cost Head', 'Budget (₹)', 'Committed/POs (₹)', 'Billed-DQS (₹)', 'Paid (₹)',
      'Utilization %', 'Variance vs Budget (₹)',
    ];
    const wsData = [
      headers,
      ...rows.map(r => {
        const budget = parseFloat(r.budgeted || 0);
        const committed = parseFloat(r.committed || 0);
        return [
          r.cost_head,
          budget,
          committed,
          parseFloat(r.actual || 0),
          parseFloat(r.actual || 0),
          pct(committed, budget),
          budget - committed,
        ];
      }),
      [],
      ['TOTALS', kpis.budget, kpis.committed, '', kpis.paid, '', kpis.variance],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map((_, i) => ({ wch: i === 0 ? 30 : 18 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cost Report');
    XLSX.writeFile(wb, `Cost_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium text-slate-900">Cost Report by Cost Head</h1>
          <p className="text-sm text-slate-900 font-medium mt-0.5">Budget vs committed (POs) vs actual paid — per trade / cost head</p>
        </div>
        <button onClick={exportExcel} disabled={!projectId || rows.length === 0}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl">
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>

      {/* Project selector — required */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <label className="text-xs font-medium text-slate-900 font-medium uppercase tracking-wide mb-2 block">Select Project</label>
        <select value={projectId} onChange={e => setProjectId(e.target.value)}
          className="text-sm border border-slate-200 rounded-xl px-3 py-2 min-w-64 focus:outline-none focus:ring-2 focus:ring-blue-400">
          <option value="">— Choose a project —</option>
          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {projectId && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KPICard label="Total Budget"    value={kpis.budget}    />
            <KPICard label="Committed (POs)" value={kpis.committed} color="text-blue-700"
              sub={`${pct(kpis.committed, kpis.budget)}% of budget`} />
            <KPICard label="Paid (DQS)"      value={kpis.paid}      color="text-emerald-600" />
            <KPICard label="Budget Variance"
              value={Math.abs(kpis.variance)}
              color={kpis.variance >= 0 ? 'text-emerald-600' : 'text-red-600'}
              sub={kpis.variance >= 0 ? 'Under budget' : 'Over budget'} />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
            {isLoading ? (
              <div className="py-16 text-center text-slate-900 font-medium text-sm animate-pulse">Loading cost data…</div>
            ) : isError ? (
              <div className="py-16 text-center text-red-400 text-sm">Failed to load cost data</div>
            ) : rows.length === 0 ? (
              <div className="py-16 text-center text-slate-900 font-medium text-sm">No budget or PO data for this project</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-white text-[11px] font-medium uppercase tracking-wide">
                      <th className="px-4 py-3 text-left">Cost Head</th>
                      <th className="px-4 py-3 text-right">Budget</th>
                      <th className="px-4 py-3 text-right bg-blue-900/40">Committed (POs)</th>
                      <th className="px-4 py-3 text-right bg-amber-900/40">Billed (DQS)</th>
                      <th className="px-4 py-3 text-right bg-emerald-900/40">Paid</th>
                      <th className="px-4 py-3 text-center">Utilization</th>
                      <th className="px-4 py-3 text-right bg-indigo-900/30">Variance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map((r, i) => {
                      const budget = parseFloat(r.budgeted || 0);
                      const committed = parseFloat(r.committed || 0);
                      const actual = parseFloat(r.actual || 0);
                      const variance = budget - committed;
                      const utilPct = pct(committed, budget);
                      const over = budget > 0 && committed > budget;
                      const unbudgeted = budget === 0 && committed > 0;
                      return (
                        <tr key={i} className={`hover:bg-slate-50 transition-colors ${unbudgeted ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            <div className="flex items-center gap-2">
                              {unbudgeted && (
                                <span className="text-[9px] bg-rose-100 text-rose-600 font-medium px-1.5 py-0.5 rounded-full uppercase">Unbudgeted</span>
                              )}
                              {r.cost_head || 'Unknown'}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-medium text-slate-700">
                            {budget > 0 ? `₹${inr(budget)}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-blue-700 font-medium bg-blue-50/30">
                            {committed > 0 ? `₹${inr(committed)}` : '—'}
                            {r.po_count > 0 && <span className="ml-1 text-[10px] text-slate-400">({r.po_count} PO{r.po_count > 1 ? 's' : ''})</span>}
                          </td>
                          <td className="px-4 py-2.5 text-right text-amber-700 bg-amber-50/30">
                            {actual > 0 ? `₹${inr(actual)}` : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right text-emerald-700 font-medium bg-emerald-50/30">
                            {actual > 0 ? `₹${inr(actual)}` : '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex items-center justify-center gap-2">
                              <UtilBar used={committed} budget={budget} />
                              <span className={`text-[10px] font-medium ${over ? 'text-red-600' : 'text-slate-500'}`}>
                                {utilPct}%
                              </span>
                            </div>
                          </td>
                          <td className={`px-4 py-2.5 text-right font-medium ${variance >= 0 ? 'text-emerald-600 bg-emerald-50/20' : 'text-red-600 bg-red-50/30'}`}>
                            <div className="flex items-center justify-end gap-1">
                              {variance < 0
                                ? <AlertTriangle className="w-3 h-3 shrink-0" />
                                : budget > 0 ? <CheckCircle className="w-3 h-3 shrink-0" /> : null}
                              {budget > 0 ? (variance >= 0 ? '+' : '') + `₹${inr(Math.abs(variance))}` : '—'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-slate-800 text-white font-medium text-[11px]">
                      <td className="px-4 py-2.5 text-left">TOTAL ({rows.length} cost heads)</td>
                      <td className="px-4 py-2.5 text-right">₹{inr(kpis.budget)}</td>
                      <td className="px-4 py-2.5 text-right text-blue-200">₹{inr(kpis.committed)}</td>
                      <td className="px-4 py-2.5" />
                      <td className="px-4 py-2.5 text-right text-emerald-300">₹{inr(kpis.paid)}</td>
                      <td />
                      <td className={`px-4 py-2.5 text-right ${kpis.variance >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                        {kpis.variance >= 0 ? '+' : ''}₹{inr(Math.abs(kpis.variance))}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!projectId && (
        <div className="bg-white rounded-2xl border border-slate-100 py-20 text-center shadow-sm">
          <p className="text-slate-900 font-medium text-sm">Select a project above to view the cost report</p>
        </div>
      )}
    </div>
  );
}
