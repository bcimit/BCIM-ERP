import React, { useState } from 'react';
import { Shield, CheckCircle2, Clock, AlertTriangle, XCircle } from 'lucide-react';
import dayjs from 'dayjs';

const TODAY = dayjs();

const STATUS = {
  filed:    { label: 'Filed',    cls: 'bg-emerald-50 text-emerald-700', icon: CheckCircle2,   iconCls: 'text-emerald-500' },
  due_soon: { label: 'Due Soon', cls: 'bg-amber-50  text-amber-700',   icon: Clock,           iconCls: 'text-amber-500'   },
  overdue:  { label: 'Overdue',  cls: 'bg-red-50    text-red-700',     icon: XCircle,         iconCls: 'text-red-500'     },
  upcoming: { label: 'Upcoming', cls: 'bg-blue-50   text-blue-700',    icon: AlertTriangle,   iconCls: 'text-blue-400'    },
  na:       { label: 'N/A',      cls: 'bg-slate-100 text-slate-500',   icon: Shield,          iconCls: 'text-slate-300'   },
};

function computeStatus(dueDate, filed) {
  if (filed) return 'filed';
  const diff = dayjs(dueDate).diff(TODAY, 'day');
  if (diff < 0)  return 'overdue';
  if (diff <= 7) return 'due_soon';
  return 'upcoming';
}

const OBLIGATIONS = [];

const CATEGORIES = ['All', 'GST', 'TDS', 'PF', 'ESI', 'Prof. Tax', 'Income Tax'];
const CAT_CLR = { GST: 'bg-violet-100 text-violet-700', TDS: 'bg-blue-100 text-blue-700', PF: 'bg-teal-100 text-teal-700', ESI: 'bg-cyan-100 text-cyan-700', 'Prof. Tax': 'bg-orange-100 text-orange-700', 'Income Tax': 'bg-rose-100 text-rose-700' };

export default function ComplianceCalendarPage() {
  const [cat, setCat] = useState('All');

  const rows = (cat === 'All' ? OBLIGATIONS : OBLIGATIONS.filter(r => r.category === cat))
    .map(r => ({ ...r, status: computeStatus(r.dueDate, r.filed) }))
    .sort((a, b) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix());

  const counts = { filed: 0, due_soon: 0, overdue: 0, upcoming: 0 };
  OBLIGATIONS.forEach(r => { const s = computeStatus(r.dueDate, r.filed); counts[s] = (counts[s] || 0) + 1; });

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-indigo-50 flex items-center justify-center">
            <Shield className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Compliance Calendar</h1>
            <p className="text-xs text-slate-400">All statutory due dates — GST, TDS, PF, ESI, Professional Tax, Income Tax</p>
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="px-6 py-4 grid grid-cols-4 gap-3">
        {[
          { key: 'overdue',  label: 'Overdue',   color: 'red'     },
          { key: 'due_soon', label: 'Due in 7d', color: 'amber'   },
          { key: 'upcoming', label: 'Upcoming',  color: 'blue'    },
          { key: 'filed',    label: 'Filed',     color: 'emerald' },
        ].map(({ key, label, color }) => (
          <div key={key} className={`bg-${color}-50 border border-${color}-100 rounded-md px-4 py-3`}>
            <p className={`text-2xl font-bold text-${color}-700`}>{counts[key] || 0}</p>
            <p className={`text-xs text-${color}-600 mt-0.5`}>{label}</p>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div className="px-6 pb-3 flex gap-1 flex-wrap">
        {CATEGORIES.map(c => (
          <button key={c} onClick={() => setCat(c)}
            className={`px-3 py-1.5 text-xs rounded-md border ${cat === c ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="px-6 pb-6">
        <div className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                {['Category', 'Obligation', 'Period', 'Due Date', 'Penalty', 'Status'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-slate-400">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {rows.map(r => {
                const s = STATUS[r.status];
                const Icon = s.icon;
                return (
                  <tr key={r.id} className={`hover:bg-slate-50 cursor-pointer ${r.status === 'overdue' ? 'bg-red-50/30' : r.status === 'due_soon' ? 'bg-amber-50/30' : ''}`}>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${CAT_CLR[r.category] || ''}`}>{r.category}</span>
                    </td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{r.name}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.period}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap text-slate-600">{dayjs(r.dueDate).format('DD MMM YYYY')}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.penalty}</td>
                    <td className="px-4 py-2.5">
                      <span className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${s.cls}`}>
                        <Icon className={`w-3 h-3 ${s.iconCls}`} />
                        {s.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && <p className="px-4 py-10 text-sm text-slate-400 text-center">No compliance obligations tracked yet</p>}
        </div>
      </div>
    </div>
  );
}
