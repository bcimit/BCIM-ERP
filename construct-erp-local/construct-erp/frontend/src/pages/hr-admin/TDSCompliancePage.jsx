// src/pages/hr-admin/TDSCompliancePage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Download, Calculator } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const cur = new Date();
const QUARTERS = [
  { label: 'Q1 (Apr–Jun)', value: 1 },
  { label: 'Q2 (Jul–Sep)', value: 2 },
  { label: 'Q3 (Oct–Dec)', value: 3 },
  { label: 'Q4 (Jan–Mar)', value: 4 },
];

const fetchTDS = (quarter, year) => API.get('/hr/compliance/tds', { params: { quarter, year } }).then(r => r.data);

export default function TDSCompliancePage() {
  const [quarter, setQuarter] = useState(Math.ceil((cur.getMonth() + 1) / 3));
  const [year, setYear] = useState(cur.getFullYear());
  const [tab, setTab] = useState('register'); // register | form16

  const { data, isLoading } = useQuery({ queryKey: ['tds-compliance', quarter, year], queryFn: () => fetchTDS(quarter, year) });
  const rows = data?.data?.employees || [];
  const totalTDS = rows.reduce((s, r) => s + parseFloat(r.tds_deducted || 0), 0);
  const totalTaxable = rows.reduce((s, r) => s + parseFloat(r.taxable_income || 0), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#D9770615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calculator size={18} color="#D97706" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>TDS on Salary</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Form 24Q quarterly returns · Form 16 generation · Section 192</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={quarter} onChange={e => setQuarter(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            {QUARTERS.map(q => <option key={q.value} value={q.value}>{q.label}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            {[cur.getFullYear() - 1, cur.getFullYear()].map(y => <option key={y} value={y}>FY {y}–{String(y+1).slice(2)}</option>)}
          </select>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Employees',    value: rows.length,                              color: '#374151' },
          { label: 'TDS Deducted Emps',  value: rows.filter(r => parseFloat(r.tds_deducted) > 0).length, color: '#D97706' },
          { label: 'Total Taxable Income', value: `₹${totalTaxable.toLocaleString('en-IN')}`, color: '#374151' },
          { label: `TDS for Q${quarter}`,  value: `₹${totalTDS.toLocaleString('en-IN')}`,   color: '#DC2626' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Download Form 24Q', icon: Download },
          { label: 'Generate Form 16 (All)', icon: FileText },
          { label: 'TDS Challan (ITNS 281)', icon: Download },
          { label: 'Traces Upload File', icon: Download },
        ].map(btn => (
          <button key={btn.label} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#F8FAFC', color: '#374151', cursor: 'pointer' }}>
            <btn.icon size={13} /> {btn.label}
          </button>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, background: '#F1F5F9', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['register', 'TDS Register'], ['form16', 'Form 16 Status']].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            style={{ padding: '7px 18px', borderRadius: 8, border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
              background: tab === key ? '#fff' : 'transparent', color: tab === key ? B.purple : '#64748B',
              boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,0.08)' : 'none' }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {tab === 'register'
                ? ['#','Emp Code','Name','PAN','Gross Salary','Std Deduction','80C / 80D','Taxable Income','TDS Deducted'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
                  ))
                : ['#','Emp Code','Name','PAN','Total TDS (FY)','Form 16 Status','Action'].map(h => (
                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))
              }
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No TDS data for Q{quarter} FY {year}–{String(year+1).slice(2)}.</td></tr>
            ) : rows.map((r, i) => tab === 'register' ? (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '9px 12px', fontSize: 12, color: '#94A3B8', textAlign: 'right' }}>{i+1}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 700, color: '#374151', textAlign: 'right' }}>{r.employee_code}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, color: '#0F172A', textAlign: 'left', fontWeight: 600 }}>{r.name}</td>
                <td style={{ padding: '9px 12px', fontSize: 11, color: '#64748B', textAlign: 'right', fontFamily: 'monospace' }}>{r.pan || '—'}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right' }}>₹{Number(r.gross_salary||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#64748B' }}>₹{Number(r.standard_deduction||50000).toLocaleString('en-IN')}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', color: '#64748B' }}>₹{Number(r.chapter_vi_a||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontWeight: 700 }}>₹{Number(r.taxable_income||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, textAlign: 'right', fontWeight: 800, color: parseFloat(r.tds_deducted)>0?'#DC2626':'#94A3B8' }}>
                  {parseFloat(r.tds_deducted)>0?`₹${Number(r.tds_deducted).toLocaleString('en-IN')}`:'Nil'}
                </td>
              </tr>
            ) : (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '9px 12px', fontSize: 12, color: '#94A3B8' }}>{i+1}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td style={{ padding: '9px 12px', fontSize: 11, color: '#64748B', fontFamily: 'monospace' }}>{r.pan || '—'}</td>
                <td style={{ padding: '9px 12px', fontSize: 12, fontWeight: 700, color: '#DC2626' }}>₹{Number(r.tds_annual||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '9px 12px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: r.form16_issued ? '#F0FDF4' : '#FFFBEB', color: r.form16_issued ? '#15803D' : '#B45309' }}>
                    {r.form16_issued ? 'Issued' : 'Pending'}
                  </span>
                </td>
                <td style={{ padding: '9px 12px' }}>
                  <button style={{ padding: '5px 12px', background: B.purple, color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                    Generate
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && tab === 'register' && (
            <tfoot>
              <tr style={{ background: '#FEF3C7', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={8} style={{ padding: '10px 12px', fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>Total TDS</td>
                <td style={{ padding: '10px 12px', fontSize: 14, fontWeight: 900, color: '#DC2626', textAlign: 'right' }}>₹{totalTDS.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
