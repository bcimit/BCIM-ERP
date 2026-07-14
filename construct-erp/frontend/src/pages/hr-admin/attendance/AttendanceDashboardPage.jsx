import React, { useState } from 'react';
import { Users, UserCheck, UserX, Clock, CalendarCheck, TrendingUp, MapPin, ArrowUpRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { hrAttendanceAPI } from '../../../api/client';

const today = new Date().toISOString().slice(0, 10);

function StatCard({ icon: Icon, label, value, sub, color }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4 shadow-sm">
      <div className="p-2.5 rounded-lg" style={{ background: color + '18' }}>
        <Icon size={20} style={{ color }} />
      </div>
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{label}</p>
        <p className="text-2xl font-bold text-slate-800 mt-0.5">{value ?? '—'}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function AttendanceDashboardPage() {
  const [date, setDate] = useState(today);

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-summary', date],
    queryFn: () => hrAttendanceAPI.getSummary?.({ date }).then(r => r.data).catch(() => null),
    enabled: !!hrAttendanceAPI.getSummary,
  });

  const summary = data || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Attendance Dashboard</h1>
          <p className="text-sm text-slate-500 mt-0.5">Today's attendance overview and trends</p>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-200"
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard icon={Users}       label="Total"   value={summary.total}   color="#2563EB" />
        <StatCard icon={UserCheck}   label="Present" value={summary.present} color="#10B981" />
        <StatCard icon={UserX}       label="Absent"  value={summary.absent}  color="#EF4444" />
        <StatCard icon={Clock}       label="Late"    value={summary.late}    color="#F59E0B" />
        <StatCard icon={CalendarCheck} label="On Leave" value={summary.on_leave} color="#8B5CF6" />
        <StatCard icon={TrendingUp}  label="Attendance %" value={summary.total && summary.present ? Math.round(summary.present / summary.total * 100) + '%' : '—'} color="#0EA5E9" />
      </div>

      {/* Attendance Trends placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <TrendingUp size={14} className="text-blue-500" /> Attendance Trends
          </h2>
          <span className="text-xs text-slate-400">Last 30 days</span>
        </div>
        {isLoading ? (
          <div className="h-40 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
        ) : (
          <div className="h-40 flex items-center justify-center text-slate-300 text-sm border-2 border-dashed border-slate-100 rounded-lg">
            Trend chart — connect attendance data API
          </div>
        )}
      </div>

      {/* Site-wise Attendance */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
          <MapPin size={14} className="text-emerald-500" /> Site-wise Attendance
        </h2>
        {isLoading ? (
          <div className="h-24 flex items-center justify-center text-slate-400 text-sm">Loading…</div>
        ) : (summary.sites || []).length > 0 ? (
          <div className="space-y-2">
            {(summary.sites || []).map(s => (
              <div key={s.site} className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 text-sm">
                <span className="font-medium text-slate-700">{s.site}</span>
                <span className="text-slate-500">{s.present}/{s.total}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-slate-300 text-sm border-2 border-dashed border-slate-100 rounded-lg">
            No site data — connect project/site API
          </div>
        )}
      </div>

      {/* Shift Status */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2 mb-4">
          <Clock size={14} className="text-amber-500" /> Shift Status
        </h2>
        <div className="h-24 flex items-center justify-center text-slate-300 text-sm border-2 border-dashed border-slate-100 rounded-lg">
          Shift-wise breakdown — connect shifts API
        </div>
      </div>
    </div>
  );
}
