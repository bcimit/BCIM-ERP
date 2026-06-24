// src/pages/hr-admin/ProfessionalTaxPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Landmark, Download, FileText } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const cur = new Date();

const fetchPT = (month, year) => API.get('/hr/compliance/professional-tax', { params: { month, year } }).then(r => r.data);

const PT_SLABS = [
  { range: 'Up to ₹7,500',          pt: 0 },
  { range: '₹7,501 – ₹10,000',      pt: 175 },
  { range: '₹10,001 – ₹15,000',     pt: 200 },
  { range: 'Above ₹15,000',         pt: 200 },
];

export default function ProfessionalTaxPage() {
  const [month, setMonth] = useState(cur.getMonth() + 1);
  const [year, setYear]   = useState(cur.getFullYear());

  const { data, isLoading } = useQuery({ queryKey: ['professional-tax', month, year], queryFn: () => fetchPT(month, year) });
  const rows = data?.data?.employees || [];
  const total = rows.reduce((s, r) => s + parseFloat(r.pt || 0), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#05966915', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Landmark size={18} color="#059669" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Professional Tax (PT)</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>State-wise PT deduction register, challan &amp; returns</p>
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

      {/* PT Slab reference */}
      <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D', marginBottom: 8 }}>PT Slabs (Maharashtra — typical)</div>
        <div style={{ display: 'flex', gap: 20 }}>
          {PT_SLABS.map(s => (
            <div key={s.range} style={{ fontSize: 12, color: '#374151' }}>
              <span style={{ fontWeight: 700 }}>{s.range}</span>: ₹{s.pt}/month
            </div>
          ))}
        </div>
      </div>

      {/* Summary + Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 14 }}>
          {[
            { label: 'PT Deducted Employees', value: rows.filter(r => parseFloat(r.pt) > 0).length, color: '#374151' },
            { label: 'Total PT Collected',    value: `₹${total.toLocaleString('en-IN')}`,           color: '#059669' },
          ].map(c => (
            <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, padding: '12px 18px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['PT Challan', 'PT Register', 'PT Return'].map(label => (
            <button key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, fontWeight: 600, background: '#F8FAFC', color: '#374151', cursor: 'pointer' }}>
              <FileText size={12} /> {label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#', 'Emp Code', 'Name', 'Department', 'Gross Salary', 'PT Applicable', 'PT Deducted'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: h === '#' ? 'center' : 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No PT data for {MONTHS[month-1]} {year}.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8', textAlign: 'center' }}>{i + 1}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.department || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>₹{Number(r.gross_salary || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, padding: '2px 8px', borderRadius: 5, background: parseFloat(r.pt) > 0 ? '#F0FDF4' : '#F8FAFC', color: parseFloat(r.pt) > 0 ? '#15803D' : '#94A3B8' }}>
                    {parseFloat(r.pt) > 0 ? 'Yes' : 'Exempt'}
                  </span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: parseFloat(r.pt) > 0 ? '#059669' : '#94A3B8' }}>
                  {parseFloat(r.pt) > 0 ? `₹${Number(r.pt).toLocaleString('en-IN')}` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F0FDF4', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={6} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>Total PT</td>
                <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 900, color: '#059669' }}>₹{total.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
