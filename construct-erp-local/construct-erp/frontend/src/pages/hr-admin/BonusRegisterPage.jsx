// src/pages/hr-admin/BonusRegisterPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Gift, Download, Info } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const cur = new Date();

const fetchBonus = (year) => API.get('/hr/compliance/bonus', { params: { year } }).then(r => r.data);

export default function BonusRegisterPage() {
  const [year, setYear] = useState(cur.getFullYear());

  const { data, isLoading } = useQuery({ queryKey: ['bonus-register', year], queryFn: () => fetchBonus(year) });
  const rows = data?.data || [];
  const totalBonus = rows.reduce((s, r) => s + parseFloat(r.bonus_amount || 0), 0);
  const eligible   = rows.filter(r => r.eligible).length;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#8B5CF615', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Gift size={18} color="#8B5CF6" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Statutory Bonus Register</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Payment of Bonus Act, 1965 — 8.33% to 20% of annual basic</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 700, background: '#F8FAFC', color: B.purple, outline: 'none' }}>
            {[cur.getFullYear()-2, cur.getFullYear()-1, cur.getFullYear()].map(y => <option key={y}>FY {y}–{String(y+1).slice(2)}</option>)}
          </select>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: '#8B5CF6', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={14} /> Export Register
          </button>
        </div>
      </div>

      <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 8 }}>
        <Info size={15} color="#7C3AED" style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 13, color: '#4C1D95' }}>
          Eligible: employees earning ≤ ₹21,000/month. Bonus on wages ≤ ₹7,000 or minimum wage (whichever is higher).
          Min bonus: <strong>8.33%</strong> · Max bonus: <strong>20%</strong> of annual basic/wages.
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Employees', value: rows.length,      color: '#374151' },
          { label: 'Eligible',        value: eligible,          color: '#8B5CF6' },
          { label: 'Bonus Rate',      value: '8.33%',           color: '#F59E0B' },
          { label: 'Total Bonus',     value: `₹${totalBonus.toLocaleString('en-IN')}`, color: '#DC2626' },
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
              {['#','Emp Code','Name','Annual Basic','Bonus Wages','Days Worked','Bonus %','Bonus Amount','Eligible'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No bonus data for FY {year}–{String(year+1).slice(2)}.</td></tr>
            ) : rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', background: r.eligible ? '#fff' : '#FAFAFA' }}>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#94A3B8' }}>{i+1}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>₹{Number(r.annual_basic||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>₹{Number(r.bonus_wages||0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>{r.days_worked || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#8B5CF6' }}>{r.eligible ? '8.33%' : '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: r.eligible ? '#DC2626' : '#94A3B8' }}>
                  {r.eligible ? `₹${Number(r.bonus_amount||0).toLocaleString('en-IN')}` : '—'}
                </td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 5,
                    background: r.eligible ? '#F5F3FF' : '#F1F5F9', color: r.eligible ? '#7C3AED' : '#94A3B8' }}>
                    {r.eligible ? 'Yes' : 'No'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F5F3FF', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={7} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>Total Bonus Payable</td>
                <td style={{ padding: '10px 14px', fontSize: 14, fontWeight: 900, color: '#DC2626' }}>₹{totalBonus.toLocaleString('en-IN')}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
