// src/pages/hr-admin/LOPDaysPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarX, Search, Save, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const fetchLOP = (month, year) => API.get('/hr/lop-days', { params: { month, year } }).then(r => r.data);

export default function LOPDaysPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth);
  const [year,  setYear]  = useState(currentYear);
  const [search, setSearch] = useState('');
  const [edits, setEdits] = useState({});

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hr-lop-days', month, year],
    queryFn: () => fetchLOP(month, year),
  });
  const employees = data?.data || [];
  const filtered = employees.filter(e => !search || e.name?.toLowerCase().includes(search.toLowerCase()) || e.employee_code?.includes(search));

  const saveMut = useMutation({
    mutationFn: () => API.post('/hr/lop-days', { month, year, entries: Object.entries(edits).map(([employee_id, lop_days]) => ({ employee_id: parseInt(employee_id), lop_days: parseFloat(lop_days) || 0 })) }),
    onSuccess: () => { toast.success('LOP days saved'); qc.invalidateQueries({ queryKey: ['hr-lop-days', month, year] }); setEdits({}); },
    onError: e => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  const setLOP = (empId, val) => setEdits(p => ({ ...p, [empId]: val }));
  const getLOP = (e) => edits[e.id] !== undefined ? edits[e.id] : (e.lop_days ?? '');

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarX size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Employee LOP Days</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Enter Loss of Pay (LOP) days for employees before running payroll for the month.</p>
      </div>

      {/* Controls */}
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter by name or code"
              style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
        {Object.keys(edits).length > 0 && (
          <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Save size={15} /> {saveMut.isPending ? 'Saving…' : `Save ${Object.keys(edits).length} Change${Object.keys(edits).length > 1 ? 's' : ''}`}
          </button>
        )}
      </div>

      {Object.keys(edits).length > 0 && (
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#92400E' }}>
          <AlertCircle size={14} /> {Object.keys(edits).length} unsaved change(s). Click Save to apply.
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Emp Code', 'Employee Name', 'Department', 'Working Days', 'LOP Days', 'Net Days'].map(h => (
                <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No employees found.</td></tr>
            ) : filtered.map((e, i) => {
              const lop = parseFloat(getLOP(e)) || 0;
              const net = (e.working_days || 26) - lop;
              const hasEdit = edits[e.id] !== undefined;
              return (
                <tr key={e.id || i} style={{ borderBottom: '1px solid #F8FAFC', background: hasEdit ? '#FAFBFF' : 'transparent' }}>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{e.employee_code}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{e.name}</td>
                  <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748B' }}>{e.department || '—'}</td>
                  <td style={{ padding: '10px 16px', fontSize: 13, color: '#64748B', textAlign: 'center' }}>{e.working_days || 26}</td>
                  <td style={{ padding: '10px 16px' }}>
                    <input
                      type="number" min="0" max="31" step="0.5"
                      value={getLOP(e)}
                      onChange={ev => setLOP(e.id, ev.target.value)}
                      style={{ width: 72, padding: '6px 10px', border: `1px solid ${hasEdit ? B.purple : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, textAlign: 'center', outline: 'none', fontWeight: hasEdit ? 700 : 400 }}
                    />
                  </td>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: net < 0 ? '#DC2626' : '#15803D', textAlign: 'center' }}>{net.toFixed(1)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
