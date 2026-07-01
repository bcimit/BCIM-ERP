// src/pages/hr-admin/HRChecklistPage.jsx — HR Admin Monthly Checklist
import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertTriangle, XCircle, ChevronRight,
  IndianRupee, Users, FileText, Calendar, ShieldCheck, BadgeCheck,
  UserCheck, UserX, Briefcase, Receipt, RefreshCw, AlertCircle,
  Building2, ClipboardList, CreditCard, BookOpen, Fingerprint,
  ArrowUpRight, Bell,
} from 'lucide-react';
import { clsx } from 'clsx';
import { hrComplianceAPI } from '../../api/client';
import { PageHeader } from '../../theme';

// ── helpers ───────────────────────────────────────────────────────────────────
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

function StatusDot({ status }) {
  const map = {
    done:    'bg-emerald-500',
    warning: 'bg-amber-500',
    danger:  'bg-red-500',
    pending: 'bg-slate-300',
    info:    'bg-blue-500',
  };
  return <span className={clsx('w-2.5 h-2.5 rounded-full flex-shrink-0', map[status] || map.pending)} />;
}

function SectionCard({ icon: Icon, title, color = 'indigo', count, badge, children }) {
  const colors = {
    indigo:  { hdr: 'bg-indigo-600', icon: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
    emerald: { hdr: 'bg-emerald-600', icon: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
    amber:   { hdr: 'bg-amber-500',  icon: 'text-amber-600',  bg: 'bg-amber-50',  border: 'border-amber-200'  },
    red:     { hdr: 'bg-red-600',    icon: 'text-red-600',    bg: 'bg-red-50',    border: 'border-red-200'    },
    blue:    { hdr: 'bg-blue-600',   icon: 'text-blue-600',   bg: 'bg-blue-50',   border: 'border-blue-200'   },
    violet:  { hdr: 'bg-violet-600', icon: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-200' },
    slate:   { hdr: 'bg-slate-600',  icon: 'text-slate-600',  bg: 'bg-slate-50',  border: 'border-slate-200'  },
  };
  const c = colors[color] || colors.indigo;
  return (
    <div className={clsx('bg-white rounded-2xl border overflow-hidden shadow-sm', c.border)}>
      <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100">
        <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center', c.bg)}>
          <Icon className={clsx('w-4 h-4', c.icon)} />
        </div>
        <span className="font-semibold text-slate-800 text-sm flex-1">{title}</span>
        {count !== undefined && (
          <span className={clsx('text-xs font-bold px-2 py-0.5 rounded-full', c.bg, c.icon)}>
            {count}
          </span>
        )}
        {badge && <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full', badge.cls)}>{badge.label}</span>}
      </div>
      <div className="divide-y divide-slate-50">{children}</div>
    </div>
  );
}

function CheckRow({ status, label, sub, action, onClick, rightLabel }) {
  const icons = {
    done:    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />,
    danger:  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />,
    pending: <Clock className="w-4 h-4 text-slate-400 flex-shrink-0" />,
    info:    <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />,
  };
  return (
    <div
      onClick={onClick}
      className={clsx('flex items-center gap-3 px-5 py-3 text-sm', onClick && 'hover:bg-slate-50 cursor-pointer transition-colors')}
    >
      {icons[status] || icons.pending}
      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium truncate', status === 'done' ? 'text-slate-500 line-through' : 'text-slate-800')}>{label}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {rightLabel && <span className="text-xs text-slate-500 flex-shrink-0">{rightLabel}</span>}
      {action && (
        <span className="text-xs text-indigo-600 font-semibold flex-shrink-0 flex items-center gap-0.5">
          {action} <ChevronRight className="w-3 h-3" />
        </span>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function HRChecklistPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['hr-checklist'],
    queryFn: () => hrComplianceAPI.hrChecklist().then(r => r.data),
    staleTime: 2 * 60 * 1000,
  });

  if (isLoading) return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f5f6fa]">
      <PageHeader title="HR Checklist" subtitle="Monthly HR admin task tracker" breadcrumbs={[{label:'HR & Admin'},{label:'Checklist'}]} />
      <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">Loading checklist…</div>
    </div>
  );

  if (isError) return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f5f6fa]">
      <PageHeader title="HR Checklist" subtitle="Monthly HR admin task tracker" breadcrumbs={[{label:'HR & Admin'},{label:'Checklist'}]} />
      <div className="flex-1 flex items-center justify-center flex-col gap-3 text-slate-400">
        <AlertCircle className="w-10 h-10" />
        <p className="text-sm">Failed to load checklist</p>
        <button onClick={() => refetch()} className="h-8 px-4 rounded-lg bg-indigo-600 text-white text-xs font-semibold">Retry</button>
      </div>
    </div>
  );

  const {
    month_name, year,
    payroll = {},
    compliance_tasks = [],
    probation_due = [],
    lifecycle_pending = [],
    license_expiry = [],
    doc_expiry = [],
    leaves_pending = 0,
    expenses_pending = 0,
    new_joiners = [],
    exits_pending = [],
  } = data || {};

  // Tally for top-level summary
  const overdueCount = compliance_tasks.filter(t => t.overdue).length;
  const dueSoonCount = compliance_tasks.filter(t => t.due_soon).length;
  const alertCount   = probation_due.length + lifecycle_pending.length + license_expiry.length + doc_expiry.length + exits_pending.length;

  const SUMMARY_CARDS = [
    {
      label: 'Payroll Status',
      value: payroll.status === 'paid'     ? 'Paid'
           : payroll.status === 'approved' ? 'Approved'
           : payroll.status === 'not_run'  ? 'Not Run'
           : 'Pending',
      sub: payroll.total_employees ? `${payroll.total_employees} employees` : 'No payroll yet',
      icon: CreditCard,
      color: payroll.status === 'paid' ? 'emerald' : payroll.status === 'not_run' ? 'red' : 'amber',
    },
    {
      label: 'Compliance Filings',
      value: `${overdueCount} Overdue`,
      sub: `${dueSoonCount} due in 3 days`,
      icon: ShieldCheck,
      color: overdueCount > 0 ? 'red' : dueSoonCount > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'HR Alerts',
      value: alertCount,
      sub: `${leaves_pending + expenses_pending} pending approvals`,
      icon: Bell,
      color: alertCount > 0 ? 'amber' : 'emerald',
    },
    {
      label: 'New Joiners',
      value: new_joiners.length,
      sub: `This month (${month_name})`,
      icon: UserCheck,
      color: 'blue',
    },
  ];

  const colorMap = {
    emerald: { bg:'bg-emerald-50', text:'text-emerald-700', icon:'text-emerald-500' },
    amber:   { bg:'bg-amber-50',   text:'text-amber-700',   icon:'text-amber-500'   },
    red:     { bg:'bg-red-50',     text:'text-red-700',     icon:'text-red-500'     },
    blue:    { bg:'bg-blue-50',    text:'text-blue-700',    icon:'text-blue-500'    },
  };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f5f6fa]">
      <PageHeader
        title={`HR Checklist — ${month_name} ${year}`}
        subtitle="Monthly HR admin tasks, compliance filings, and employee action items"
        breadcrumbs={[{ label:'HR & Admin' }, { label:'Checklist' }]}
        actions={
          <button onClick={() => refetch()}
            className="h-9 px-4 rounded-xl border border-slate-200 bg-white text-xs font-medium flex items-center gap-2 hover:bg-slate-50">
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        }
      />

      <div className="flex-1 overflow-auto p-5 md:p-6 space-y-5">

        {/* Summary strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {SUMMARY_CARDS.map(({ label, value, sub, icon: Icon, color }) => {
            const c = colorMap[color] || colorMap.blue;
            return (
              <div key={label} className="bg-white rounded-2xl border border-slate-200 px-5 py-4 shadow-sm flex items-center gap-4">
                <div className={clsx('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0', c.bg)}>
                  <Icon className={clsx('w-5 h-5', c.icon)} />
                </div>
                <div className="min-w-0">
                  <div className={clsx('text-xl font-bold truncate', c.text)}>{value}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
                  <div className="text-[10px] text-slate-400">{sub}</div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ── 1. Payroll Checklist ── */}
          <SectionCard icon={CreditCard} title={`Payroll — ${month_name} ${year}`}
            color={payroll.status === 'paid' ? 'emerald' : 'amber'}>
            <CheckRow
              status={payroll.total_employees > 0 ? 'done' : 'danger'}
              label="Run payroll for all employees"
              sub={payroll.total_employees > 0 ? `${payroll.total_employees} employees processed` : 'Payroll not yet generated'}
              action={payroll.total_employees === 0 ? 'Run Payroll' : undefined}
              onClick={() => navigate('/hr-admin/payroll')}
            />
            <CheckRow
              status={['approved','paid'].includes(payroll.status) ? 'done' : 'pending'}
              label="Approve payroll"
              sub={payroll.approved_count > 0 ? `${payroll.approved_count} approved` : 'Pending manager/HR approval'}
              action="Payroll"
              onClick={() => navigate('/hr-admin/payroll')}
            />
            <CheckRow
              status={payroll.status === 'paid' ? 'done' : 'pending'}
              label="Disburse salaries"
              sub={payroll.status === 'paid'
                ? `₹${fmt(payroll.net_pay_total)} disbursed`
                : 'Mark as paid after bank transfer'}
              action="Disburse"
              onClick={() => navigate('/hr-admin/payroll')}
            />
            <CheckRow
              status={payroll.status === 'paid' ? 'done' : 'pending'}
              label="Send payslips to employees"
              sub="Email payslips via payroll page"
              action="Payslips"
              onClick={() => navigate('/hr-admin/payroll')}
            />
          </SectionCard>

          {/* ── 2. Statutory Compliance ── */}
          <SectionCard icon={ShieldCheck} title="Compliance Filings" color={overdueCount > 0 ? 'red' : 'indigo'}
            badge={overdueCount > 0 ? { label:`${overdueCount} OVERDUE`, cls:'bg-red-100 text-red-700' } : undefined}>
            {compliance_tasks.map(t => (
              <CheckRow
                key={t.id}
                status={t.overdue ? 'danger' : t.due_soon ? 'warning' : 'pending'}
                label={t.task}
                sub={t.description}
                rightLabel={t.overdue
                  ? `${Math.abs(t.days_remaining)}d overdue`
                  : `Due ${fmtDate(t.due_date)} (${t.days_remaining}d)`}
                action="Compliance"
                onClick={() => navigate('/hr-admin/compliance')}
              />
            ))}
          </SectionCard>

          {/* ── 3. Employee Actions ── */}
          <SectionCard icon={Users} title="Employee Actions" color="blue"
            count={probation_due.length + new_joiners.length + exits_pending.length}>

            {new_joiners.length > 0 && (
              <>
                <div className="px-5 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">New Joiners This Month</p>
                </div>
                {new_joiners.map(e => (
                  <CheckRow
                    key={e.id} status="info"
                    label={e.name}
                    sub={`${e.employee_code || '—'} · Joined ${fmtDate(e.date_of_joining)} · ${e.department_name || 'No dept'}`}
                    action="View"
                    onClick={() => navigate(`/hr-admin/employees/${e.id}`)}
                  />
                ))}
              </>
            )}

            {probation_due.length > 0 && (
              <>
                <div className="px-5 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Probation Reviews Due</p>
                </div>
                {probation_due.map(e => (
                  <CheckRow
                    key={e.id} status={e.days_left <= 7 ? 'warning' : 'pending'}
                    label={e.name}
                    sub={`${e.employee_code || '—'} · ${e.designation_name || ''} · ${e.department_name || ''}`}
                    rightLabel={`Ends ${fmtDate(e.probation_end_date)}`}
                    action="Review"
                    onClick={() => navigate(`/hr-admin/employees/${e.id}`)}
                  />
                ))}
              </>
            )}

            {exits_pending.length > 0 && (
              <>
                <div className="px-5 pt-3 pb-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Exit / FnF Pending</p>
                </div>
                {exits_pending.map(e => (
                  <CheckRow
                    key={e.id} status="warning"
                    label={e.name}
                    sub={`${e.employee_code || '—'} · ${e.leaving_reason || 'Resigned'}`}
                    rightLabel={e.date_of_leaving ? fmtDate(e.date_of_leaving) : 'Date TBD'}
                    action="FnF"
                    onClick={() => navigate('/hr-admin/fnf')}
                  />
                ))}
              </>
            )}

            {new_joiners.length === 0 && probation_due.length === 0 && exits_pending.length === 0 && (
              <CheckRow status="done" label="No employee actions pending this month" />
            )}
          </SectionCard>

          {/* ── 4. Pending Approvals ── */}
          <SectionCard icon={ClipboardList} title="Pending Approvals" color="violet"
            count={leaves_pending + expenses_pending}>
            <CheckRow
              status={leaves_pending > 0 ? 'warning' : 'done'}
              label={`Leave Requests — ${leaves_pending} pending`}
              sub="Review and approve / reject leave applications"
              action={leaves_pending > 0 ? 'Approve' : undefined}
              onClick={() => navigate('/hr-admin/leaves')}
            />
            <CheckRow
              status={expenses_pending > 0 ? 'warning' : 'done'}
              label={`Expense Claims — ${expenses_pending} pending`}
              sub="Review submitted expense reimbursement requests"
              action={expenses_pending > 0 ? 'Review' : undefined}
              onClick={() => navigate('/hr-admin/expenses')}
            />
          </SectionCard>

          {/* ── 5. Lifecycle Checklist ── */}
          {lifecycle_pending.length > 0 && (
            <SectionCard icon={BookOpen} title="Onboarding / Exit Checklist" color="amber"
              count={lifecycle_pending.length}>
              {lifecycle_pending.slice(0, 8).map((item, i) => (
                <CheckRow
                  key={i} status="pending"
                  label={item.title}
                  sub={`${item.employee_name} (${item.employee_code || '—'}) · ${item.owner_department || ''}`}
                  rightLabel={item.stage === 'onboarding' ? 'Onboarding' : 'Exit'}
                />
              ))}
              {lifecycle_pending.length > 8 && (
                <div className="px-5 py-2 text-xs text-slate-400">
                  +{lifecycle_pending.length - 8} more items…
                </div>
              )}
            </SectionCard>
          )}

          {/* ── 6. Document & Licence Expiry ── */}
          {(doc_expiry.length > 0 || license_expiry.length > 0) && (
            <SectionCard icon={BadgeCheck} title="Expiry Alerts" color="red"
              count={doc_expiry.length + license_expiry.length}>

              {license_expiry.length > 0 && (
                <>
                  <div className="px-5 pt-3 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Labour Licences (60 days)</p>
                  </div>
                  {license_expiry.map((l, i) => (
                    <CheckRow
                      key={i}
                      status={l.days_left <= 15 ? 'danger' : 'warning'}
                      label={l.licence_type}
                      sub={`${l.authority || ''} · ${l.licence_number || ''}`}
                      rightLabel={`Expires ${fmtDate(l.expiry_date)} (${l.days_left}d)`}
                      action="Update"
                      onClick={() => navigate('/hr-admin/compliance')}
                    />
                  ))}
                </>
              )}

              {doc_expiry.length > 0 && (
                <>
                  <div className="px-5 pt-3 pb-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Employee Documents (30 days)</p>
                  </div>
                  {doc_expiry.map((d, i) => (
                    <CheckRow
                      key={i}
                      status={d.days_left <= 7 ? 'danger' : 'warning'}
                      label={`${d.employee_name} — ${d.doc_type || d.doc_name}`}
                      sub={`${d.employee_code || '—'} · ${d.doc_name || ''}`}
                      rightLabel={`Expires ${fmtDate(d.expiry_date)}`}
                      action="View"
                      onClick={() => navigate('/hr-admin/compliance')}
                    />
                  ))}
                </>
              )}
            </SectionCard>
          )}

          {/* ── 7. Quick Links ── */}
          <SectionCard icon={ArrowUpRight} title="Quick Actions" color="slate">
            {[
              { label: 'Run / View Payroll',       sub: 'Generate, approve & disburse salaries',       path: '/hr-admin/payroll',    icon: CreditCard  },
              { label: 'PF Register & ECR File',   sub: 'Download PF ECR for EPFO portal upload',      path: '/hr-admin/compliance', icon: ShieldCheck },
              { label: 'ESI Register',              sub: 'ESI contribution register for ESIC portal',   path: '/hr-admin/compliance', icon: Fingerprint },
              { label: 'Wage Register',             sub: 'Full monthly wage register with all details', path: '/hr-admin/compliance', icon: IndianRupee },
              { label: 'HR Reports',                sub: 'Export payroll & statutory reports to Excel', path: '/hr-admin/reports',    icon: FileText    },
              { label: 'Employee List',             sub: 'Manage employee profiles and assignments',    path: '/hr-admin/employees',  icon: Users       },
            ].map(({ label, sub, path, icon: Icon }) => (
              <div key={path+label}
                onClick={() => navigate(path)}
                className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 cursor-pointer transition-colors">
                <Icon className="w-4 h-4 text-slate-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300 flex-shrink-0" />
              </div>
            ))}
          </SectionCard>

        </div>
      </div>
    </div>
  );
}
