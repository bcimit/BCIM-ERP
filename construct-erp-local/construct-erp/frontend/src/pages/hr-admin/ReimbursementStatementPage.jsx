// src/pages/hr-admin/ReimbursementStatementPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Download } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const cur = new Date();

const fetchEmps  = () => API.get('/hr/employees/active').then(r => r.data);
const fetchStmt  = (empId, year) => API.get(`/hr/reimbursement-statement/${empId}`, { params: { year } }).then(r => r.data);

const STATUS_STYLE = {
  approved:  { bg: '#F0FDF4', color: '#15803D' },
  pending:   { bg: '#FFFBEB', color: '#B45309' },
  rejected:  { bg: '#FEF2F2', color: '#DC2626' },
  paid:      { bg: '#EFF6FF', color: '#1D4ED8' },
};

export default function ReimbursementStatementPage() {
  const [year, setYear]   = useState(cur.getFullYear());
  const [empId, setEmpId] = useState('');

  const { data: empsData } = useQuery({ queryKey: ['active-employees'], queryFn: fetchEmps });
  const employees = empsData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['reimbursement-statement', empId, year],
    queryFn: () => fetchStmt(empId, year),
    enabled: !!empId,
  });

  const rows = data?.data || [];
  const total = rows.reduce((s, r) => s + parseFloat(r.amount || 0), 0);
  const paid  = rows.filter(r => r.status === 'paid' || r.status === 'approved').reduce((s, r) => s + parseFloat(r.amount || 0), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Reimbursement Statement</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Employee-wise reimbursement claim history for the financial year.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={empId} onChange={e => setEmpId(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none', minWidth: 220 }}>
            <option value="">Select Employee…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 700, background: '#F8FAFC', color: B.purple, outline: 'none' }}>
            {[cur.getFullYear() - 1, cur.getFullYear()].map(y => <option key={y}>{y}</option>)}
          </select>
          {empId && rows.length > 0 && (
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', color: '#374151', cursor: 'pointer' }}>
              <Download size={13} /> Export
            </button>
          )}
        </div>
      </div>

      {!empId ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14 }}>
          Select an employee to view their reimbursement statement.
        </div>
      ) : isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 20 }}>
            {[
              { label: 'Total Claims', value: rows.length, color: '#374151' },
              { label: 'Total Amount',  value: `₹${total.toLocaleString('en-IN')}`,  color: B.purple },
              { label: 'Approved/Paid', value: `₹${paid.toLocaleString('en-IN')}`,  color: '#059669' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['#','Date','Category','Description','Amount','Status','Paid On'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 ? (
                  <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No reimbursement claims for {year}.</td></tr>
                ) : rows.map((r, i) => {
                  const st = STATUS_STYLE[r.status] || STATUS_STYLE.pending;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8' }}>{i + 1}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>{r.claim_date ? new Date(r.claim_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.category || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151', maxWidth: 200 }}>{r.description || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>₹{Number(r.amount).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: st.bg, color: st.color, textTransform: 'capitalize' }}>{r.status}</span>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.paid_date ? new Date(r.paid_date).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot>
                  <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                    <td colSpan={4} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#374151' }}>Total</td>
                    <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 800, color: B.purple }}>₹{total.toLocaleString('en-IN')}</td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </>
      )}
    </div>
  );
}
