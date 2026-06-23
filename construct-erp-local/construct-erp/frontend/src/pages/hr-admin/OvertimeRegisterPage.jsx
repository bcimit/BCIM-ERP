// src/pages/hr-admin/OvertimeRegisterPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Timer, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const cur = new Date();

const fetchOT = (month, year) =>
  API.get('/hr/overtime', { params: { month, year } }).then(r => r.data);

export default function OvertimeRegisterPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(cur.getMonth() + 1);
  const [year, setYear]   = useState(cur.getFullYear());
  const [edits, setEdits] = useState({});

  const { data, isLoading } = useQuery({
    queryKey: ['overtime', month, year],
    queryFn: () => fetchOT(month, year),
  });
  const rows = data?.data || [];

  useEffect(() => { setEdits({}); }, [month, year]);

  const changed = Object.keys(edits);
  const totalHours = rows.reduce((s, r) => s + parseFloat(edits[r.id]?.hours !== undefined ? edits[r.id].hours : (r.ot_hours || 0)), 0);

  const saveMut = useMutation({
    mutationFn: () => API.post('/hr/overtime', {
      month, year,
      entries: changed.map(id => ({ employee_id: id, ot_hours: parseFloat(edits[id]?.hours) || 0, ot_rate: parseFloat(edits[id]?.rate) || 0 })),
    }),
    onSuccess: () => { toast.success(`Saved ${changed.length} OT entries`); qc.invalidateQueries({ queryKey: ['overtime', month, year] }); setEdits({}); },
    onError: (e) => toast.error(e.response?.data?.error || 'Save failed'),
  });

  const getVal = (row, field) => {
    if (edits[row.id]?.[field] !== undefined) return edits[row.id][field];
    return field === 'hours' ? (row.ot_hours || '') : (row.ot_rate || '');
  };

  const setEdit = (id, field, val) => setEdits(prev => ({ ...prev, [id]: { ...prev[id], [field]: val } }));

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Timer size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Overtime Register</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Log overtime hours and rates for payroll inclusion.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none' }}>
            {[cur.getFullYear() - 1, cur.getFullYear()].map(y => <option key={y}>{y}</option>)}
          </select>
          {changed.length > 0 && (
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Save size={14} /> Save {changed.length} Changes
            </button>
          )}
        </div>
      </div>

      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#15803D' }}>
        Total OT hours for {MONTHS[month - 1]} {year}: <strong>{totalHours.toFixed(1)} hrs</strong>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#','Emp Code','Employee Name','Department','OT Hours','Rate/Hour (₹)','OT Amount (₹)'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No employees found.</td></tr>
            ) : rows.map((r, i) => {
              const hours  = parseFloat(getVal(r, 'hours')) || 0;
              const rate   = parseFloat(getVal(r, 'rate'))  || 0;
              const amount = hours * rate;
              const dirty  = edits[r.id] !== undefined;
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', background: dirty ? '#F5F3FF' : '#fff' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8' }}>{i + 1}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.department || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <input type="number" min="0" step="0.5" value={getVal(r, 'hours')}
                      onChange={e => setEdit(r.id, 'hours', e.target.value)} placeholder="0"
                      style={{ width: 80, padding: '6px 10px', border: `1px solid ${dirty ? B.purple : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, fontWeight: 600, outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <input type="number" min="0" step="1" value={getVal(r, 'rate')}
                      onChange={e => setEdit(r.id, 'rate', e.target.value)} placeholder="0"
                      style={{ width: 100, padding: '6px 10px', border: `1px solid ${dirty ? B.purple : '#E2E8F0'}`, borderRadius: 6, fontSize: 13, fontWeight: 600, outline: 'none', textAlign: 'right' }} />
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: amount > 0 ? 700 : 400, color: amount > 0 ? '#0F172A' : '#94A3B8' }}>
                    {amount > 0 ? `₹${amount.toLocaleString('en-IN')}` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
