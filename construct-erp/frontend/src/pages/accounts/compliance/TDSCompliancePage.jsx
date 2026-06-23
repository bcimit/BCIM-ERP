import React, { useState } from 'react';
import { FileBarChart, CheckCircle2, Clock, XCircle, Download } from 'lucide-react';
import dayjs from 'dayjs';

const TODAY = dayjs();
const inr = v => `₹${(+v || 0).toLocaleString('en-IN')}`;

const TDS_SECTIONS = [
  { section: '194C', nature: 'Contractor Payments', rate: '1% / 2%', threshold: '₹30,000 / ₹1,00,000' },
  { section: '194I', nature: 'Rent (Equipment / Property)', rate: '2% / 10%', threshold: '₹2,40,000' },
  { section: '194J', nature: 'Professional / Technical Services', rate: '2% / 10%', threshold: '₹30,000' },
  { section: '194A', nature: 'Interest (other than securities)', rate: '10%', threshold: '₹40,000' },
  { section: '192B', nature: 'Salary', rate: 'Slab rate', threshold: 'Taxable salary' },
];

const DEPOSITS = [];

const RETURNS = [];

const TABS = ['TDS Deposits', 'TDS Returns', 'Sections Reference'];

function StatusPill({ paid, dueDate }) {
  if (paid) return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium"><CheckCircle2 className="w-3 h-3" />{dayjs(paid).format('DD MMM')}</span>;
  const diff = dayjs(dueDate).diff(TODAY, 'day');
  if (diff < 0) return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium"><XCircle className="w-3 h-3" />Overdue</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium"><Clock className="w-3 h-3" />{dayjs(dueDate).format('DD MMM')}</span>;
}

export default function TDSCompliancePage() {
  const [tab, setTab] = useState('TDS Deposits');
  const totalTDS = DEPOSITS.filter(d => d.paid).reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-blue-50 flex items-center justify-center">
              <FileBarChart className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">TDS Compliance</h1>
              <p className="text-xs text-slate-400">Monthly deposits, quarterly returns (26Q/24Q), Form 16/16A</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-md hover:bg-slate-50">
            <Download className="w-3 h-3" /> Export
          </button>
        </div>

        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: 'Total TDS Deposited', value: inr(totalTDS), sub: 'FY 2025-26 + Apr–May 2026' },
            { label: 'Returns Filed',        value: `${RETURNS.filter(r=>r.filed).length}/${RETURNS.length}`, sub: 'Form 26Q + 24Q' },
            { label: 'Form 16A Due',         value: '—', sub: 'No deposits tracked yet' },
            { label: 'Pending Deposit',      value: DEPOSITS.filter(d=>!d.paid).length || 'None', sub: 'All up to date' },
          ].map(({ label, value, sub }) => (
            <div key={label} className="bg-slate-50 border border-slate-200 rounded-md px-4 py-3">
              <p className="text-xs text-slate-500 mb-1">{label}</p>
              <p className="text-base font-bold text-slate-800">{value}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{sub}</p>
            </div>
          ))}
        </div>

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
        {tab === 'TDS Deposits' && (
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Month', 'TDS Amount', 'Due Date', 'Paid On', 'Challan No.', 'Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {DEPOSITS.map(d => (
                  <tr key={d.month} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{d.month}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{d.amount ? inr(d.amount) : '—'}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{dayjs(d.dueDate).format('DD MMM YYYY')}</td>
                    <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{d.paid ? dayjs(d.paid).format('DD MMM YYYY') : '—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{d.challanNo || '—'}</td>
                    <td className="px-4 py-2.5"><StatusPill paid={d.paid} dueDate={d.dueDate} /></td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                  <td className="px-4 py-2.5 text-sm text-slate-700">Total Deposited</td>
                  <td className="px-4 py-2.5 font-mono text-slate-800">{inr(totalTDS)}</td>
                  <td colSpan={4} />
                </tr>
              </tfoot>
            </table>
            {DEPOSITS.length === 0 && <p className="px-4 py-10 text-sm text-slate-400 text-center">No TDS deposits tracked yet</p>}
          </div>
        )}

        {tab === 'TDS Returns' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    {['Form', 'Quarter', 'Deductees', 'Due Date', 'Filed On', 'Ack No.', 'Status'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {RETURNS.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5"><span className="text-[11px] px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">{r.form}</span></td>
                      <td className="px-4 py-2.5 text-slate-700">{r.quarter}</td>
                      <td className="px-4 py-2.5 text-slate-600">{r.deductees || '—'}</td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{dayjs(r.dueDate).format('DD MMM YYYY')}</td>
                      <td className="px-4 py-2.5 text-slate-600 whitespace-nowrap">{r.filed ? dayjs(r.filed).format('DD MMM YYYY') : '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.ackNo || '—'}</td>
                      <td className="px-4 py-2.5"><StatusPill paid={r.filed} dueDate={r.dueDate} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {RETURNS.length === 0 && <p className="px-4 py-10 text-sm text-slate-400 text-center">No TDS returns tracked yet</p>}
            </div>
            <div className="bg-blue-50 border border-blue-100 rounded-md px-4 py-3 text-sm text-blue-700">
              Form 16A must be generated and issued to vendors within 15 days of the TDS return due date. Form 16 for employees is due by 15 June following the financial year.
            </div>
          </div>
        )}

        {tab === 'Sections Reference' && (
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Section', 'Nature of Payment', 'Rate', 'Threshold'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {TDS_SECTIONS.map(s => (
                  <tr key={s.section} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5"><span className="text-[11px] px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-mono">{s.section}</span></td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{s.nature}</td>
                    <td className="px-4 py-2.5 text-slate-700 font-mono text-xs">{s.rate}</td>
                    <td className="px-4 py-2.5 text-slate-500 text-xs">{s.threshold}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
