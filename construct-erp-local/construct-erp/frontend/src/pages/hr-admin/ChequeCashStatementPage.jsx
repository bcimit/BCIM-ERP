// src/pages/hr-admin/ChequeCashStatementPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Download, Printer } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const cur = new Date();

const fetch = (month, year) =>
  API.get('/hr/cheque-cash-statement', { params: { month, year } }).then(r => r.data);

export default function ChequeCashStatementPage() {
  const [month, setMonth] = useState(cur.getMonth() + 1);
  const [year, setYear]   = useState(cur.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['cheque-cash-statement', month, year],
    queryFn: () => fetch(month, year),
  });
  const rows = data?.data || [];

  const totalCheque = rows.filter(r => r.payment_mode === 'cheque').reduce((s, r) => s + parseFloat(r.net_pay || 0), 0);
  const totalCash   = rows.filter(r => r.payment_mode === 'cash').reduce((s, r) => s + parseFloat(r.net_pay || 0), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Cheque / Cash Statement</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Employees paid by cheque or cash for the selected month.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none' }}>
            {[cur.getFullYear() - 1, cur.getFullYear(), cur.getFullYear() + 1].map(y => <option key={y}>{y}</option>)}
          </select>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={14} /> Export
          </button>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', color: '#374151', cursor: 'pointer' }}>
            <Printer size={14} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: 'Total Employees', value: rows.length, color: '#7C3AED' },
          { label: 'Cheque Total',    value: `₹${totalCheque.toLocaleString('en-IN')}`, color: '#0EA5E9' },
          { label: 'Cash Total',      value: `₹${totalCash.toLocaleString('en-IN')}`,   color: '#10B981' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#','Emp Code','Employee Name','Department','Mode','Cheque/Ref No.','Net Pay','Status'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No cheque/cash payments for this period.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8' }}>{i + 1}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#0F172A', fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.department || '—'}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: r.payment_mode === 'cheque' ? '#EFF6FF' : '#F0FDF4',
                    color: r.payment_mode === 'cheque' ? '#1D4ED8' : '#15803D' }}>
                    {r.payment_mode === 'cheque' ? 'Cheque' : 'Cash'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151', fontFamily: 'monospace' }}>{r.cheque_no || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>₹{Number(r.net_pay).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                    background: r.status === 'paid' ? '#F0FDF4' : '#FFFBEB',
                    color: r.status === 'paid' ? '#15803D' : '#B45309' }}>
                    {r.status === 'paid' ? 'Paid' : 'Pending'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={7} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>
                  Grand Total: ₹{(totalCheque + totalCash).toLocaleString('en-IN')}
                </td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
