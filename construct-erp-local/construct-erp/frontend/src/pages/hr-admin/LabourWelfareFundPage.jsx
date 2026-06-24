// src/pages/hr-admin/LabourWelfareFundPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Heart, Download, Info } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const cur = new Date();

const fetchLWF = (period, year) => API.get('/hr/compliance/lwf', { params: { period, year } }).then(r => r.data);

export default function LabourWelfareFundPage() {
  const [period, setPeriod] = useState('H2'); // H1: Jan-Jun, H2: Jul-Dec
  const [year, setYear]     = useState(cur.getFullYear());

  const { data, isLoading } = useQuery({ queryKey: ['lwf', period, year], queryFn: () => fetchLWF(period, year) });
  const rows = data?.data || [];
  const totEmp = rows.reduce((s, r) => s + parseFloat(r.lwf_employee || 0), 0);
  const totEr  = rows.reduce((s, r) => s + parseFloat(r.lwf_employer || 0), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EC489915', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Heart size={18} color="#EC4899" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Labour Welfare Fund (LWF)</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Bi-annual LWF contributions — employee &amp; employer share</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={period} onChange={e => setPeriod(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            <option value="H1">H1 (Jan–Jun)</option>
            <option value="H2">H2 (Jul–Dec)</option>
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            {[cur.getFullYear()-1, cur.getFullYear()].map(y => <option key={y}>{y}</option>)}
          </select>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#EC4899', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={14} /> LWF Challan
          </button>
        </div>
      </div>

      <div style={{ background: '#FDF2F8', border: '1px solid #FBCFE8', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
        <Info size={15} color="#BE185D" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: '#831843' }}>
          LWF rates vary by state. Typical (Maharashtra): Employee ₹6/half-year · Employer ₹12/half-year.
          Due date: <strong>15 Jan</strong> (for Jul–Dec) and <strong>15 Jul</strong> (for Jan–Jun).
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'LWF Members',    value: rows.length,                               color: '#374151' },
          { label: 'Employee Share', value: `₹${totEmp.toLocaleString('en-IN')}`,      color: '#EC4899' },
          { label: 'Employer Share', value: `₹${totEr.toLocaleString('en-IN')}`,       color: B.purple },
          { label: 'Total Challan',  value: `₹${(totEmp+totEr).toLocaleString('en-IN')}`, color: '#059669' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#','Emp Code','Name','Department','Gross Salary','Employee LWF','Employer LWF','Total'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No LWF data for {period} {year}.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8' }}>{i+1}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.department || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13 }}>₹{Number(r.gross_salary||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#EC4899' }}>₹{Number(r.lwf_employee||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: B.purple }}>₹{Number(r.lwf_employer||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800 }}>₹{(parseFloat(r.lwf_employee||0)+parseFloat(r.lwf_employer||0)).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#FDF2F8', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={5} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>Total</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#EC4899' }}>₹{totEmp.toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: B.purple }}>₹{totEr.toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 900, color: '#059669' }}>₹{(totEmp+totEr).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
