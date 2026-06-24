// src/pages/hr-admin/PFCompliancePage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Download, FileText, Users } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const cur = new Date();

const fetchPF = (month, year) => API.get('/hr/compliance/pf', { params: { month, year } }).then(r => r.data);

export default function PFCompliancePage() {
  const [month, setMonth] = useState(cur.getMonth() + 1);
  const [year, setYear]   = useState(cur.getFullYear());

  const { data, isLoading } = useQuery({ queryKey: ['pf-compliance', month, year], queryFn: () => fetchPF(month, year) });
  const rows    = data?.data?.employees || [];
  const summary = data?.data?.summary   || {};

  const totEmp = rows.reduce((s, r) => s + parseFloat(r.pf_employee || 0), 0);
  const totEr  = rows.reduce((s, r) => s + parseFloat(r.pf_employer || 0), 0);
  const totEPS = rows.reduce((s, r) => s + parseFloat(r.eps || 0), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>PF Compliance</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Provident Fund — ECR filing, challan, Form 3A / 6A / 12A</p>
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

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'PF Members',        value: rows.length,                                      color: '#374151' },
          { label: 'PF Wages',          value: `₹${rows.reduce((s,r)=>s+parseFloat(r.pf_wages||0),0).toLocaleString('en-IN')}`, color: '#64748B' },
          { label: 'Employee PF (12%)', value: `₹${totEmp.toLocaleString('en-IN')}`,             color: B.purple },
          { label: 'Employer EPF+EPS',  value: `₹${totEr.toLocaleString('en-IN')}`,              color: '#2563EB' },
          { label: 'Total Challan',     value: `₹${(totEmp + totEr).toLocaleString('en-IN')}`,   color: '#059669' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Download ECR File',   icon: Download },
          { label: 'Form 3A (Annual)',     icon: FileText },
          { label: 'Form 6A (Annual)',     icon: FileText },
          { label: 'Form 12A (Monthly)',   icon: FileText },
          { label: 'PF Challan',          icon: Download },
        ].map(btn => (
          <button key={btn.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#F8FAFC', color: '#374151', cursor: 'pointer' }}>
            <btn.icon size={13} /> {btn.label}
          </button>
        ))}
      </div>

      {/* Employee-wise table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={15} color={B.purple} />
          <span style={{ fontWeight: 800, fontSize: 14, color: '#0F172A' }}>Employee-wise PF Register</span>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#94A3B8' }}>{rows.length} members</span>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC' }}>
                {['UAN','Emp Code','Name','PF Wages','Gross Wages','Emp PF 12%','EPS 8.33%','EPF 3.67%','Total'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No PF data for {MONTHS[month-1]} {year}.</td></tr>
              ) : rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: '#64748B', textAlign: 'right', fontFamily: 'monospace' }}>{r.uan || '—'}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 700, color: '#374151', textAlign: 'right' }}>{r.employee_code}</td>
                  <td style={{ padding: '9px 12px', fontSize: 12, color: '#0F172A', textAlign: 'left', fontWeight: 600 }}>{r.name}</td>
                  {[r.pf_wages, r.gross_wages, r.pf_employee, r.eps, r.epf_employer, parseFloat(r.pf_employee||0)+parseFloat(r.pf_employer||0)].map((v, i) => (
                    <td key={i} style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#374151' }}>
                      {v ? `₹${Number(v).toLocaleString('en-IN')}` : '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr style={{ background: '#F5F3FF', borderTop: '2px solid #E2E8F0', fontWeight: 800 }}>
                  <td colSpan={3} style={{ padding: '10px 12px', fontSize: 13, color: '#0F172A' }}>Total</td>
                  {[
                    rows.reduce((s,r)=>s+parseFloat(r.pf_wages||0),0),
                    rows.reduce((s,r)=>s+parseFloat(r.gross_wages||0),0),
                    totEmp, totEPS,
                    rows.reduce((s,r)=>s+parseFloat(r.epf_employer||0),0),
                    totEmp + totEr,
                  ].map((v, i) => (
                    <td key={i} style={{ padding: '10px 12px', fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>₹{Number(v).toLocaleString('en-IN')}</td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
