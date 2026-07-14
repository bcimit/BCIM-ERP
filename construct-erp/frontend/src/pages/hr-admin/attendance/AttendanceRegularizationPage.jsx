import React, { useState } from 'react';
import { ClipboardList, Clock, CheckCircle, XCircle, AlertCircle, User, Calendar, MessageSquare } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { hrAttendanceAPI } from '../../../api/client';
import toast from 'react-hot-toast';

const TABS = [
  { key: 'all',      label: 'All Requests',     icon: ClipboardList, color: '#64748B' },
  { key: 'pending',  label: 'Pending',           icon: Clock,         color: '#F59E0B' },
  { key: 'approved', label: 'Approved',          icon: CheckCircle,   color: '#10B981' },
  { key: 'rejected', label: 'Rejected',          icon: XCircle,       color: '#EF4444' },
];

const STATUS_STYLE = {
  pending:  'bg-amber-100 text-amber-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-600',
};

function RequestRow({ req, onApprove, onReject, isPending }) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-start gap-3">
        <div className="p-2 bg-slate-100 rounded-full">
          <User size={14} className="text-slate-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{req.employee_name || req.employee_id}</p>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Calendar size={11} /> {req.date}</span>
            {req.reason && <span className="flex items-center gap-1"><MessageSquare size={11} /> {req.reason}</span>}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
            {req.original_in && <span>Original In: {req.original_in}</span>}
            {req.original_out && <span>Original Out: {req.original_out}</span>}
            {req.requested_in && <span className="text-blue-600">→ {req.requested_in}</span>}
            {req.requested_out && <span className="text-blue-600">→ {req.requested_out}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLE[req.status] || 'bg-slate-100 text-slate-500'}`}>
          {req.status}
        </span>
        {req.status === 'pending' && (
          <>
            <button
              onClick={() => onApprove(req.id)}
              disabled={isPending}
              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
            >
              Approve
            </button>
            <button
              onClick={() => onReject(req.id)}
              disabled={isPending}
              className="px-3 py-1 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs font-semibold rounded-lg"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function AttendanceRegularizationPage() {
  const [tab, setTab] = useState('pending');
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['regularization', tab],
    queryFn: () =>
      hrAttendanceAPI.getRegularizationRequests?.({ status: tab === 'all' ? undefined : tab })
        .then(r => r.data)
        .catch(() => []),
    enabled: !!hrAttendanceAPI.getRegularizationRequests,
  });

  const approve = useMutation({
    mutationFn: (id) => hrAttendanceAPI.approveRegularization?.(id),
    onSuccess: () => { toast.success('Request approved'); qc.invalidateQueries(['regularization']); },
    onError: e => toast.error(e.response?.data?.error || 'Failed'),
  });

  const reject = useMutation({
    mutationFn: (id) => hrAttendanceAPI.rejectRegularization?.(id),
    onSuccess: () => { toast.success('Request rejected'); qc.invalidateQueries(['regularization']); },
    onError: e => toast.error(e.response?.data?.error || 'Failed'),
  });

  const rows = Array.isArray(data) ? data : [];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardList size={20} className="text-indigo-500" /> Attendance Regularization
        </h1>
        <p className="text-sm text-slate-500 mt-0.5">Review and approve employee punch-time correction requests</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <Icon size={12} style={{ color: tab === t.key ? t.color : undefined }} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-xl">
          <AlertCircle size={28} className="text-slate-200 mx-auto mb-2" />
          <p className="text-slate-300 text-sm">
            {tab === 'pending' ? 'No pending requests' : `No ${tab} requests`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map(req => (
            <RequestRow
              key={req.id}
              req={req}
              onApprove={(id) => approve.mutate(id)}
              onReject={(id) => reject.mutate(id)}
              isPending={approve.isPending || reject.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}
