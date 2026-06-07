import React, { useEffect, useState } from 'react';
import { assetMgmtAPI } from '../../api/client';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import {
  Package, Wrench, AlertTriangle, Activity, FileText,
  Clock, CheckCircle, RefreshCw, ChevronRight, Zap,
  TrendingDown, Shield, ArrowRightLeft,
} from 'lucide-react';
import {
  PageHeader, MetricCard, SectionCard, StatusBadge, EmptyState,
  LoadingSpinner, fmtINR, fmtDate, daysFrom, ProgressBar,
} from '../../components/ui';

const PIE_COLORS = ['#4F46E5','#10B981','#F59E0B','#EF4444','#8B5CF6','#06B6D4','#64748B'];

const QUICK_LINKS = [
  { to: '/assets',              icon: Package,        label: 'Asset Master',     color: 'bg-indigo-50 text-indigo-600' },
  { to: '/assets/allocation',   icon: ArrowRightLeft, label: 'Issue Asset',      color: 'bg-emerald-50 text-emerald-600' },
  { to: '/assets/work-orders',  icon: Wrench,         label: 'Work Orders',      color: 'bg-amber-50 text-amber-600' },
  { to: '/assets/alerts',       icon: AlertTriangle,  label: 'Alerts',           color: 'bg-red-50 text-red-600' },
  { to: '/assets/depreciation', icon: TrendingDown,   label: 'Depreciation',     color: 'bg-purple-50 text-purple-600' },
  { to: '/assets/reports',      icon: Activity,       label: 'Reports',          color: 'bg-blue-50 text-blue-600' },
];

export default function AssetDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try { setData((await assetMgmtAPI.dashboard()).data?.data); } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  if (loading) return (
    <div className="p-8">
      <div className="h-8 w-48 bg-slate-200 animate-pulse rounded mb-2" />
      <div className="h-4 w-72 bg-slate-100 animate-pulse rounded mb-8" />
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[...Array(6)].map((_,i) => <div key={i} className="h-28 bg-slate-100 animate-pulse rounded-xl" />)}
      </div>
    </div>
  );

  if (!data) return (
    <div className="p-8 text-center">
      <AlertTriangle className="w-10 h-10 text-red-400 mx-auto mb-3" />
      <p className="text-slate-600">Failed to load dashboard data</p>
      <button onClick={load} className="btn-primary mt-4 text-xs">Retry</button>
    </div>
  );

  const { summary, by_category, recent_assets, upcoming_maintenance } = data;

  // Status distribution for donut chart
  const statusData = [
    { name: 'Available',    value: summary.available   || 0 },
    { name: 'Assigned',     value: summary.assigned    || 0 },
    { name: 'Maintenance',  value: summary.maintenance || 0 },
    { name: 'Other',        value: Math.max(0, (summary.total_assets||0) - (summary.available||0) - (summary.assigned||0) - (summary.maintenance||0)) },
  ].filter(d => d.value > 0);

  // Category bar data
  const catData = (by_category || []).slice(0, 8).map(c => ({
    name: c.category?.split(' ').slice(0, 2).join(' ') || 'Other',
    count: parseInt(c.c),
    value: parseFloat(c.total_value) || 0,
  }));

  return (
    <div className="p-6 md:p-8 space-y-6">
      <PageHeader
        title="Asset Dashboard"
        subtitle="Fleet, Plant, Equipment & IT Assets — real-time overview"
        breadcrumb={['Assets & IT', 'Dashboard']}
      >
        <button onClick={load} className="btn-secondary">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
        <Link to="/assets" className="btn-primary">
          <Package className="w-4 h-4" /> View All Assets
        </Link>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <MetricCard label="Total Assets"    value={summary.total_assets || 0}    icon={Package}       color="indigo"  sub={fmtINR(summary.total_value) + ' value'} />
        <MetricCard label="Available"       value={summary.available || 0}       icon={CheckCircle}   color="emerald" sub="Ready for use" />
        <MetricCard label="Assigned"        value={summary.assigned || 0}        icon={Activity}      color="blue"    sub="Deployed on site" />
        <MetricCard label="Maintenance"     value={summary.maintenance || 0}     icon={Wrench}        color="amber"   sub="In service" />
        <MetricCard label="Open Work Orders" value={summary.open_work_orders || 0} icon={Clock}       color="orange"  sub="Pending" />
        <MetricCard label="Expiring Docs"   value={summary.expiring_docs || 0}   icon={AlertTriangle} color="red"     sub="Within 30 days" />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Donut — Status */}
        <SectionCard title="Asset Status" subtitle="Current utilization" icon={Activity}>
          {statusData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={statusData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                    paddingAngle={3} dataKey="value">
                    {statusData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v) => [`${v} assets`, '']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {statusData.map((d,i) => (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: PIE_COLORS[i % PIE_COLORS.length]}} />
                    <span className="text-xs text-slate-600 truncate">{d.name}</span>
                    <span className="text-xs font-bold text-slate-800 ml-auto">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <EmptyState title="No status data" />}
        </SectionCard>

        {/* Bar — By Category */}
        <SectionCard title="By Category" subtitle="Asset count per category" icon={Package} className="lg:col-span-2">
          {catData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={catData} margin={{ top: 5, right: 10, left: -20, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94A3B8' }} angle={-35} textAnchor="end" interval={0} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} />
                <Tooltip formatter={(v) => [`${v} assets`, 'Count']} />
                <Bar dataKey="count" radius={[4,4,0,0]}>
                  {catData.map((_,i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyState title="No category data" description="Add asset categories to see breakdown" />}
        </SectionCard>
      </div>

      {/* Upcoming Maintenance + Recent Assets */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming maintenance */}
        <SectionCard title="Upcoming Maintenance" subtitle="Due within 15 days" icon={Wrench}
          action={<Link to="/assets/maintenance" className="text-xs text-indigo-600 hover:underline font-medium">View all →</Link>}>
          {(upcoming_maintenance || []).length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No maintenance due in 15 days ✓</p>
            </div>
          ) : (
            <div className="space-y-2">
              {upcoming_maintenance.map((a, i) => {
                const days = daysFrom(a.next_service_date);
                const urgent = days !== null && days <= 3;
                return (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${urgent ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
                    <div className="min-w-0">
                      <span className="font-mono text-xs text-indigo-600 font-semibold">{a.asset_code}</span>
                      <p className="text-xs text-slate-700 truncate">{a.asset_name}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      <span className={`text-sm font-bold ${urgent ? 'text-red-600' : 'text-amber-700'}`}>
                        {days === null ? '—' : days <= 0 ? 'Overdue' : `${days}d`}
                      </span>
                      <p className="text-[10px] text-slate-400">{fmtDate(a.next_service_date)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

        {/* Recent assets */}
        <SectionCard title="Recently Added" subtitle="Latest asset registrations" icon={Package}
          action={<Link to="/assets" className="text-xs text-indigo-600 hover:underline font-medium">View all →</Link>}>
          {(recent_assets || []).length === 0 ? (
            <EmptyState title="No assets registered" description="Add assets to your register" />
          ) : (
            <div className="overflow-x-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Name</th><th>Status</th><th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {recent_assets.map((a, i) => (
                    <tr key={i}>
                      <td><span className="font-mono text-xs text-indigo-600 font-semibold">{a.asset_code}</span></td>
                      <td className="max-w-[140px] truncate">{a.asset_name}</td>
                      <td><StatusBadge status={a.status} /></td>
                      <td className="text-right">{a.purchase_value ? fmtINR(a.purchase_value) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>

      {/* Quick Access */}
      <SectionCard title="Quick Access" subtitle="Navigate to key asset functions" icon={Zap}>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_LINKS.map(l => (
            <Link key={l.to} to={l.to}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:shadow-sm transition-all group">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${l.color} group-hover:scale-110 transition-transform`}>
                <l.icon className="w-5 h-5" />
              </div>
              <span className="text-xs font-medium text-slate-600 group-hover:text-indigo-700 text-center leading-tight">{l.label}</span>
            </Link>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
