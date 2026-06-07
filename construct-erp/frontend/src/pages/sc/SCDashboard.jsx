// src/pages/sc/SCDashboard.jsx — Subcontractor Management Dashboard
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Users, Briefcase, Receipt, IndianRupee, AlertTriangle,
  Clock, ShieldCheck, ArrowUpRight, CheckCircle2, TrendingUp,
  CalendarDays, ChevronRight, Building2, HardHat, Wallet,
} from 'lucide-react';
import { scAPI, projectAPI } from '../../api/client';
import { PageHeader, KpiCard as ThemeKpiCard, Theme } from '../../theme';
import dayjs from 'dayjs';
import { clsx } from 'clsx';

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n) =>
  n == null || isNaN(n) ? '—'
  : `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pct = (a, b) => (b ? Math.min(100, Math.round((Number(a) / Number(b)) * 100)) : 0);

const STATUS_COLORS = {
  draft:        { bg: 'bg-slate-100',   text: 'text-slate-600',   bar: '#94A3B8' },
  submitted:    { bg: 'bg-amber-50',    text: 'text-amber-700',   bar: '#F59E0B' },
  under_review: { bg: 'bg-blue-50',     text: 'text-blue-700',    bar: '#3B82F6' },
  approved:     { bg: 'bg-emerald-50',  text: 'text-emerald-700', bar: '#10B981' },
  paid:         { bg: 'bg-green-100',   text: 'text-green-800',   bar: '#16A34A' },
  rejected:     { bg: 'bg-red-50',      text: 'text-red-600',     bar: '#EF4444' },
};

function SectionTitle({ icon: Icon, title, subtitle, action }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center">
          <Icon className="w-4 h-4 text-orange-600" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-slate-800 leading-tight">{title}</h2>
          {subtitle && <p className="text-[10px] text-slate-400 uppercase tracking-wider">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
}

function StatBar({ label, value, total, color, sub }) {
  const w = total > 0 ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-slate-500 w-24 truncate capitalize">{label.replace(/_/g,' ')}</span>
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
      </div>
      <span className="text-xs font-semibold text-slate-700 w-5 text-right">{value}</span>
      {sub && <span className="text-[10px] text-slate-400 w-16 text-right truncate">{sub}</span>}
    </div>
  );
}

function ProgressPanel({ label, value, max, color, left, right }) {
  const w = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
        <span className="text-base font-bold" style={{ color }}>{Math.round(w)}%</span>
      </div>
      <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden mb-3">
        <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, background: color }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-400">
        <span>{left}</span>
        <span>{right}</span>
      </div>
    </div>
  );
}

// Donut chart (pure SVG)
function DonutChart({ segments, size = 100, stroke = 22 }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  let offset = 0;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#F1F5F9" strokeWidth={stroke - 2} />
      {segments.map((seg, i) => {
        const dash = (seg.value / total) * circ;
        const gap  = circ - dash;
        const el = (
          <circle key={i} cx={size/2} cy={size/2} r={r} fill="none"
            stroke={seg.color} strokeWidth={stroke - 2}
            strokeDasharray={`${dash} ${gap}`} strokeDashoffset={-offset} strokeLinecap="butt" />
        );
        offset += dash;
        return el;
      })}
    </svg>
  );
}

export default function SCDashboard() {
  const now = dayjs();

  const { data: projects = [] } = useQuery({ queryKey:['projects'], queryFn:()=>projectAPI.list().then(r=>r.data?.data??[]) });
  const { data: dash, isLoading } = useQuery({
    queryKey: ['sc-dashboard'],
    queryFn: () => scAPI.dashboard().then(r => r.data?.data ?? r.data ?? []).catch(() => []),
    staleTime: 0, gcTime: 0, refetchOnMount: 'always',
  });
  // NMR pending count
  const { data: nmrPending } = useQuery({
    queryKey: ['sc-nmr-pending-count'],
    queryFn: () => scAPI.listNMR({ status: 'submitted' }).then(r => (r.data?.data||[]).length),
    staleTime: 0, refetchOnMount: 'always',
  });

  const d    = dash || {};
  const sc   = d.subcontractors || {};
  const wo   = d.work_orders || {};
  const fin  = d.financials || {};
  const billsKpi = d.bills || {};
  const byProject   = d.by_project || [];
  const billStatus  = d.bill_status || [];
  const recentBills = d.recent_bills || [];
  const recentWOs   = d.recent_work_orders || [];

  // ── Derived KPIs ─────────────────────────────────────────────────────────
  const contractValue = parseFloat(wo.total_value || 0);
  const totalBilled   = parseFloat(fin.total_billed || 0);
  const totalPaid     = parseFloat(fin.total_paid || 0);
  const outstanding   = parseFloat(fin.outstanding || 0);
  const retentionHeld = parseFloat(fin.retention_held || 0);
  const billingPct    = pct(totalBilled, contractValue);
  const paymentPct    = pct(totalPaid, totalBilled);

  // Bill status buckets
  const statusBuckets = useMemo(() => {
    const m = {};
    for (const r of billStatus) {
      m[r.status] = { count: parseInt(r.count), amount: parseFloat(r.amount) };
    }
    return m;
  }, [billStatus]);

  const totalBillCount = Object.values(statusBuckets).reduce((s, v) => s + v.count, 0);
  const donutSegments  = Object.entries(statusBuckets).map(([s, d]) => ({
    label: s, value: d.count,
    color: STATUS_COLORS[s]?.bar || '#94A3B8',
  }));

  // This month
  const billsThisMonth = recentBills.filter(b => dayjs(b.bill_date || b.created_at).isSame(now, 'month'));
  const billedThisMonth = billsThisMonth.reduce((s, b) => s + parseFloat(b.net_payable || 0), 0);
  const paidThisMonth   = billsThisMonth.reduce((s, b) => s + parseFloat(b.paid_amount || 0), 0);
  const pendingApproval = (billStatus.find(r => r.status === 'submitted')?.count || 0)
                        + (billStatus.find(r => r.status === 'under_review')?.count || 0);

  // Project rows
  const projectRows = [...byProject].sort((a, b) => b.contract_value - a.contract_value).slice(0, 6);

  return (
    <div style={{ background: Theme.pageBg, minHeight: '100vh' }}>

      <PageHeader
        title="Subcontractor Dashboard"
        subtitle="Work orders, billing, payments & retention overview"
        breadcrumbs={[{ label: 'Subcontractors' }, { label: 'Dashboard' }]}
        actions={
          <>
            <Link to="/sc/bill-preparation"
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg transition shadow-sm"
              style={{ background: '#fff', color: Theme.navyDark }}>
              <Receipt className="w-3.5 h-3.5" /> Raise Bill
            </Link>
            <Link to="/sc/work-orders"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg transition"
              style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff' }}>
              <Briefcase className="w-3.5 h-3.5" /> Work Orders
            </Link>
          </>
        }
      />

      <div className="p-5 md:p-6 max-w-[1400px] mx-auto space-y-5">

        {/* ── KPI Row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <ThemeKpiCard icon={IndianRupee}  label="Contract Value"   value={fmt(contractValue)}  color="blue"    sub={`${wo.total||0} work orders`} />
          <ThemeKpiCard icon={Receipt}      label="Total Billed"     value={fmt(totalBilled)}    color="emerald" sub={`${totalBillCount} SC bills`} />
          <ThemeKpiCard icon={Wallet}       label="Amount Paid"      value={fmt(totalPaid)}      color="emerald" sub={`${paymentPct}% of billed`} />
          <ThemeKpiCard icon={AlertTriangle}label="Outstanding"      value={fmt(outstanding)}    color="amber"   sub="Approved, unpaid" />
          <ThemeKpiCard icon={ShieldCheck}  label="Retention Held"   value={fmt(retentionHeld)}  color="slate"   sub="Deducted from bills" />
          <ThemeKpiCard icon={Users}        label="Subcontractors"   value={sc.active||0}        color="orange"  sub={`${sc.total||0} total registered`} />
        </div>

        {/* ── Alert banners ── */}
        {(outstanding > 0 || pendingApproval > 0 || nmrPending > 0) && (
          <div className="flex flex-col gap-2">
            {outstanding > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <AlertTriangle size={15} className="text-amber-600 flex-shrink-0" />
                <span className="text-sm font-medium text-amber-800">
                  {fmt(outstanding)} outstanding — {Math.round(100 - paymentPct)}% of billed amount pending payment
                </span>
                <Link to="/sc/payments" className="ml-auto text-xs font-semibold text-amber-700 underline whitespace-nowrap">Record Payment →</Link>
              </div>
            )}
            {pendingApproval > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Clock size={15} className="text-blue-600 flex-shrink-0" />
                <span className="text-sm font-medium text-blue-800">
                  {pendingApproval} SC bill{pendingApproval > 1 ? 's' : ''} pending approval
                </span>
                <Link to="/sc/bill-approval" className="ml-auto text-xs font-semibold text-blue-700 underline whitespace-nowrap">Review →</Link>
              </div>
            )}
            {nmrPending > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-xl px-4 py-3 flex items-center gap-3">
                <Clock size={15} className="text-purple-600 flex-shrink-0" />
                <span className="text-sm font-medium text-purple-800">
                  {nmrPending} NMR (Muster Roll){nmrPending > 1 ? 's' : ''} submitted — pending site check & approval
                </span>
                <Link to="/sc/labour" className="ml-auto text-xs font-semibold text-purple-700 underline whitespace-nowrap">Review NMR →</Link>
              </div>
            )}
          </div>
        )}

        {/* ── Progress panels + This Month ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ProgressPanel
            label="Billing Progress"
            value={totalBilled} max={contractValue}
            color="#F97316"
            left={`Billed: ${fmt(totalBilled)}`}
            right={`Contract: ${fmt(contractValue)}`}
          />
          <ProgressPanel
            label="Payment Rate"
            value={totalPaid} max={totalBilled}
            color="#10B981"
            left={`Paid: ${fmt(totalPaid)}`}
            right={`Billed: ${fmt(totalBilled)}`}
          />
          {/* This Month mini-summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays size={14} className="text-orange-600" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">This Month</span>
              <span className="ml-auto text-[10px] text-slate-400">{now.format('MMM YYYY')}</span>
            </div>
            <div className="space-y-2.5">
              {[
                { label: 'New Bills',       value: billsThisMonth.length },
                { label: 'Amount Billed',   value: fmt(billedThisMonth) },
                { label: 'Amount Paid',     value: fmt(paidThisMonth) },
                { label: 'Active WOs',      value: wo.active || 0 },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between border-b border-slate-50 pb-2 last:border-0 last:pb-0">
                  <span className="text-xs text-slate-500">{label}</span>
                  <span className="text-sm font-bold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Main Grid: Bill Status + Project Billing ── */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">

          {/* Bill Status Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SectionTitle icon={Receipt} title="Bill Status Breakdown" subtitle={`${totalBillCount} total bills`} />
            <div className="flex items-center gap-5 mb-4">
              <div className="relative flex-shrink-0">
                {donutSegments.length > 0
                  ? <DonutChart segments={donutSegments} size={110} stroke={24} />
                  : <div className="w-[110px] h-[110px] rounded-full border-[22px] border-slate-100" />
                }
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-lg font-bold text-slate-900">{totalBillCount}</span>
                  <span className="text-[9px] text-slate-400 font-semibold uppercase">Bills</span>
                </div>
              </div>
              <div className="flex-1 space-y-2">
                {Object.entries(statusBuckets).map(([status, data]) => (
                  <div key={status} className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ background: STATUS_COLORS[status]?.bar || '#94A3B8' }} />
                      <span className="text-[11px] font-medium text-slate-600 capitalize truncate">{status.replace(/_/g,' ')}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] text-slate-400">{fmt(data.amount)}</span>
                      <span className="text-xs font-bold text-slate-800 w-4 text-right">{data.count}</span>
                    </div>
                  </div>
                ))}
                {Object.keys(statusBuckets).length === 0 && (
                  <p className="text-xs text-slate-400 text-center py-4">No bills yet</p>
                )}
              </div>
            </div>
            {/* Status bars */}
            {Object.keys(statusBuckets).length > 0 && (
              <div className="space-y-1.5 pt-3 border-t border-slate-100">
                {Object.entries(statusBuckets).map(([status, data]) => (
                  <StatBar
                    key={status}
                    label={status}
                    value={data.count}
                    total={totalBillCount}
                    color={STATUS_COLORS[status]?.bar || '#94A3B8'}
                    sub={fmt(data.amount)}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Project-wise SC Billing */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm xl:col-span-2">
            <SectionTitle icon={TrendingUp} title="Project-wise SC Billing"
              subtitle={`${projects.length} projects`}
              action={
                <Link to="/sc/work-orders" className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 hover:text-orange-700">
                  View All <ChevronRight className="w-3 h-3" />
                </Link>
              }
            />
            {projectRows.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">No billing data available</div>
            ) : (
              <div className="space-y-4">
                {projectRows.map((p) => (
                  <div key={p.project_name}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-slate-700 truncate max-w-[50%]">{p.project_name}</span>
                      <div className="flex items-center gap-3 text-[10px] flex-shrink-0">
                        <span className="text-slate-400">WOs: <span className="font-bold text-slate-600">{p.wo_count}</span></span>
                        <span className="text-slate-400">Billed: <span className="font-bold text-orange-600">{fmt(p.billed)}</span></span>
                        <span className="text-slate-400">Contract: <span className="font-bold text-slate-700">{fmt(p.contract_value)}</span></span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all bg-orange-400"
                        style={{ width: `${p.contract_value > 0 ? Math.min(100, (parseFloat(p.billed) / parseFloat(p.contract_value)) * 100) : 0}%` }} />
                    </div>
                    <div className="flex justify-between mt-1 text-[9px] text-slate-400">
                      <span>{pct(p.billed, p.contract_value)}% billed</span>
                      <span>{pct(parseFloat(p.contract_value) - parseFloat(p.billed), p.contract_value)}% remaining</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Recent SC Bills table ── */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 pb-0">
            <SectionTitle icon={Receipt} title="Recent SC Bills"
              subtitle="Latest subcontractor billing activity"
              action={
                <Link to="/sc/bill-approval" className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 hover:text-orange-700">
                  All Bills <ChevronRight className="w-3 h-3" />
                </Link>
              }
            />
          </div>
          {isLoading ? (
            <div className="p-5 space-y-2">{[1,2,3,4].map(n => <div key={n} className="h-10 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : recentBills.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No SC bills yet — <Link to="/sc/bill-preparation" className="text-orange-600 font-semibold">raise your first bill</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-100">
                    {['Bill No.', 'Subcontractor', 'WO No.', 'Project', 'Date', 'Net Payable', 'Paid', 'Outstanding', 'Status', ''].map(h => (
                      <th key={h} className={`px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest text-slate-400 ${h===''?'':'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentBills.map(bill => {
                    const net  = parseFloat(bill.net_payable || 0);
                    const paid = parseFloat(bill.paid_amount || 0);
                    const due  = net - paid;
                    return (
                      <tr key={bill.id} className="hover:bg-slate-50 transition-colors group">
                        <td className="px-4 py-3">
                          <span className="text-xs font-bold text-indigo-700">{bill.bill_number}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-700 font-medium truncate max-w-[150px] block">{bill.sc_name || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-slate-600">{bill.wo_number || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500 truncate max-w-[130px] block">{bill.project_name || '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-500">{bill.bill_date ? dayjs(bill.bill_date).format('DD MMM YY') : '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-slate-800">{fmt(net)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-semibold text-emerald-600">{fmt(paid)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('text-xs font-semibold', due > 0 ? 'text-amber-600' : 'text-slate-400')}>{due > 0 ? fmt(due) : '—'}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider',
                            STATUS_COLORS[bill.status || 'draft']?.bg, STATUS_COLORS[bill.status || 'draft']?.text)}>
                            {(bill.status || 'draft').replace(/_/g,' ')}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link to="/sc/bill-approval"
                            className="opacity-0 group-hover:opacity-100 flex items-center gap-1 text-[10px] text-orange-600 font-semibold transition-opacity whitespace-nowrap">
                            View <ArrowUpRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Recent Work Orders + Active Subcontractors ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Recent Work Orders */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SectionTitle icon={Briefcase} title="Recent Work Orders"
              subtitle={`${wo.active||0} active`}
              action={<Link to="/sc/work-orders" className="flex items-center gap-1 text-[10px] font-semibold text-orange-600 hover:text-orange-700">View All <ChevronRight className="w-3 h-3" /></Link>}
            />
            {recentWOs.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">No work orders created yet</div>
            ) : (
              <div className="space-y-2.5">
                {recentWOs.map(w => (
                  <div key={w.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-indigo-700 font-mono">{w.wo_number}</p>
                      <p className="text-xs font-semibold text-slate-700 truncate mt-0.5">{w.subject || w.sc_name}</p>
                      <p className="text-[10px] text-slate-400">{w.project_name || '—'} · {w.sc_name}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                      <span className="text-xs font-bold text-slate-800">{fmt(w.contract_amount)}</span>
                      <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                        w.status === 'active'    ? 'bg-emerald-100 text-emerald-700' :
                        w.status === 'completed' ? 'bg-teal-100 text-teal-700' :
                        w.status === 'approved'  ? 'bg-blue-100 text-blue-700'  :
                        'bg-slate-100 text-slate-600')}>
                        {w.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Access */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <SectionTitle icon={HardHat} title="Quick Access" subtitle="Jump to any module" />
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Add Subcontractor',  path: '/sc/master',           bg: 'bg-indigo-50',  text: 'text-indigo-700' },
                { label: 'Create Work Order',  path: '/sc/work-orders',      bg: 'bg-emerald-50', text: 'text-emerald-700' },
                { label: 'Mark Attendance',    path: '/sc/labour',           bg: 'bg-blue-50',    text: 'text-blue-700' },
                { label: 'Work Progress',      path: '/sc/progress',         bg: 'bg-cyan-50',    text: 'text-cyan-700' },
                { label: 'Raise Bill',         path: '/sc/bill-preparation', bg: 'bg-orange-50',  text: 'text-orange-700' },
                { label: 'Bill Approvals',     path: '/sc/bill-approval',    bg: 'bg-amber-50',   text: 'text-amber-700' },
                { label: 'Record Payment',     path: '/sc/payments',         bg: 'bg-green-50',   text: 'text-green-700' },
                { label: 'View Reports',       path: '/sc/reports',          bg: 'bg-slate-100',  text: 'text-slate-700' },
              ].map(q => (
                <Link key={q.path} to={q.path}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold ${q.bg} ${q.text} hover:opacity-90 transition-opacity`}>
                  {q.label}
                  <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
                </Link>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
