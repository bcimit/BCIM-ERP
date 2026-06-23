// src/pages/hr-admin/StopSalaryProcessingPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { StopCircle, Plus, Trash2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });

const fetchStopped = () => API.get('/hr/stop-salary').then(r => r.data);
const fetchEmps    = (q) => API.get('/hr/employees/search', { params: { q } }).then(r => r.data);

const REASONS = ['Absconding', 'Under Investigation', 'Pending Clearance', 'Legal Hold', 'Management Decision', 'Other'];

export default function StopSalaryProcessingPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm]           = useState({ employee_id: '', reason: '', remarks: '' });
  const [empSearch, setEmpSearch] = useState('');
  const [empResults, setEmpResults] = useState([]);

  const { data, isLoading } = useQuery({ queryKey: ['stop-salary'], queryFn: fetchStopped });
  const rows = data?.data || [];

  const addMut = useMutation({
    mutationFn: (body) => API.post('/hr/stop-salary', body),
    onSuccess: () => { toast.success('Salary processing stopped'); qc.invalidateQueries({ queryKey: ['stop-salary'] }); setShowModal(false); setForm({ employee_id: '', reason: '', remarks: '' }); },
    onError: (e) => toast.error(e.response?.data?.error || 'Failed'),
  });

  const removeMut = useMutation({
    mutationFn: (id) => API.delete(`/hr/stop-salary/${id}`),
    onSuccess: () => { toast.success('Salary processing resumed'); qc.invalidateQueries({ queryKey: ['stop-salary'] }); },
  });

  const searchEmp = async (val) => {
    setEmpSearch(val);
    if (val.length < 2) { setEmpResults([]); return; }
    try { const r = await fetchEmps(val); setEmpResults(r.data || []); } catch { setEmpResults([]); }
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#FEF2F215', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #FECACA' }}>
            <StopCircle size={18} color="#DC2626" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Stop Salary Processing</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Permanently exclude employees from payroll runs until manually resumed.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> Stop Salary
        </button>
      </div>

      <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: 13, color: '#991B1B' }}>
        Employees listed here will be <strong>excluded from all future payroll runs</strong> until the stop is removed. This is different from Hold Salary (which is month-specific).
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Emp Code','Employee Name','Department','Reason','Stopped On','Added By','Action'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No employees have salary processing stopped.</td></tr>
            ) : rows.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', background: '#FFF5F5' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.department || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: '#DC2626' }}>{r.reason}</span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.added_by || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button onClick={() => removeMut.mutate(r.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 12px', background: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    Resume
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 480, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>Stop Salary Processing</h2>
              <button onClick={() => setShowModal(false)} style={{ background: 'transparent', border: 'none', fontSize: 20, color: '#94A3B8', cursor: 'pointer' }}>×</button>
            </div>

            <div style={{ marginBottom: 14, position: 'relative' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Employee *</label>
              <div style={{ position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 10, top: 10, color: '#94A3B8' }} />
                <input value={empSearch} onChange={e => searchEmp(e.target.value)} placeholder="Search by name or code…"
                  style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>
              {empResults.length > 0 && (
                <div style={{ position: 'absolute', zIndex: 10, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 8, width: '100%', maxHeight: 180, overflowY: 'auto', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                  {empResults.map(e => (
                    <div key={e.id} onClick={() => { setForm(f => ({ ...f, employee_id: e.id })); setEmpSearch(`${e.name} (${e.employee_code})`); setEmpResults([]); }}
                      style={{ padding: '9px 14px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}
                      onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={ev => ev.currentTarget.style.background = '#fff'}>
                      <strong>{e.name}</strong> <span style={{ color: '#94A3B8' }}>({e.employee_code})</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Reason *</label>
              <select value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none' }}>
                <option value="">Select reason…</option>
                {REASONS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Remarks</label>
              <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={3}
                style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 20px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#F8FAFC', color: '#64748B', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => addMut.mutate(form)} disabled={!form.employee_id || !form.reason || addMut.isPending}
                style={{ padding: '9px 20px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: (!form.employee_id || !form.reason) ? 0.6 : 1 }}>
                {addMut.isPending ? 'Saving…' : 'Stop Processing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
