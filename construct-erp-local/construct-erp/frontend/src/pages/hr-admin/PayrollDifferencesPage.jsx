// src/pages/hr-admin/PayrollDifferencesPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { GitCompare, ArrowUpRight, ArrowDownRight, Search } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const prevMonth = (m, y) => m === 1 ? [12, y-1] : [m-1, y];

const fetchDiff = (m, y) => API.get('/hr/payroll-differences', { params: { month: m, year: y } }).then(r => r.data);

const DiffCell = ({ val }) => {
  if (val === null || val === undefined) return <td style={{ padding: '10px 14px', fontSize: 12, color: '#94A3B8' }}>—</td>;
  const pos = val >= 0;
  return (
    <td style={{ padding: '10px 14px' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: pos ? '#15803D' : '#DC2626' }}>
        {pos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}₹{Math.abs(val).toLocaleString('en-IN')}
      </span>
    </td>
  );
};

export default function PayrollDifferencesPage() {
  const [month, setMonth]   = useState(currentMonth);
  const [year,  setYear]    = useState(currentYear);
  const [search, setSearch] = useState('');

  const [pm, py] = prevMonth(month, year);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-differences', month, year],
    queryFn: () => fetchDiff(month, year),
  });
  const rows = data?.data || [];
  const filtered = rows.filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.employee_code?.includes(search));

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GitCompare size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Payroll Differences</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Month-over-month payroll comparison — spot anomalies before finalizing.</p>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Current Month</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={month} onChange={e => setMonth(Number(e.target.value))}
              style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
              {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
              {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#64748B', paddingBottom: 2 }}>
          vs <strong>{MONTHS[pm-1]} {py}</strong>
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Search</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Filter employees"
              style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1000 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Emp Code', 'Name', 'Prev Gross', 'Curr Gross', 'Gross Δ', 'Prev Net', 'Curr Net', 'Net Δ', 'LOP Δ', 'Remark'].map(h => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={10} style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No data for {MONTHS[month-1]} {year}.</td></tr>
            ) : filtered.map((r, i) => {
              const grossDiff = (r.curr_gross || 0) - (r.prev_gross || 0);
              const netDiff = (r.curr_net || 0) - (r.prev_net || 0);
              const lopDiff = (r.curr_lop || 0) - (r.prev_lop || 0);
              const hasAnomaly = Math.abs(grossDiff) > 5000;
              return (
                <tr key={r.id || i} style={{ borderBottom: '1px solid #F8FAFC', background: hasAnomaly ? '#FFFBEB' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                  onMouseLeave={e => e.currentTarget.style.background = hasAnomaly ? '#FFFBEB' : 'transparent'}>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{r.employee_code}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(r.prev_gross || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151' }}>₹{Number(r.curr_gross || 0).toLocaleString('en-IN')}</td>
                  <DiffCell val={grossDiff} />
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(r.prev_net || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151' }}>₹{Number(r.curr_net || 0).toLocaleString('en-IN')}</td>
                  <DiffCell val={netDiff} />
                  <DiffCell val={lopDiff} />
                  <td style={{ padding: '10px 14px', fontSize: 11 }}>
                    {hasAnomaly && <span style={{ background: '#FEF3C7', color: '#B45309', fontWeight: 700, borderRadius: 5, padding: '2px 7px' }}>Review</span>}
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
