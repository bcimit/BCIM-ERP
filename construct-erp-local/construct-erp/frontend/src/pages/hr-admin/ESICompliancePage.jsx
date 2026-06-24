// src/pages/hr-admin/ESICompliancePage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, Download, FileText } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const cur = new Date();

const fetchESI = (month, year) => API.get('/hr/compliance/esi', { params: { month, year } }).then(r => r.data);

export default function ESICompliancePage() {
  const [month, setMonth] = useState(cur.getMonth() + 1);
  const [year, setYear]   = useState(cur.getFullYear());

  const { data, isLoading } = useQuery({ queryKey: ['esi-compliance', month, year], queryFn: () => fetchESI(month, year) });
  const rows = data?.data?.employees || [];

  const totEmp = rows.reduce((s, r) => s + parseFloat(r.esi_employee || 0), 0);
  const totEr  = rows.reduce((s, r) => s + parseFloat(r.esi_employer || 0), 0);

  // ESI half-year: Apr–Sep = H1, Oct–Mar = H2
  const halfYear = month >= 4 && month <= 9 ? 'H1 (Apr–Sep)' : 'H2 (Oct–Mar)';

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#0EA5E915', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={18} color="#0EA5E9" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>ESI Compliance</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Employee State Insurance — monthly contribution &amp; half-yearly returns (Form 5/6)</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            {[cur.getFullYear() - 1, cur.getFullYear()].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 16px', marginBottom: 20, fontSize: 13, color: '#1D4ED8' }}>
        Half-year period: <strong>{halfYear} {year}</strong> · ESI applicable on gross salary ≤ ₹21,000/month · Employee: 0.75% | Employer: 3.25%
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'ESI Members',        value: rows.length,                                    color: '#374151' },
          { label: 'Employee ESI 0.75%', value: `₹${totEmp.toLocaleString('en-IN')}`,           color: B.purple },
          { label: 'Employer ESI 3.25%', value: `₹${totEr.toLocaleString('en-IN')}`,            color: '#2563EB' },
          { label: 'Total Challan',       value: `₹${(totEmp + totEr).toLocaleString('en-IN')}`, color: '#059669' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {['ESI Challan', 'Form 5 (Return)', 'Form 6 (Register)', 'Contribution Statement', 'Accident Report'].map(label => (
          <button key={label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#F8FAFC', color: '#374151', cursor: 'pointer' }}>
            <FileText size={13} /> {label}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['IP No.','Emp Code','Name','Gross Salary','ESI Wages','Emp ESI 0.75%','Er ESI 3.25%','Total'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No ESI data for {MONTHS[month-1]} {year}.<br /><span style={{ fontSize: 12 }}>Only employees with gross ≤ ₹21,000 are included.</span></td></tr>
            ) : rows.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '9px 14px', fontSize: 12, color: '#64748B', textAlign: 'right', fontFamily: 'monospace' }}>{r.ip_no || '—'}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, fontWeight: 700, color: '#374151', textAlign: 'right' }}>{r.employee_code}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, color: '#0F172A', textAlign: 'left', fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, textAlign: 'right', color: '#374151' }}>₹{Number(r.gross_salary||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, textAlign: 'right', color: '#374151' }}>₹{Number(r.esi_wages||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, textAlign: 'right', color: B.purple, fontWeight: 600 }}>₹{Number(r.esi_employee||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, textAlign: 'right', color: '#2563EB', fontWeight: 600 }}>₹{Number(r.esi_employer||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '9px 14px', fontSize: 12, textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>₹{(parseFloat(r.esi_employee||0)+parseFloat(r.esi_employer||0)).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#EFF6FF', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={4} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Total</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, textAlign: 'right' }}>₹{rows.reduce((s,r)=>s+parseFloat(r.esi_wages||0),0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: B.purple, textAlign: 'right' }}>₹{totEmp.toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#2563EB', textAlign: 'right' }}>₹{totEr.toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#059669', textAlign: 'right' }}>₹{(totEmp+totEr).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
