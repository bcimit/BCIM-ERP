// src/pages/hr-admin/GratuityRegisterPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Award, Download, Info } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const cur = new Date();

const fetchGratuity = (asOfYear) => API.get('/hr/compliance/gratuity', { params: { year: asOfYear } }).then(r => r.data);

export default function GratuityRegisterPage() {
  const [year, setYear] = useState(cur.getFullYear());
  const [minYears, setMinYears] = useState(5);

  const { data, isLoading } = useQuery({ queryKey: ['gratuity', year], queryFn: () => fetchGratuity(year) });
  const all  = data?.data || [];
  const rows = all.filter(r => parseFloat(r.years_of_service) >= minYears);
  const totalLiability = rows.reduce((s, r) => s + parseFloat(r.gratuity_amount || 0), 0);
  const eligible = all.filter(r => parseFloat(r.years_of_service) >= 5).length;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F59E0B15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Award size={18} color="#F59E0B" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Gratuity Register</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Gratuity liability per employee — Payment of Gratuity Act, 1972</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 700, background: '#F8FAFC', color: B.purple, outline: 'none' }}>
            {[cur.getFullYear()-1, cur.getFullYear()].map(y => <option key={y}>As of {y}</option>)}
          </select>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#F59E0B', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={14} /> Export Register
          </button>
        </div>
      </div>

      <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
        <Info size={15} color="#B45309" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: '#92400E' }}>
          Formula: <strong>(Last drawn Basic × 15 × Years of Service) ÷ 26</strong>. Eligible after 5 continuous years.
          Maximum gratuity: <strong>₹20,00,000</strong> (tax exempt).
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Employees',      value: all.length,          color: '#374151' },
          { label: 'Eligible (≥5 yrs)',    value: eligible,            color: '#F59E0B' },
          { label: 'Shown (filter)',        value: rows.length,         color: B.purple },
          { label: 'Total Liability',       value: `₹${totalLiability.toLocaleString('en-IN')}`, color: '#DC2626' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 18px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>Show employees with ≥</span>
        {[1, 3, 5, 10].map(y => (
          <button key={y} onClick={() => setMinYears(y)}
            style={{ padding: '6px 16px', borderRadius: 8, border: `1px solid ${minYears === y ? B.purple : '#E2E8F0'}`, fontSize: 13, fontWeight: 700,
              background: minYears === y ? B.purple : '#F8FAFC', color: minYears === y ? '#fff' : '#374151', cursor: 'pointer' }}>
            {y} yr{y > 1 ? 's' : ''}
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#','Emp Code','Name','DOJ','Years','Last Basic','Gratuity Amount','Eligible','Form F'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No employees with ≥{minYears} years of service.</td></tr>
            ) : rows.map((r, i) => {
              const isEligible = parseFloat(r.years_of_service) >= 5;
              return (
                <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', background: isEligible ? '#fff' : '#FAFAFA' }}>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8' }}>{i+1}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.doj ? new Date(r.doj).toLocaleDateString('en-IN') : '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: isEligible ? '#F59E0B' : '#94A3B8' }}>
                    {parseFloat(r.years_of_service).toFixed(1)} yrs
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>₹{Number(r.last_basic || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: isEligible ? '#DC2626' : '#94A3B8' }}>
                    {isEligible ? `₹${Number(r.gratuity_amount||0).toLocaleString('en-IN')}` : '—'}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5, background: isEligible ? '#FEF3C7' : '#F1F5F9', color: isEligible ? '#92400E' : '#94A3B8' }}>
                      {isEligible ? 'Eligible' : 'Not Yet'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {isEligible && (
                      <button style={{ padding: '4px 10px', background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', color: '#374151' }}>
                        Download
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#FEF3C7', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={6} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>Total Gratuity Liability</td>
                <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 900, color: '#DC2626' }}>₹{totalLiability.toLocaleString('en-IN')}</td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
