// src/pages/hr-admin/HoldSalaryPayoutPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PauseCircle, Search, Plus, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { hrEmployeesAPI } from '../../api/client';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;
const REASONS = ['Disciplinary Action', 'Pending Full & Final Settlement', 'Missing Bank Details', 'Compliance Hold', 'Employee Request', 'Other'];

const fetchHolds = (m, y) => API.get('/hr/hold-salary', { params: { month: m, year: y } }).then(r => r.data);

export default function HoldSalaryPayoutPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth);
  const [year,  setYear]  = useState(currentYear);
  const [search, setSearch] = useState('');
  const [modal, setModal]   = useState(false);
  const [empSearch, setEmpSearch] = useState('');
  const [selEmp, setSelEmp] = useState(null);
  const [reason, setReason] = useState(REASONS[0]);
  const [remarks, setRemarks] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['hold-salary', month, year],
    queryFn: () => fetchHolds(month, year),
  });
  const holds = data?.data || [];
  const filtered = holds.filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.employee_code?.includes(search));

  const { data: empData } = useQuery({
    queryKey: ['hr-emp-hold', empSearch],
    queryFn: () => hrEmployeesAPI.list({ search: empSearch }).then(r => r.data),
    enabled: empSearch.length > 1,
  });
  const empOptions = empData?.data || [];

  const addMut = useMutation({
    mutationFn: () => API.post('/hr/hold-salary', { employee_id: selEmp?.id, month, year, reason, remarks }),
    onSuccess: () => { toast.success('Hold added'); qc.invalidateQueries({ queryKey: ['hold-salary', month, year] }); setModal(false); setSelEmp(null); setEmpSearch(''); setRemarks(''); },
    onError: e => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const releaseMut = useMutation({
    mutationFn: (id) => API.delete(`/hr/hold-salary/${id}`),
    onSuccess: () => { toast.success('Hold released'); qc.invalidateQueries({ queryKey: ['hold-salary', month, year] }); },
    onError: () => toast.error('Release failed'),
  });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PauseCircle size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Hold Salary Payout</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Flag employees whose salary should be held back from the current payroll run.</p>
          </div>
        </div>
        <button onClick={() => setModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> Add Hold
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Month</div>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Year</div>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
            {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Search</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter"
              style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      {holds.length > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '10px 16px', marginBottom: 16, fontSize: 13, fontWeight: 700, color: '#B91C1C' }}>
          {holds.length} employee{holds.length > 1 ? 's' : ''} on salary hold for {MONTHS[month-1]} {year}
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Emp Code', 'Name', 'Department', 'Reason', 'Remarks', 'Added By', 'Action'].map(h => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No salary holds for {MONTHS[month-1]} {year}.</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={r.id || i} style={{ borderBottom: '1px solid #F8FAFC', background: '#FFF8F8' }}>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{r.employee_code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{r.department || '—'}</td>
                <td style={{ padding: '10px 14px' }}><span style={{ fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: '#B91C1C', borderRadius: 6, padding: '3px 8px' }}>{r.reason}</span></td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{r.remarks || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{r.added_by || 'HR Admin'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <button onClick={() => releaseMut.mutate(r.id)}
                    style={{ padding: '5px 12px', border: '1px solid #D1FAE5', borderRadius: 6, background: '#F0FDF4', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: '#15803D' }}>
                    Release
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Hold Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 460, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>Add Salary Hold</h2>
              <button onClick={() => setModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} color="#64748B" /></button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Employee</div>
                <div style={{ position: 'relative' }}>
                  <input value={selEmp ? `${selEmp.employee_code} – ${selEmp.name}` : empSearch} onChange={e => { setEmpSearch(e.target.value); setSelEmp(null); }} placeholder="Search employee"
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
                  {empSearch && empOptions.length > 0 && !selEmp && (
                    <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50 }}>
                      {empOptions.slice(0, 5).map(e => (
                        <button key={e.id} onClick={() => { setSelEmp(e); setEmpSearch(''); }}
                          style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}>
                          {e.name} · {e.employee_code}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Reason</div>
                <select value={reason} onChange={e => setReason(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
                  {REASONS.map(r => <option key={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>Remarks</div>
                <textarea value={remarks} onChange={e => setRemarks(e.target.value)} rows={3} placeholder="Additional notes…"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 18px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#F8FAFC', color: '#64748B', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => addMut.mutate()} disabled={!selEmp || addMut.isPending}
                style={{ padding: '9px 18px', background: '#DC2626', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {addMut.isPending ? 'Saving…' : 'Hold Salary'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
