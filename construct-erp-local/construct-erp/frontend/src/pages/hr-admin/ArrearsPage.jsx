// src/pages/hr-admin/ArrearsPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DollarSign, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const cur = new Date();

const fetchArrears = (month, year) =>
  API.get('/hr/arrears', { params: { month, year } }).then(r => r.data);

export default function ArrearsPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(cur.getMonth() + 1);
  const [year, setYear]   = useState(cur.getFullYear());
  const [edits, setEdits] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['arrears', month, year],
    queryFn: () => fetchArrears(month, year),
  });
  const rows = data?.data || [];

  useEffect(() => { setEdits({}); }, [month, year]);

  const changed = Object.keys(edits);

  const saveMut = useMutation({
    mutationFn: () => API.post('/hr/arrears', {
      month, year,
      entries: changed.map(id => ({ employee_id: id, amount: parseFloat(edits[id]) || 0 })),
    }),
    onSuccess: () => { toast.success(`Saved ${changed.length} arrear entries`); qc.invalidateQueries({ queryKey: ['arrears', month, year] }); setEdits({}); },
    onError: (e) => toast.error(e.response?.data?.error || 'Save failed'),
  });

  const val = (row) => edits[row.id] !== undefined ? edits[row.id] : (row.amount || '');
  const totalArrears = rows.reduce((s, r) => s + parseFloat(edits[r.id] !== undefined ? edits[r.id] : (r.amount || 0)), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <DollarSign size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Arrears</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Enter arrear amounts to be paid with the selected month's payroll.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none' }}>
            {[cur.getFullYear() - 1, cur.getFullYear(), cur.getFullYear() + 1].map(y => <option key={y}>{y}</option>)}
          </select>
          {changed.length > 0 && (
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Save size={14} /> Save {changed.length} Changes
            </button>
          )}
        </div>
      </div>

      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#1D4ED8' }}>
        Total arrears for {MONTHS[month - 1]} {year}: <strong>₹{totalArrears.toLocaleString('en-IN')}</strong>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#','Emp Code','Employee Name','Department','Arrear Description','Amount (₹)'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No employees found.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', background: edits[r.id] !== undefined ? '#F5F3FF' : '#fff' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8' }}>{i + 1}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.department || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>
                  <input value={r.description || ''} readOnly placeholder="e.g. Salary Revision Arrear"
                    style={{ width: '100%', padding: '6px 10px', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 12, background: '#F8FAFC', outline: 'none' }} />
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={val(r)}
                    onChange={e => setEdits(prev => ({ ...prev, [r.id]: e.target.value }))}
                    placeholder="0"
                    style={{ width: 120, padding: '6px 10px', border: `1px solid ${edits[r.id] !== undefined ? B.purple : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, fontWeight: 600, outline: 'none', textAlign: 'right' }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
