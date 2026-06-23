// src/pages/hr-admin/QuickSalaryStatementPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileBarChart, Search, Download, Printer } from 'lucide-react';
import { hrEmployeesAPI } from '../../api/client';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const Row = ({ label, value, bold, separator, color }) => (
  separator ? (
    <tr><td colSpan={2} style={{ padding: '2px 16px' }}><div style={{ borderTop: '1px solid #E2E8F0' }} /></td></tr>
  ) : (
    <tr style={{ background: bold ? '#F8FAFC' : 'transparent' }}>
      <td style={{ padding: '8px 16px', fontSize: 13, color: '#374151', fontWeight: bold ? 700 : 400 }}>{label}</td>
      <td style={{ padding: '8px 16px', fontSize: 13, fontWeight: bold ? 800 : 500, color: color || (bold ? '#0F172A' : '#374151'), textAlign: 'right' }}>
        {typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : value}
      </td>
    </tr>
  )
);

export default function QuickSalaryStatementPage() {
  const [search, setSearch]   = useState('');
  const [empId, setEmpId]     = useState(null);
  const [empName, setEmpName] = useState('');
  const [month, setMonth]     = useState(currentMonth);
  const [year,  setYear]      = useState(currentYear);

  const { data: empData } = useQuery({
    queryKey: ['hr-emp-qss', search],
    queryFn: () => hrEmployeesAPI.list({ search }).then(r => r.data),
    enabled: search.length > 1,
  });
  const employees = empData?.data || [];

  const { data: stmtData, isLoading } = useQuery({
    queryKey: ['quick-salary-statement', empId, month, year],
    queryFn: () => API.get(`/hr/salary-statement/${empId}`, { params: { month, year } }).then(r => r.data),
    enabled: !!empId,
  });
  const stmt = stmtData?.data || null;

  const earnings = stmt?.earnings || [];
  const deductions = stmt?.deductions || [];
  const grossEarnings = earnings.reduce((s, e) => s + (e.amount || 0), 0);
  const totalDeductions = deductions.reduce((s, d) => s + (d.amount || 0), 0);
  const netPay = grossEarnings - totalDeductions;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileBarChart size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Quick Salary Statement</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>View a detailed salary breakdown for a single employee for any given month.</p>
      </div>

      {/* Search & filters */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 24, display: 'flex', gap: 14, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 220, position: 'relative' }}>
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
                    {e.name} <span style={{ color: '#94A3B8' }}>· {e.employee_code}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
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
      </div>

      {!empId ? (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <FileBarChart size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Search for an employee to view their salary statement</p>
        </div>
      ) : isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{empName} — {MONTHS[month-1]} {year}</div>
              {stmt && <div style={{ fontSize: 12, color: '#64748B' }}>{stmt.designation} · {stmt.department}</div>}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#F8FAFC', color: '#64748B', fontWeight: 600 }}>
                <Printer size={13} /> Print
              </button>
            </div>
          </div>

          {/* Salary breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '1px solid #F1F5F9' }}>
            {/* Earnings */}
            <div style={{ borderRight: '1px solid #F1F5F9' }}>
              <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Earnings</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {earnings.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '12px 16px', fontSize: 12, color: '#94A3B8' }}>No earnings data</td></tr>
                  ) : earnings.map((e, i) => (
                    <Row key={i} label={e.name} value={e.amount} />
                  ))}
                  <Row separator />
                  <Row label="Gross Earnings" value={grossEarnings} bold />
                </tbody>
              </table>
            </div>
            {/* Deductions */}
            <div>
              <div style={{ padding: '10px 16px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deductions</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {deductions.length === 0 ? (
                    <tr><td colSpan={2} style={{ padding: '12px 16px', fontSize: 12, color: '#94A3B8' }}>No deductions</td></tr>
                  ) : deductions.map((d, i) => (
                    <Row key={i} label={d.name} value={d.amount} />
                  ))}
                  <Row separator />
                  <Row label="Total Deductions" value={totalDeductions} bold color="#DC2626" />
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Pay */}
          <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#64748B' }}>NET PAY</div>
            <div style={{ fontSize: 28, fontWeight: 900, color: '#7C3AED' }}>₹{netPay.toLocaleString('en-IN')}</div>
          </div>
        </div>
      )}
    </div>
  );
}
