// src/pages/hr-admin/MinimumWagesPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Scale } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const cur = new Date();

const fetchMW = (month, year) => API.get('/hr/compliance/minimum-wages', { params: { month, year } }).then(r => r.data);

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

export default function MinimumWagesPage() {
  const [month, setMonth] = useState(cur.getMonth() + 1);
  const [year, setYear]   = useState(cur.getFullYear());

  const { data, isLoading } = useQuery({ queryKey: ['minimum-wages', month, year], queryFn: () => fetchMW(month, year) });
  const rows      = data?.data || [];
  const compliant = rows.filter(r => r.compliance_status === 'ok').length;
  const violations= rows.filter(r => r.compliance_status === 'violation').length;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#DC262615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Scale size={18} color="#DC2626" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Minimum Wages Compliance</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Check every employee's pay against applicable state minimum wages</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            {[cur.getFullYear()-1, cur.getFullYear()].map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {violations > 0 && (
        <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
          <AlertTriangle size={15} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: '#991B1B', fontWeight: 600 }}>
            {violations} employee{violations > 1 ? 's' : ''} paid below the applicable minimum wages. Immediate correction required.
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Checked',  value: rows.length,    color: '#374151' },
          { label: 'Compliant',      value: compliant,      color: '#15803D' },
          { label: 'Violations',     value: violations,     color: violations > 0 ? '#DC2626' : '#94A3B8' },
          { label: 'Compliance %',   value: rows.length ? `${((compliant/rows.length)*100).toFixed(0)}%` : '—', color: violations > 0 ? '#DC2626' : '#15803D' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: `1px solid ${c.label === 'Violations' && violations > 0 ? '#FECACA' : '#E2E8F0'}`, borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#','Emp Code','Name','Category','Actual Basic','Min Wage','Difference','Status'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No data for {MONTHS[month-1]} {year}.</td></tr>
            ) : rows.map((r, i) => {
              const diff = parseFloat(r.actual_basic||0) - parseFloat(r.min_wage||0);
              const ok   = r.compliance_status === 'ok';
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', background: ok ? '#fff' : '#FFF5F5' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8' }}>{i+1}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{r.wage_category || 'Unskilled'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: ok ? '#374151' : '#DC2626' }}>
                    ₹{Number(r.actual_basic||0).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>₹{Number(r.min_wage||0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: diff >= 0 ? '#15803D' : '#DC2626' }}>
                    {diff >= 0 ? '+' : ''}₹{Math.abs(diff).toLocaleString('en-IN')}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6,
                      background: ok ? '#F0FDF4' : '#FEF2F2', color: ok ? '#15803D' : '#DC2626' }}>
                      {ok ? <CheckCircle size={11} /> : <AlertTriangle size={11} />}
                      {ok ? 'Compliant' : 'Violation'}
                    </span>
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
