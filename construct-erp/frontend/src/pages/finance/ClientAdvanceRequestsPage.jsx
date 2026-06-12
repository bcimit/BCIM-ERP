// src/pages/finance/ClientAdvanceRequestsPage.jsx
// Track proforma vouchers submitted to the client requesting an advance.
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientAdvanceAPI, projectAPI } from '../../api/client';
import {
  Coins, Plus, X, Check, Trash2, FileText, Send, CheckCircle2, Banknote, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const inr = v => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS = {
  submitted: { label: 'Submitted',  cls: 'bg-amber-50 text-amber-700 border-amber-200',     icon: Send },
  approved:  { label: 'Approved',   cls: 'bg-blue-50 text-blue-700 border-blue-200',         icon: CheckCircle2 },
  received:  { label: 'Received',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', icon: Banknote },
  rejected:  { label: 'Rejected',   cls: 'bg-red-50 text-red-700 border-red-200',            icon: X },
};

export default function ClientAdvanceRequestsPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [receiveFor, setReceiveFor] = useState(null);

  const { data: rows = [] } = useQuery({
    queryKey: ['client-advances'],
    queryFn: () => clientAdvanceAPI.list().then(r => r.data?.data || []),
  });
  const { data: stats = {} } = useQuery({
    queryKey: ['client-advances', 'stats'],
    queryFn: () => clientAdvanceAPI.stats().then(r => r.data?.data || {}),
  });
  const { data: projects = [] } = useQuery({
    queryKey: ['projects', 'all'],
    queryFn: () => projectAPI.list().then(r => r.data?.data || r.data || []),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['client-advances'] });
    qc.invalidateQueries({ queryKey: ['project'] });
  };

  const create = useMutation({
    mutationFn: (d) => clientAdvanceAPI.create(d),
    onSuccess: () => { invalidate(); setShowForm(false); toast.success('Advance request recorded'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const updateStatus = useMutation({
    mutationFn: ({ id, status }) => clientAdvanceAPI.update(id, { status, approved_date: status === 'approved' ? new Date().toISOString().slice(0,10) : undefined }),
    onSuccess: () => { invalidate(); toast.success('Status updated'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const receive = useMutation({
    mutationFn: ({ id, ...d }) => clientAdvanceAPI.receive(id, d),
    onSuccess: () => { invalidate(); setReceiveFor(null); toast.success('Marked received — project advance updated'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });
  const remove = useMutation({
    mutationFn: (id) => clientAdvanceAPI.remove(id),
    onSuccess: () => { invalidate(); toast.success('Deleted'); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-center text-amber-600">
            <Coins size={18} />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-800">Client Advance Requests</h1>
            <p className="text-xs text-slate-500">Proforma vouchers submitted to client for advance payment</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700">
          <Plus size={15} /> New Request
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <StatCard label="Total Requested" value={inr(stats.total_requested)} icon={<FileText size={16} />} tone="slate" />
        <StatCard label="Pending (Submitted / Approved)" value={inr(stats.total_pending)} icon={<Clock size={16} />} tone="amber" />
        <StatCard label="Total Received" value={inr(stats.total_received)} icon={<Banknote size={16} />} tone="emerald" />
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase">
            <tr>
              <th className="text-left px-4 py-3 font-semibold">Proforma No</th>
              <th className="text-left px-4 py-3 font-semibold">Project</th>
              <th className="text-left px-4 py-3 font-semibold">Date</th>
              <th className="text-right px-4 py-3 font-semibold">Advance</th>
              <th className="text-center px-4 py-3 font-semibold">Status</th>
              <th className="text-right px-4 py-3 font-semibold">Received</th>
              <th className="text-center px-4 py-3 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-400">No advance requests yet</td></tr>
            ) : rows.map(r => {
              const st = STATUS[r.status] || STATUS.submitted;
              const StIcon = st.icon;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{r.proforma_no}</td>
                  <td className="px-4 py-3">
                    <div className="text-slate-800">{r.project_name || '—'}</div>
                    {r.work_description && <div className="text-xs text-slate-400 truncate max-w-[200px]">{r.work_description}</div>}
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{r.proforma_date ? new Date(r.proforma_date).toLocaleDateString('en-IN') : '—'}</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-800">{inr(r.advance_amount)}
                    {r.advance_pct > 0 && <span className="text-xs text-slate-400 ml-1">({r.advance_pct}%)</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-xs font-medium', st.cls)}>
                      <StIcon size={11} /> {st.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-emerald-700">{r.status === 'received' ? inr(r.received_amount) : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      {r.status === 'submitted' && (
                        <button onClick={() => updateStatus.mutate({ id: r.id, status: 'approved' })}
                          title="Mark approved by client"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg"><CheckCircle2 size={15} /></button>
                      )}
                      {(r.status === 'submitted' || r.status === 'approved') && (
                        <button onClick={() => setReceiveFor(r)}
                          title="Mark advance received"
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Banknote size={15} /></button>
                      )}
                      <button onClick={() => { if (window.confirm('Delete this request?')) remove.mutate(r.id); }}
                        title="Delete"
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {showForm && <FormModal projects={projects} onClose={() => setShowForm(false)} onSubmit={d => create.mutate(d)} saving={create.isPending} />}
      {receiveFor && <ReceiveModal row={receiveFor} onClose={() => setReceiveFor(null)} onSubmit={d => receive.mutate({ id: receiveFor.id, ...d })} saving={receive.isPending} />}
    </div>
  );
}

function StatCard({ label, value, icon, tone }) {
  const tones = {
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={clsx('w-7 h-7 rounded-lg border flex items-center justify-center', tones[tone])}>{icon}</span>
        <span className="text-xs text-slate-500">{label}</span>
      </div>
      <div className="text-xl font-bold font-mono text-slate-800">{value}</div>
    </div>
  );
}

function FormModal({ projects, onClose, onSubmit, saving }) {
  const [f, setF] = useState({
    project_id: '', proforma_no: '', proforma_date: new Date().toISOString().slice(0,10),
    work_description: '', advance_amount: '', advance_pct: '', tax_amount: '', remarks: '',
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const total = (parseFloat(f.advance_amount) || 0) + (parseFloat(f.tax_amount) || 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">New Advance Request</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <Field label="Project *">
            <select value={f.project_id} onChange={e => set('project_id', e.target.value)} className="inp">
              <option value="">Select project…</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name} ({p.project_code})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Proforma Voucher No"><input value={f.proforma_no} onChange={e => set('proforma_no', e.target.value)} placeholder="Auto if blank" className="inp" /></Field>
            <Field label="Proforma Date"><input type="date" value={f.proforma_date} onChange={e => set('proforma_date', e.target.value)} className="inp" /></Field>
          </div>
          <Field label="Work Description"><textarea value={f.work_description} onChange={e => set('work_description', e.target.value)} rows={2} className="inp" /></Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Advance Amount *"><input type="number" min="0" step="0.01" value={f.advance_amount} onChange={e => set('advance_amount', e.target.value)} className="inp font-mono" /></Field>
            <Field label="Advance %"><input type="number" min="0" step="0.01" value={f.advance_pct} onChange={e => set('advance_pct', e.target.value)} className="inp font-mono" /></Field>
            <Field label="Tax / GST"><input type="number" min="0" step="0.01" value={f.tax_amount} onChange={e => set('tax_amount', e.target.value)} className="inp font-mono" /></Field>
          </div>
          <div className="flex justify-between items-center px-3 py-2 bg-amber-50 rounded-lg border border-amber-100">
            <span className="text-xs font-medium text-amber-700">Total Amount</span>
            <span className="font-mono font-bold text-amber-900">{inr(total)}</span>
          </div>
          <Field label="Remarks"><input value={f.remarks} onChange={e => set('remarks', e.target.value)} className="inp" /></Field>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button disabled={!f.project_id || !f.advance_amount || saving}
            onClick={() => onSubmit(f)}
            className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 flex items-center gap-1.5">
            <Check size={15} /> Save Request
          </button>
        </div>
      </div>
      <style>{`.inp{width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;font-size:13px;outline:none}.inp:focus{border-color:#F59E0B;box-shadow:0 0 0 3px rgba(245,158,11,0.15)}`}</style>
    </div>
  );
}

function ReceiveModal({ row, onClose, onSubmit, saving }) {
  const [f, setF] = useState({
    received_amount: row.advance_amount || '', received_date: new Date().toISOString().slice(0,10), bank_reference: '',
  });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">Mark Advance Received</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:bg-slate-100 rounded"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-slate-500">{row.proforma_no} · {row.project_name}. This amount will be added to the project's <b>Advance Received from Client</b>.</p>
          <Field label="Amount Received *"><input type="number" min="0" step="0.01" value={f.received_amount} onChange={e => set('received_amount', e.target.value)} className="inp font-mono" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date Received"><input type="date" value={f.received_date} onChange={e => set('received_date', e.target.value)} className="inp" /></Field>
            <Field label="Bank Reference"><input value={f.bank_reference} onChange={e => set('bank_reference', e.target.value)} placeholder="UTR / cheque no" className="inp" /></Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-slate-100">
          <button onClick={onClose} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
          <button disabled={!f.received_amount || saving} onClick={() => onSubmit(f)}
            className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5">
            <Banknote size={15} /> Confirm Received
          </button>
        </div>
      </div>
      <style>{`.inp{width:100%;border:1px solid #E2E8F0;border-radius:8px;padding:8px 10px;font-size:13px;outline:none}.inp:focus{border-color:#10B981;box-shadow:0 0 0 3px rgba(16,185,129,0.15)}`}</style>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
