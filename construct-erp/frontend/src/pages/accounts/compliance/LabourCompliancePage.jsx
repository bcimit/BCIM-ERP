import React, { useState } from 'react';
import { Users, CheckCircle2, Clock, XCircle, Download, AlertTriangle } from 'lucide-react';
import dayjs from 'dayjs';

const TODAY = dayjs();
const inr = v => `₹${(+v || 0).toLocaleString('en-IN')}`;

const EMPLOYEES = 0;
const WAGES_MAY = 0;

const PF_RATE = { employee: 0.12, employer_epf: 0.0367, employer_eps: 0.0833, employer_edli: 0.005, admin: 0.005 };
const ESI_RATE = { employee: 0.0075, employer: 0.0325 };

const PF_EMP = Math.round(WAGES_MAY * PF_RATE.employee);
const PF_ER  = Math.round(WAGES_MAY * (PF_RATE.employer_epf + PF_RATE.employer_eps));
const PF_EDL = Math.round(WAGES_MAY * PF_RATE.employer_edli);
const PF_ADM = Math.round(WAGES_MAY * PF_RATE.admin);
const ESI_EMP = Math.round(WAGES_MAY * ESI_RATE.employee);
const ESI_ER  = Math.round(WAGES_MAY * ESI_RATE.employer);

const MONTHS = [];

const TABS = ['Monthly Summary', 'PF Detail', 'ESI Detail', 'Prof. Tax & LWF'];

function Pill({ paid, dueDate }) {
  if (paid) return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium"><CheckCircle2 className="w-3 h-3" />{dayjs(paid).format('DD MMM')}</span>;
  if (!dueDate) return <span className="text-[10px] text-slate-400">—</span>;
  const diff = dayjs(dueDate).diff(TODAY, 'day');
  if (diff < 0) return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium"><XCircle className="w-3 h-3" />Overdue</span>;
  return <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium"><Clock className="w-3 h-3" />{dayjs(dueDate).format('DD MMM')}</span>;
}

export default function LabourCompliancePage() {
  const [tab, setTab] = useState('Monthly Summary');

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-teal-50 flex items-center justify-center">
              <Users className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800">Labour Law Compliance</h1>
              <p className="text-xs text-slate-400">PF (EPF/EPS), ESI, Professional Tax, Labour Welfare Fund</p>
            </div>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-600 text-xs rounded-md hover:bg-slate-50">
            <Download className="w-3 h-3" /> Export ECR
          </button>
        </div>

        {/* KPIs */}
        <div className="mt-4 grid grid-cols-4 gap-3">
          {[
            { label: 'Total Employees',    value: EMPLOYEES,            sub: 'PF + ESI enrolled' },
            { label: 'PF (this month)',     value: inr(PF_EMP+PF_ER+PF_EDL+PF_ADM), sub: 'Employee + Employer + Admin' },
            { label: 'ESI (this month)',    value: inr(ESI_EMP+ESI_ER), sub: 'Employee 0.75% + Employer 3.25%' },
            { label: 'Prof. Tax',           value: '—',                sub: 'Due 20th of every month' },
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
        {tab === 'Monthly Summary' && (
          <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {['Month', 'PF Amount', 'PF Status', 'ESI Amount', 'ESI Status', 'PT / LWF', 'PT Status'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {MONTHS.map(m => (
                  <tr key={m.month} className="hover:bg-slate-50">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{m.month}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{inr(m.pfAmount)}</td>
                    <td className="px-4 py-2.5"><Pill paid={m.pfPaid} dueDate={m.pfDue} /></td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{inr(m.esiAmount)}</td>
                    <td className="px-4 py-2.5"><Pill paid={m.esiPaid} dueDate={m.esiDue} /></td>
                    <td className="px-4 py-2.5 font-mono text-slate-700">{m.ptAmount ? inr(m.ptAmount) : m.ptNote}</td>
                    <td className="px-4 py-2.5"><Pill paid={m.ptPaid} dueDate={m.ptDue} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {MONTHS.length === 0 && <p className="px-4 py-10 text-sm text-slate-400 text-center">No labour compliance data tracked yet</p>}
          </div>
        )}

        {tab === 'PF Detail' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-md p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">PF Breakdown ({EMPLOYEES} employees)</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Employee Contribution (12% of Basic)', value: inr(PF_EMP) },
                  { label: 'Employer EPF (3.67%)',                 value: inr(Math.round(WAGES_MAY * PF_RATE.employer_epf)) },
                  { label: 'Employer EPS (8.33%)',                 value: inr(Math.round(WAGES_MAY * PF_RATE.employer_eps)) },
                  { label: 'EDLI Contribution (0.5%)',             value: inr(PF_EDL) },
                  { label: 'Admin Charges (0.5%)',                 value: inr(PF_ADM) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-mono font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
                <div className="col-span-2 flex items-center justify-between bg-blue-50 rounded-md px-4 py-2.5">
                  <span className="font-semibold text-blue-800">Total PF Challan</span>
                  <span className="font-mono font-bold text-blue-900 text-base">{inr(PF_EMP + PF_ER + PF_EDL + PF_ADM)}</span>
                </div>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 flex items-start gap-2 text-sm text-amber-700">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>ECR (Electronic Challan cum Return) must be uploaded on EPFO Unified Portal before depositing. Wages above ₹15,000/month — employee can opt out of PF. Construction workers — ensure labour contractor's workmen are covered under BCIM's PF code.</span>
            </div>
          </div>
        )}

        {tab === 'ESI Detail' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-md p-5">
              <h3 className="text-sm font-semibold text-slate-700 mb-4">ESI Breakdown (Wages ≤ ₹21,000/month covered)</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {[
                  { label: 'Employee Contribution (0.75%)', value: inr(ESI_EMP) },
                  { label: 'Employer Contribution (3.25%)', value: inr(ESI_ER) },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-mono font-semibold text-slate-800">{value}</span>
                  </div>
                ))}
                <div className="col-span-2 flex items-center justify-between bg-teal-50 rounded-md px-4 py-2.5">
                  <span className="font-semibold text-teal-800">Total ESI Challan</span>
                  <span className="font-mono font-bold text-teal-900 text-base">{inr(ESI_EMP + ESI_ER)}</span>
                </div>
              </div>
            </div>
            <div className="bg-white border border-slate-200 rounded-md p-4 text-sm text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">ESI Return (Form 6)</p>
              <p>Half-yearly return — H1 (Apr–Sep) due by 11 Nov · H2 (Oct–Mar) due by 11 May. Challan due 15th of following month.</p>
            </div>
          </div>
        )}

        {tab === 'Prof. Tax & LWF' && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-md p-5 text-sm">
              <h3 className="font-semibold text-slate-700 mb-4">Professional Tax — Karnataka</h3>
              <div className="space-y-2 text-slate-600">
                {[
                  { slab: 'Up to ₹15,000/month',       pt: 'Nil' },
                  { slab: '₹15,001 – ₹35,000/month',   pt: '₹150/month' },
                  { slab: 'Above ₹35,000/month',        pt: '₹200/month (max ₹2,400/year)' },
                ].map(s => (
                  <div key={s.slab} className="flex justify-between border-b border-slate-100 pb-1.5">
                    <span>{s.slab}</span>
                    <span className="font-mono font-medium text-slate-800">{s.pt}</span>
                  </div>
                ))}
              </div>
              <p className="mt-4 text-xs text-slate-400">Due by 20th of every month. Annual return (Form 5) by 30 Apr. Employer / company PT: ₹2,500/year.</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-md p-5 text-sm">
              <h3 className="font-semibold text-slate-700 mb-2">Labour Welfare Fund (LWF)</h3>
              <p className="text-slate-600">Karnataka LWF — Employee ₹20, Employer ₹40 per year. Contributed in January. Submit annual return to Karnataka Labour Welfare Board.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
