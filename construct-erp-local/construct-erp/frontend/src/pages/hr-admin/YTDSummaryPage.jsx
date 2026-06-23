// src/pages/hr-admin/YTDSummaryPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Search, Download } from 'lucide-react';
import { hrEmployeesAPI } from '../../api/client';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const currentYear = new Date().getFullYear();
const MONTHS_SHORT = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];

export default function YTDSummaryPage() {
  const [search, setSearch]   = useState('');
  const [empId, setEmpId]     = useState(null);
  const [empName, setEmpName] = useState('');
  const [year,  setYear]      = useState(currentYear);

  const { data: empData } = useQuery({
    queryKey: ['hr-emp-ytd', search],
    queryFn: () => hrEmployeesAPI.list({ search }).then(r => r.data),
    enabled: search.length > 1,
  });
  const employees = empData?.data || [];

  const { data: ytdData, isLoading } = useQuery({
    queryKey: ['ytd-summary', empId, year],
    queryFn: () => API.get(`/hr/ytd-summary/${empId}`, { params: { year } }).then(r => r.data),
    enabled: !!empId,
  });
  const ytd = ytdData?.data || null;
  const monthly = ytd?.monthly || [];

  const totals = monthly.reduce((acc, m) => ({
    gross: acc.gross + (m.gross || 0),
    pf: acc.pf + (m.pf || 0),
    esi: acc.esi + (m.esi || 0),
    tds: acc.tds + (m.tds || 0),
    net: acc.net + (m.net || 0),
  }), { gross: 0, pf: 0, esi: 0, tds: 0, net: 0 });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BarChart3 size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>YTD Summary</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Year-to-date earnings and deductions summary for any employee.</p>
      </div>

      {/* Controls */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 220 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Employee</div>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input value={search} onChange={e => { setSearch(e.target.value); setEmpId(null); setEmpName(''); }}
              placeholder="Search employee"
              style={{ width: '100%', paddingLeft: 32, paddingRight: 10, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
            {search && employees.length > 0 && !empId && (
              <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50 }}>
                {employees.slice(0, 6).map(e => (
                  <button key={e.id} onClick={() => { setEmpId(e.id); setEmpName(e.name); setSearch(`${e.employee_code} – ${e.name}`); }}
                    style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 13, color: '#0F172A' }}
                    onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                    onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                    {e.name} · {e.employee_code}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Financial Year</div>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
            {[currentYear-1, currentYear].map(y => <option key={y} value={y}>FY {y}-{(y+1).toString().slice(2)}</option>)}
          </select>
        </div>
      </div>

      {!empId ? (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <BarChart3 size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Search for an employee to view their YTD summary</p>
        </div>
      ) : isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
      ) : (
        <>
          {/* Header cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14, marginBottom: 20 }}>
            {[
              { label: 'Gross Earnings', value: totals.gross, color: '#7C3AED' },
              { label: 'PF (Employee)', value: totals.pf, color: '#2563EB' },
              { label: 'ESI', value: totals.esi, color: '#0891B2' },
              { label: 'TDS', value: totals.tds, color: '#DC2626' },
              { label: 'Net Received', value: totals.net, color: '#059669' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '14px 16px', borderTop: `3px solid ${color}` }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{label}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color }}>₹{Number(value).toLocaleString('en-IN')}</div>
              </div>
            ))}
          </div>

          {/* Monthly table */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Month-wise Breakdown — {empName}</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Month', 'Gross', 'Basic', 'HRA', 'PF', 'ESI', 'TDS', 'Other Ded.', 'Net Pay'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: 'left', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthly.length === 0 ? (
                  <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No payroll data for this year.</td></tr>
                ) : monthly.map((m, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{MONTHS_SHORT[i]}-{i < 9 ? year : year+1}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151' }}>₹{Number(m.gross || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(m.basic || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(m.hra || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(m.pf || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(m.esi || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(m.tds || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(m.other || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#059669' }}>₹{Number(m.net || 0).toLocaleString('en-IN')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#64748B' }}>TOTAL</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#7C3AED' }}>₹{totals.gross.toLocaleString('en-IN')}</td>
                  <td colSpan={2} style={{ padding: '12px 14px' }}></td>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#2563EB' }}>₹{totals.pf.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#0891B2' }}>₹{totals.esi.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#DC2626' }}>₹{totals.tds.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px' }}></td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#059669' }}>₹{totals.net.toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
