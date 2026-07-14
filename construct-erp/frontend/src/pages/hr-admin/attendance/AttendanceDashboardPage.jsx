import React, { useState, useMemo } from 'react';
import { Users, UserCheck, UserX, Clock, CalendarCheck, TrendingUp, Building2, Download, RefreshCw, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { hrAttendanceAPI } from '../../../api/client';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const now    = new Date();

// ── Donut chart custom label ───────────────────────────────────────────────
const DonutLabel = ({ cx, cy, value, label, color }) => (
  <g>
    <text x={cx} y={cy - 8} textAnchor="middle" dominantBaseline="middle"
      style={{ fontSize: 28, fontWeight: 800, fill: color }}>{value}</text>
    <text x={cx} y={cy + 18} textAnchor="middle" dominantBaseline="middle"
      style={{ fontSize: 11, fontWeight: 600, fill: '#64748B', letterSpacing: 1 }}>{label}</text>
  </g>
);

// ── Dept progress bar row ──────────────────────────────────────────────────
function DeptRow({ dept }) {
  const total   = (parseInt(dept.headcount) || 0);
  const present = parseInt(dept.present) || 0;
  const absent  = parseInt(dept.absent)  || 0;
  const leave   = parseInt(dept.on_leave)|| 0;
  const pct     = total ? Math.round(present / total * 100) : 0;
  const color   = pct >= 90 ? '#059669' : pct >= 75 ? '#2563EB' : pct >= 60 ? '#F59E0B' : '#EF4444';

  return (
    <div className="py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-semibold text-slate-700 truncate max-w-[160px]">{dept.department_name || 'General'}</span>
        <div className="flex items-center gap-3 text-[12px] shrink-0 ml-2">
          <span className="font-bold" style={{ color: '#059669' }}>{present}P</span>
          <span className="font-bold" style={{ color: '#EF4444' }}>{absent}A</span>
          <span className="font-bold" style={{ color: '#8B5CF6' }}>{leave}L</span>
          <span className="font-bold w-9 text-right" style={{ color }}>{pct}%</span>
        </div>
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Employee row ───────────────────────────────────────────────────────────
function EmpRow({ r, workingDays }) {
  const present  = parseInt(r.present)      || 0;
  const absent   = parseInt(r.absent)       || 0;
  const half     = parseInt(r.half_day)     || 0;
  const leave    = parseInt(r.on_leave)     || 0;
  const total    = parseInt(r.total_marked) || 0;
  const base     = workingDays || total || 1;
  const pct      = Math.round(present / base * 100);
  const color    = pct >= 90 ? '#059669' : pct >= 75 ? '#2563EB' : pct >= 60 ? '#F59E0B' : '#EF4444';
  const late     = parseInt(r.total_late_minutes) > 0;

  return (
    <tr className="hover:bg-blue-50/40 transition-colors group">
      <td className="py-2.5 pl-4 pr-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0"
            style={{ background: '#1A2B4A' }}>
            {(r.name || '?')[0].toUpperCase()}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-slate-800 leading-tight">{r.name}</div>
            {r.employee_code && <div className="text-[11px] text-slate-400">{r.employee_code}</div>}
          </div>
        </div>
      </td>
      <td className="py-2.5 px-2 text-[12px] text-slate-500 max-w-[120px]">
        <span className="truncate block">{r.department_name || '—'}</span>
      </td>
      <td className="py-2.5 px-2 text-center">
        <span className="text-[13px] font-bold text-emerald-600">{present}</span>
      </td>
      <td className="py-2.5 px-2 text-center">
        <span className="text-[13px] font-bold text-red-500">{absent}</span>
      </td>
      <td className="py-2.5 px-2 text-center">
        <span className="text-[13px] font-bold text-amber-500">{half}</span>
      </td>
      <td className="py-2.5 px-2 text-center">
        <span className="text-[13px] font-bold text-purple-600">{leave}</span>
      </td>
      <td className="py-2.5 px-2">
        {late && (
          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-200">
            LATE
          </span>
        )}
      </td>
      <td className="py-2.5 pl-2 pr-4">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden" style={{ minWidth: 48 }}>
            <div className="h-full rounded-full" style={{ width: `${Math.min(pct,100)}%`, background: color }} />
          </div>
          <span className="text-[11px] font-bold w-8 text-right tabular-nums" style={{ color }}>{pct}%</span>
        </div>
      </td>
    </tr>
  );
}

// ── Custom bar tooltip ─────────────────────────────────────────────────────
const BarTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg px-3 py-2 text-[12px]">
      <p className="font-bold text-slate-600 mb-1">Day {label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }} className="font-semibold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ════════════════════════════════════════════════════════════════════════════
export default function AttendanceDashboardPage() {
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year,  setYear]  = useState(now.getFullYear());

  const { data: summaryData, isLoading, refetch } = useQuery({
    queryKey: ['att-dashboard-summary', month, year],
    queryFn: () => hrAttendanceAPI.summary({ month, year }).then(r => r.data),
  });
  const { data: trendData } = useQuery({
    queryKey: ['att-dashboard-trend', month, year],
    queryFn: () => hrAttendanceAPI.dailyTrend({ month, year }).then(r => r.data),
  });
  const { data: deptData } = useQuery({
    queryKey: ['att-dashboard-dept', month, year],
    queryFn: () => hrAttendanceAPI.deptSummary({ month, year }).then(r => r.data),
  });

  const rows  = summaryData?.data || [];
  const trend = (trendData?.data || []).map(r => ({
    day:     new Date(r.attendance_date).getDate(),
    Present: parseInt(r.present)  || 0,
    Absent:  parseInt(r.absent)   || 0,
    Leave:   parseInt(r.on_leave) || 0,
  }));
  const depts = deptData?.data || [];

  // Each row = one employee's monthly totals (days). Count unique employees per category.
  const totals = useMemo(() => rows.reduce((acc, r) => ({
    total:         acc.total + 1,
    presentEmps:   acc.presentEmps  + (parseInt(r.present)             > 0 ? 1 : 0),
    absentEmps:    acc.absentEmps   + (parseInt(r.absent)              > 0 ? 1 : 0),
    leaveEmps:     acc.leaveEmps    + (parseInt(r.on_leave)            > 0 ? 1 : 0),
    halfEmps:      acc.halfEmps     + (parseInt(r.half_day)            > 0 ? 1 : 0),
    lateEmps:      acc.lateEmps     + (parseInt(r.total_late_minutes)  > 0 ? 1 : 0),
    presentDays:   acc.presentDays  + (parseInt(r.present)             || 0),
    absentDays:    acc.absentDays   + (parseInt(r.absent)              || 0),
    leaveDays:     acc.leaveDays    + (parseInt(r.on_leave)            || 0),
    halfDays:      acc.halfDays     + (parseInt(r.half_day)            || 0),
  }), { total: 0, presentEmps: 0, absentEmps: 0, leaveEmps: 0, halfEmps: 0, lateEmps: 0,
        presentDays: 0, absentDays: 0, leaveDays: 0, halfDays: 0 }), [rows]);

  const attPct = totals.total ? Math.round(totals.presentEmps / totals.total * 100) : 0;

  const donutData = [
    { name: 'Present',  value: totals.presentEmps, color: '#059669' },
    { name: 'Absent',   value: totals.absentEmps,  color: '#EF4444' },
    { name: 'On Leave', value: totals.leaveEmps,   color: '#7C3AED' },
    { name: 'Half Day', value: totals.halfEmps,     color: '#F59E0B' },
  ].filter(d => d.value > 0);

  const KPI_TILES = [
    { label: 'Total Employees', value: totals.total,        color: '#2563EB', sub: 'With records this month' },
    { label: 'Present',         value: totals.presentEmps,  color: '#059669', sub: `${totals.presentDays} man-days` },
    { label: 'Had Absence',     value: totals.absentEmps,   color: '#EF4444', sub: `${totals.absentDays} absent days` },
    { label: 'On Leave',        value: totals.leaveEmps,    color: '#7C3AED', sub: `${totals.leaveDays} leave days` },
    { label: 'Late Arrivals',   value: totals.lateEmps,     color: '#F97316', sub: 'Employees late ≥1 day' },
    { label: 'Half Days',       value: totals.halfEmps,     color: '#F59E0B', sub: `${totals.halfDays} half-day occ.` },
  ];

  return (
    <div style={{ background: '#EEF2F7', minHeight: '100vh' }}>

      {/* ── Navy header bar ─────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #1A2B4A 0%, #243552 100%)' }}
        className="px-6 py-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-white text-lg font-bold tracking-tight flex items-center gap-2">
              <CalendarCheck size={18} className="text-orange-400" />
              Attendance Dashboard
            </h1>
            <p className="text-blue-200 text-xs mt-0.5">{MONTHS[month-1]} {year} — Monthly Overview</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={month} onChange={e => setMonth(parseInt(e.target.value))}
              className="text-[13px] font-semibold text-white border border-white/20 rounded-lg px-3 py-1.5 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              {MONTHS.map((m, i) => <option key={i+1} value={i+1} className="text-slate-800 bg-white">{SHORT[i]}</option>)}
            </select>
            <select value={year} onChange={e => setYear(parseInt(e.target.value))}
              className="text-[13px] font-semibold text-white border border-white/20 rounded-lg px-3 py-1.5 focus:outline-none"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              {[2024,2025,2026].map(y => <option key={y} value={y} className="text-slate-800 bg-white">{y}</option>)}
            </select>
            <button onClick={() => refetch()}
              className="flex items-center gap-1.5 text-[13px] font-semibold text-white border border-white/20 rounded-lg px-3 py-1.5 hover:bg-white/10 transition-colors"
              style={{ background: 'rgba(255,255,255,0.08)' }}>
              <RefreshCw size={13} /> Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-5">

        {/* ── KPI tiles ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {KPI_TILES.map(t => (
            <div key={t.label} className="bg-white rounded-xl shadow-sm overflow-hidden"
              style={{ borderTop: `3px solid ${t.color}` }}>
              <div className="px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">{t.label}</p>
                <p className="text-3xl font-black tabular-nums" style={{ color: t.color }}>
                  {isLoading ? <span className="text-slate-200 animate-pulse">—</span> : t.value}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{t.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Middle row: Donut + Trend ───────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Donut — Zoho style */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-600">Attendance Split</h2>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full"
                style={{ background: attPct >= 90 ? '#DCFCE7' : attPct >= 75 ? '#DBEAFE' : '#FEF3C7',
                         color:      attPct >= 90 ? '#15803D' : attPct >= 75 ? '#1D4ED8' : '#B45309' }}>
                {attPct}% avg
              </span>
            </div>
            {donutData.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-200 text-sm border-2 border-dashed rounded-xl">
                No data yet
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <PieChart width={210} height={210}>
                  <Pie data={donutData} cx={105} cy={105} innerRadius={62} outerRadius={88}
                    paddingAngle={3} dataKey="value" stroke="none">
                    {donutData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    <DonutLabel cx={105} cy={105} value={totals.present}
                      label="PRESENT" color="#059669" />
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} />
                </PieChart>
                <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-1">
                  {donutData.map(d => (
                    <div key={d.name} className="flex items-center gap-1.5 text-[12px]">
                      <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: d.color }}/>
                      <span className="text-slate-500">{d.name}</span>
                      <span className="font-bold text-slate-700">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Daily trend bar chart — GreytHR/Zoho */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-blue-500" /> Daily Trend — {SHORT[month-1]}
              </h2>
            </div>
            {trend.length === 0 ? (
              <div className="h-52 flex items-center justify-center text-slate-200 text-sm border-2 border-dashed rounded-xl">
                No records for {SHORT[month-1]} {year}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={trend} barSize={6} barCategoryGap="35%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} width={28} />
                  <Tooltip content={<BarTip />} cursor={{ fill: '#F1F5F9' }} />
                  <Bar dataKey="Present" fill="#059669" radius={[3,3,0,0]} />
                  <Bar dataKey="Absent"  fill="#EF4444" radius={[3,3,0,0]} />
                  <Bar dataKey="Leave"   fill="#7C3AED" radius={[3,3,0,0]} />
                  <Legend iconType="circle" iconSize={8}
                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* ── Bottom row: Dept + Employee list ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* Department breakdown — GreytHR signature */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"
              style={{ background: 'linear-gradient(90deg, #F8FAFC, #FFFFFF)' }}>
              <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Building2 size={13} className="text-orange-500" /> By Department
              </h2>
              <span className="text-[11px] text-slate-400">{depts.length} depts</span>
            </div>
            <div className="px-5 py-2 overflow-y-auto" style={{ maxHeight: 380 }}>
              {depts.length === 0 ? (
                <div className="py-12 text-center text-slate-200 text-sm border-2 border-dashed rounded-xl mt-2">
                  No department data
                </div>
              ) : depts.map(d => <DeptRow key={d.department_name} dept={d} />)}
            </div>
          </div>

          {/* Employee list — Zoho row style */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between"
              style={{ background: 'linear-gradient(90deg, #F8FAFC, #FFFFFF)' }}>
              <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <Users size={13} className="text-blue-500" /> Employee Summary
              </h2>
              <span className="text-[11px] text-slate-400">{rows.length} employees</span>
            </div>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin"/>
              </div>
            ) : rows.length === 0 ? (
              <div className="py-12 text-center text-slate-200 text-sm border-2 border-dashed rounded-xl m-4">
                No attendance data
              </div>
            ) : (
              <div className="overflow-auto" style={{ maxHeight: 400 }}>
                <table className="w-full text-sm min-w-[580px]">
                  <thead className="sticky top-0 z-10">
                    <tr style={{ background: '#F8FAFC' }}
                      className="border-b border-slate-100">
                      <th className="text-left py-2 pl-4 pr-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Employee</th>
                      <th className="text-left py-2 px-2 text-[11px] font-black uppercase tracking-wider text-slate-400">Dept</th>
                      <th className="text-center py-2 px-2 text-[11px] font-black uppercase tracking-wider text-emerald-600">P</th>
                      <th className="text-center py-2 px-2 text-[11px] font-black uppercase tracking-wider text-red-500">A</th>
                      <th className="text-center py-2 px-2 text-[11px] font-black uppercase tracking-wider text-amber-500">H</th>
                      <th className="text-center py-2 px-2 text-[11px] font-black uppercase tracking-wider text-purple-600">L</th>
                      <th className="py-2 px-2 text-[11px] font-black uppercase tracking-wider text-slate-400"></th>
                      <th className="text-left py-2 pl-2 pr-4 text-[11px] font-black uppercase tracking-wider text-blue-500">Att%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {rows.map(r => <EmpRow key={r.user_id} r={r} workingDays={totals.total ? undefined : 26} />)}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
