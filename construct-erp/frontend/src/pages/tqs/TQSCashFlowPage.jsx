import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { tqsBillsAPI, projectAPI } from '../../api/client';
import * as XLSX from 'xlsx';
import { Download, X } from 'lucide-react';

const inr = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 100) : 0);

// India Financial Year: Apr 1 – Mar 31
function thisFY() {
  const now = new Date();
  const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
  return { from: `${yr}-04-01`, to: `${yr + 1}-03-31` };
}
function lastNMonths(n) {
  const to = new Date();
  const from = new Date();
  from.setMonth(from.getMonth() - n + 1);
  from.setDate(1);
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  };
}
function thisMonth() {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

function KPICard({ label, value, sub, sub2, color = 'text-slate-800' }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-xl font-semibold ${color}`}>₹{inr(value)}</p>
      {sub  && <p className="text-[11px] text-slate-500 mt-0.5">{sub}</p>}
      {sub2 && <p className="text-[11px] text-slate-400 mt-0.5">{sub2}</p>}
    </div>
  );
}

function Bar({ value, max, color }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-2 bg-slate-100 rounded-full overflow-hidden w-24">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${w}%` }} />
    </div>
  );
}

export default function TQSCashFlowPage() {
  const [projectId, setProjectId] = useState('');
  const [fromDate, setFromDate]   = useState('');
  const [toDate,   setToDate]     = useState('');

  const setPreset = (preset) => {
    setFromDate(preset.from);
    setToDate(preset.to);
  };
  const clearFilters = () => { setProjectId(''); setFromDate(''); setToDate(''); };

  const { data: projects = [] } = useQuery({
    queryKey: ['projects-list'],
    queryFn: () => projectAPI.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? d?.projects ?? []); }),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['tqs-bills', 'cash-flow', projectId, fromDate, toDate],
    queryFn: () => tqsBillsAPI.cashFlow({
      project_id: projectId || undefined,
      from_date:  fromDate  || undefined,
      to_date:    toDate    || undefined,
    }).then(r => r.data),
    staleTime: 0,
  });

  const rows    = data?.data    ?? [];
  const summary = data?.summary ?? {};

  const rowsWithCumulative = useMemo(() => {
    let cumPaid = 0;
    return rows.map(r => {
      cumPaid += parseFloat(r.paid || 0);
      return { ...r, cum_paid: cumPaid };
    });
  }, [rows]);

  // Consistent base for Paid %
  const totalBase = parseFloat(summary.total_paid||0) + parseFloat(summary.in_process||0) + parseFloat(summary.total_pending||0);

  const exportExcel = () => {
    const headers = [
      'Month', 'Bills', 'Gross Billed', 'GST', 'Total Billed',
      'Paid', 'In-Process', 'Pending', 'Net Payable (Unpaid)',
      'Retention Held', 'Advance Recovered', 'Deductions', 'Cumulative Paid',
    ];
    let cumPaid = 0;
    const wsData = [
      headers,
      ...rows.map(r => {
        cumPaid += parseFloat(r.paid || 0);
        return [
          r.month_label, r.bill_count,
          parseFloat(r.gross_billed || 0), parseFloat(r.gst_amount || 0), parseFloat(r.total_billed || 0),
          parseFloat(r.paid || 0), parseFloat(r.in_process || 0), parseFloat(r.pending || 0),
          parseFloat(r.net_payable || 0), parseFloat(r.retention_held || 0),
          parseFloat(r.advance_recovered || 0), parseFloat(r.total_deductions || 0), cumPaid,
        ];
      }),
      [],
      ['TOTALS', summary.total_bills || 0, '', '', parseFloat(summary.total_billed || 0),
        parseFloat(summary.total_paid || 0), parseFloat(summary.in_process || 0),
        parseFloat(summary.total_pending || 0), parseFloat(summary.total_net_payable || 0),
        parseFloat(summary.total_retention || 0), '', parseFloat(summary.total_deductions || 0),
        parseFloat(summary.total_paid || 0)],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = headers.map((_, i) => ({ wch: i === 0 ? 14 : 16 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Cash Flow');
    XLSX.writeFile(wb, `Cash_Flow_Forecast_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const hasFilters = projectId || fromDate || toDate;

  return (
    <div className="p-6 space-y-5 max-w-screen-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Cash Flow Forecast</h1>
          <p className="text-sm text-slate-500 mt-0.5">Monthly billing, payment and outstanding summary from Bill Tracker</p>
        </div>
        <button onClick={exportExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Download className="w-4 h-4" /> Export Excel
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <KPICard label="Total Billed"
          value={summary.total_billed}
          sub={`${summary.total_bills || 0} bills`} />
        <KPICard label="Paid"
          value={summary.total_paid}
          color="text-emerald-600"
          sub={`${pct(summary.total_paid, totalBase)}% of total`}
          sub2={summary.paid_count ? `${summary.paid_count} bills` : undefined} />
        <KPICard label="In-Process"
          value={summary.in_process}
          color="text-blue-600"
          sub="Stores → QS → Accounts"
          sub2={summary.in_process_count ? `${summary.in_process_count} bills` : undefined} />
        <KPICard label="Pending"
          value={summary.total_pending}
          color="text-amber-600"
          sub="Not yet forwarded"
          sub2={summary.pending_count ? `${summary.pending_count} bills` : undefined} />
        <KPICard label="Outstanding"
          value={parseFloat(summary.total_pending || 0) + parseFloat(summary.in_process || 0)}
          color="text-red-600"
          sub={`Net payable: ₹${inr(summary.total_net_payable)}`}
          sub2={summary.total_retention > 0 ? `Retention: ₹${inr(summary.total_retention)}` : undefined} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          {/* Quick presets */}
          <span className="text-[11px] text-slate-400 font-medium uppercase tracking-wide mr-1">Quick:</span>
          {[
            { label: 'This Month',  fn: thisMonth },
            { label: 'Last 3M',     fn: () => lastNMonths(3) },
            { label: 'Last 6M',     fn: () => lastNMonths(6) },
            { label: 'This FY',     fn: thisFY },
          ].map(({ label, fn }) => (
            <button key={label} onClick={() => setPreset(fn())}
              className="text-xs px-3 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-blue-300 hover:text-blue-600 transition-colors">
              {label}
            </button>
          ))}
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 text-xs px-3 py-1 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors ml-1">
              <X className="w-3 h-3" /> Clear
            </button>
          )}
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
            <option value="">All Projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
          <span className="text-slate-400 text-xs">to</span>
          <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
            className="text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 text-sm animate-pulse">Loading cash flow data…</div>
        ) : rowsWithCumulative.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">No billing data found for the selected filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-800 text-white text-[11px] font-medium uppercase tracking-wide">
                  <th className="px-4 py-3 text-left">Month</th>
                  <th className="px-4 py-3 text-center">Bills</th>
                  <th className="px-4 py-3 text-right">Total Billed</th>
                  <th className="px-4 py-3 text-right bg-amber-900/40">Pending</th>
                  <th className="px-4 py-3 text-right bg-blue-900/40">In-Process</th>
                  <th className="px-4 py-3 text-right bg-emerald-900/40">Paid</th>
                  <th className="px-4 py-3 text-right bg-rose-900/30">Deductions</th>
                  <th className="px-4 py-3 text-right bg-indigo-900/30">Net Payable</th>
                  <th className="px-4 py-3 text-right">Cumul. Paid</th>
                  <th className="px-4 py-3 text-left">Paid %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rowsWithCumulative.map((r, i) => {
                  const rowBase = parseFloat(r.paid||0) + parseFloat(r.in_process||0) + parseFloat(r.pending||0);
                  const billPct = pct(parseFloat(r.paid || 0), rowBase);
                  return (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{r.month_label}</td>
                      <td className="px-4 py-2.5 text-center text-slate-500">{r.bill_count}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-800">₹{inr(r.total_billed)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-700 bg-amber-50/40">
                        {parseFloat(r.pending) > 0 ? `₹${inr(r.pending)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-blue-700 bg-blue-50/40">
                        {parseFloat(r.in_process) > 0 ? `₹${inr(r.in_process)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-emerald-700 font-medium bg-emerald-50/40">
                        {parseFloat(r.paid) > 0 ? `₹${inr(r.paid)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-rose-600 bg-rose-50/30">
                        {parseFloat(r.total_deductions) > 0 ? `₹${inr(r.total_deductions)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right text-indigo-700 font-medium bg-indigo-50/30">
                        {parseFloat(r.net_payable) > 0 ? `₹${inr(r.net_payable)}` : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-slate-600">₹{inr(r.cum_paid)}</td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <Bar value={parseFloat(r.paid || 0)} max={rowBase}
                            color={billPct >= 80 ? 'bg-emerald-400' : billPct >= 40 ? 'bg-amber-400' : 'bg-red-400'} />
                          <span className={`font-medium text-[10px] ${billPct >= 80 ? 'text-emerald-700' : billPct >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                            {billPct}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-800 text-white font-medium text-[11px]">
                  <td className="px-4 py-2.5 text-left">TOTAL ({rowsWithCumulative.length} months)</td>
                  <td className="px-4 py-2.5 text-center">{summary.total_bills}</td>
                  <td className="px-4 py-2.5 text-right">₹{inr(summary.total_billed)}</td>
                  <td className="px-4 py-2.5 text-right text-amber-300">₹{inr(summary.total_pending)}</td>
                  <td className="px-4 py-2.5 text-right text-blue-300">₹{inr(summary.in_process)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-300">₹{inr(summary.total_paid)}</td>
                  <td className="px-4 py-2.5 text-right text-rose-300">₹{inr(summary.total_deductions)}</td>
                  <td className="px-4 py-2.5 text-right text-indigo-300">₹{inr(summary.total_net_payable)}</td>
                  <td className="px-4 py-2.5 text-right text-emerald-300">₹{inr(summary.total_paid)}</td>
                  <td className="px-4 py-2.5 text-right text-slate-300">
                    {pct(summary.total_paid, totalBase)}%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
