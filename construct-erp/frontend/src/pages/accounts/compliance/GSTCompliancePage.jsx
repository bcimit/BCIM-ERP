import React, { useState } from 'react';
import { IndianRupee, CheckCircle2, Clock, XCircle, Download, RefreshCw } from 'lucide-react';
import dayjs from 'dayjs';

const FY = 'FY 2025-26';
const TODAY = dayjs();

const inr = v => `₹${(+v || 0).toLocaleString('en-IN')}`;

const RETURNS = [];

const ITC = [];

function StatusPill({ filed, dueDate }) {
  if (filed) return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium"><CheckCircle2 className="w-3 h-3" />{dayjs(filed).format('DD MMM')}</span>;
  const diff = dayjs(dueDate).diff(TODAY, 'day');
  if (diff < 0) return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium"><XCircle className="w-3 h-3" />Overdue</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium"><Clock className="w-3 h-3" />{dayjs(dueDate).format('DD MMM')}</span>;
}

const TABS = ['Returns Tracker', 'ITC Reconciliation', 'GST Payments'];

export default function GSTCompliancePage() {
  const [tab, setTab] = useState('Returns Tracker');
  const totalTax = RETURNS.reduce((s, r) => s + r.toPay, 0);
  const totalTaxable = RETURNS.reduce((s, r) => s + r.taxable, 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-violet-50 flex items-center justify-center">
              <IndianRupee className="w-4 h-4 text-violet-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">GST Compliance</h1>
              <p className="text-xs text-slate-400">{FY} — GSTR filings, ITC reconciliation, GST payments</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-md hover:bg-slate-50">
              <RefreshCw className="w-3 h-3" /> Sync GST Portal
            </button>
            <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-md hover:bg-slate-50">
              <Download className="w-3 h-3" /> Export
            </button>
          </div>
        </div>

        {/* Summary KPIs */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: 'Total Taxable Value', value: inr(totalTaxable), sub: FY },
            { label: 'Total GST Paid',      value: inr(totalTax),     sub: 'CGST + SGST' },
            { label: 'ITC Available',       value: inr(ITC.reduce((s,r)=>s+r.available,0)), sub: 'From 2B reconciliation' },
            { label: 'Returns Filed',       value: `${RETURNS.filter(r=>r.gstr3bFiled).length}/${RETURNS.length}`, sub: 'GSTR-3B' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-base font-bold text-slate-800">{value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-slate-100">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-4 pb-8">
        {tab === 'Returns Tracker' && (
          <div className="bg-white border border-slate-200 rounded-md overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Month', 'GSTR-1 (Due 11th)', 'GSTR-3B (Due 20th)', 'Taxable Value', 'CGST', 'SGST', 'Net Tax Paid'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {RETURNS.map(r => (
                  <tr key={r.month} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800 whitespace-nowrap">{r.month}</td>
                    <td className="px-4 py-2.5"><StatusPill filed={r.gstr1Filed} dueDate={r.gstr1Due} /></td>
                    <td className="px-4 py-2.5"><StatusPill filed={r.gstr3bFiled} dueDate={r.gstr3bDue} /></td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{r.taxable ? inr(r.taxable) : '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{r.cgst ? inr(r.cgst) : '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{r.sgst ? inr(r.sgst) : '—'}</td>
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-800">{r.toPay ? inr(r.toPay) : '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td colSpan={3} className="px-4 py-2.5 text-sm text-slate-700">Total</td>
                  <td className="px-4 py-2.5 font-mono text-slate-800">{inr(totalTaxable)}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-800">{inr(RETURNS.reduce((s,r)=>s+r.cgst,0))}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-800">{inr(RETURNS.reduce((s,r)=>s+r.sgst,0))}</td>
                  <td className="px-4 py-2.5 font-mono text-slate-800">{inr(totalTax)}</td>
                </tr>
              </tfoot>
            </table>
            {RETURNS.length === 0 && <p className="px-4 py-10 text-sm text-slate-400 text-center">No GST returns tracked yet</p>}
          </div>
        )}

        {tab === 'ITC Reconciliation' && (
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 bg-amber-50">
              <p className="text-xs text-amber-700 font-medium">ITC as per GSTR-2B vs Books — reconcile mismatches before filing GSTR-3B</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Month', 'ITC in Books', 'ITC per GSTR-2B', 'Difference', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ITC.map(r => {
                  const diff = r.claimed - r.available;
                  return (
                    <tr key={r.month} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-medium text-slate-800">{r.month}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-700">{inr(r.claimed)}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-700">{inr(r.available)}</td>
                      <td className={`px-4 py-2.5 font-mono font-semibold ${diff !== 0 ? 'text-red-600' : 'text-emerald-700'}`}>
                        {diff !== 0 ? `(${inr(Math.abs(diff))})` : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        {diff === 0 ? <span className="text-[10px] px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full font-medium">Matched</span>
                          : diff > 0 ? <span className="text-[10px] px-2 py-0.5 bg-red-50 text-red-700 rounded-full font-medium">Excess claimed</span>
                          : <span className="text-[10px] px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full font-medium">Pending in 2B</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {ITC.length === 0 && <p className="px-4 py-10 text-sm text-slate-400 text-center">No ITC reconciliation data yet</p>}
          </div>
        )}

        {tab === 'GST Payments' && (
          <div className="bg-white border border-slate-200 rounded-md p-6 text-center">
            <IndianRupee className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 mb-1">GST Payment Challan History</p>
            <p className="text-xs text-slate-400">Track GST payments made via Challan — connect to GST portal API to auto-import</p>
          </div>
        )}
      </div>
    </div>
  );
}
