// src/pages/hr-admin/PayrollStatementPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TableProperties, Download, Search } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const fetchStatement = (month, year) => API.get('/hr/payroll-statement', { params: { month, year } }).then(r => r.data);

export default function PayrollStatementPage() {
  const [month, setMonth]   = useState(currentMonth);
  const [year,  setYear]    = useState(currentYear);
  const [search, setSearch] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-statement', month, year],
    queryFn: () => fetchStatement(month, year),
  });
  const rows = data?.data || [];
  const filtered = rows.filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.employee_code?.includes(search));

  const totals = filtered.reduce((acc, r) => ({
    gross: acc.gross + (r.gross_earnings || 0),
    deductions: acc.deductions + (r.total_deductions || 0),
    net: acc.net + (r.net_pay || 0),
  }), { gross: 0, deductions: 0, net: 0 });

  const downloadCSV = () => {
    const header = ['Emp Code','Name','Department','Days','Gross','Deductions','Net Pay'].join(',');
    const lines = filtered.map(r => [r.employee_code, r.name, r.department, r.working_days, r.gross_earnings, r.total_deductions, r.net_pay].join(','));
    const csv = [header, ...lines].join('\n');
    const a = document.createElement('a');
    a.href = 'data:text/csv,' + encodeURIComponent(csv);
    a.download = `payroll-statement-${MONTHS[month-1]}-${year}.csv`;
    a.click();
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1300, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TableProperties size={18} color={B.purple} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Payroll Statement</h1>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Monthly payroll register — earnings and deductions for all employees.</p>
            </div>
          </div>
          <button onClick={downloadCSV}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: '#fff', color: B.purple, border: `1px solid ${B.purple}`, borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Month</div>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
        </div>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Year</div>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
            {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y}>{y}</option>)}
          </select>
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

      {/* Summary cards */}
      {!isLoading && filtered.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 20 }}>
          {[
            { label: 'Employees', value: filtered.length, fmt: n => n, color: '#7C3AED' },
            { label: 'Gross Earnings', value: totals.gross, fmt: n => `₹${n.toLocaleString('en-IN')}`, color: '#2563EB' },
            { label: 'Total Deductions', value: totals.deductions, fmt: n => `₹${n.toLocaleString('en-IN')}`, color: '#DC2626' },
            { label: 'Net Payable', value: totals.net, fmt: n => `₹${n.toLocaleString('en-IN')}`, color: '#059669' },
          ].map(({ label, value, fmt, color }) => (
            <div key={label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color }}>{fmt(value)}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#', 'Emp Code', 'Name', 'Department', 'Days', 'Gross Earnings', 'PF', 'ESI', 'TDS', 'Other Ded.', 'Total Ded.', 'Net Pay'].map(h => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', textAlign: h === '#' || h === 'Days' ? 'center' : 'left', borderBottom: '1px solid #F1F5F9', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={12} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={12} style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No payroll data for {MONTHS[month-1]} {year}.</td></tr>
            ) : filtered.map((r, i) => (
              <tr key={r.id || i} style={{ borderBottom: '1px solid #F8FAFC' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#94A3B8', textAlign: 'center' }}>{i+1}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{r.employee_code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{r.department || '—'}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', textAlign: 'center' }}>{r.working_days || 26}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>₹{Number(r.gross_earnings || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(r.pf || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(r.esi || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(r.tds || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>₹{Number(r.other_deductions || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#DC2626' }}>₹{Number(r.total_deductions || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#059669' }}>₹{Number(r.net_pay || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          {!isLoading && filtered.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={5} style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#64748B' }}>TOTAL ({filtered.length} employees)</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A' }}>₹{totals.gross.toLocaleString('en-IN')}</td>
                <td colSpan={4} style={{ padding: '12px 14px' }}></td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#DC2626' }}>₹{totals.deductions.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#059669' }}>₹{totals.net.toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
