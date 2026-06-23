// src/pages/hr-admin/ITStatementPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Receipt, Search, Download } from 'lucide-react';
import { hrEmployeesAPI } from '../../api/client';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const currentYear = new Date().getFullYear();

const SectionRow = ({ label, value, sub, bold }) => (
  <tr style={{ background: sub ? 'transparent' : bold ? '#F8FAFC' : 'transparent', borderBottom: '1px solid #F8FAFC' }}>
    <td style={{ padding: sub ? '6px 16px 6px 28px' : '10px 16px', fontSize: sub ? 12 : 13, color: sub ? '#64748B' : '#0F172A', fontWeight: bold ? 700 : 400 }}>{label}</td>
    <td style={{ padding: sub ? '6px 16px' : '10px 16px', fontSize: sub ? 12 : 13, fontWeight: bold ? 800 : 500, color: bold ? '#0F172A' : '#374151', textAlign: 'right' }}>
      {value != null ? `₹${Number(value).toLocaleString('en-IN')}` : '—'}
    </td>
  </tr>
);

export default function ITStatementPage() {
  const [search, setSearch]   = useState('');
  const [empId, setEmpId]     = useState(null);
  const [empName, setEmpName] = useState('');
  const [year, setYear]       = useState(currentYear);

  const { data: empData } = useQuery({
    queryKey: ['hr-emp-itstmt', search],
    queryFn: () => hrEmployeesAPI.list({ search }).then(r => r.data),
    enabled: search.length > 1,
  });
  const employees = empData?.data || [];

  const { data: stmtData, isLoading } = useQuery({
    queryKey: ['it-statement', empId, year],
    queryFn: () => API.get(`/hr/it-statement/${empId}`, { params: { year } }).then(r => r.data),
    enabled: !!empId,
  });
  const stmt = stmtData?.data || null;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Receipt size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Income Tax Statement</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Full income tax working sheet — gross income, deductions, and tax liability for any employee.</p>
      </div>

      {/* Search */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 24, display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
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
                    style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
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
          <Receipt size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Search for an employee to view their IT statement</p>
        </div>
      ) : isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
      ) : !stmt ? (
        <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No IT data for this employee and year.</div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{empName} — FY {year}-{(year+1).toString().slice(2)}</div>
            <button onClick={() => window.print()} style={{ padding: '6px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 12, cursor: 'pointer', background: '#F8FAFC', color: '#64748B', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              <Download size={13} /> Download
            </button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <SectionRow label="GROSS INCOME" bold />
              <SectionRow label="Basic Salary" value={stmt.basic} sub />
              <SectionRow label="HRA" value={stmt.hra} sub />
              <SectionRow label="Special Allowances" value={stmt.special_allowances} sub />
              <SectionRow label="Bonus / Incentives" value={stmt.bonus} sub />
              <SectionRow label="Other Allowances" value={stmt.other_allowances} sub />
              <SectionRow label="Total Gross Income" value={stmt.gross_income} bold />

              <SectionRow label="EXEMPTIONS" bold />
              <SectionRow label="HRA Exemption" value={stmt.hra_exemption} sub />
              <SectionRow label="Leave Travel Allowance" value={stmt.lta} sub />
              <SectionRow label="Total Exemptions" value={stmt.total_exemptions} bold />

              <SectionRow label="INCOME AFTER EXEMPTIONS" value={stmt.income_after_exemptions} bold />
              <SectionRow label="Standard Deduction (₹50,000)" value={50000} sub />
              <SectionRow label="Professional Tax" value={stmt.professional_tax} sub />

              <SectionRow label="DEDUCTIONS (Chapter VI A)" bold />
              <SectionRow label="80C (PF, PPF, ELSS, LIC, etc.)" value={stmt.deduction_80c} sub />
              <SectionRow label="80D (Medical Insurance)" value={stmt.deduction_80d} sub />
              <SectionRow label="80E (Education Loan)" value={stmt.deduction_80e} sub />
              <SectionRow label="NPS 80CCD(1B)" value={stmt.deduction_nps} sub />
              <SectionRow label="Total Chapter VI Deductions" value={stmt.total_ch6a} bold />

              <SectionRow label="TAXABLE INCOME" value={stmt.taxable_income} bold />
              <SectionRow label="Tax on Regular Income" value={stmt.tax_on_income} sub />
              <SectionRow label="Surcharge" value={stmt.surcharge} sub />
              <SectionRow label="Health & Education Cess (4%)" value={stmt.cess} sub />
              <SectionRow label="Rebate u/s 87A" value={stmt.rebate_87a} sub />
              <SectionRow label="TOTAL TAX LIABILITY" value={stmt.total_tax} bold />
              <SectionRow label="TDS Already Deducted" value={stmt.tds_deducted} sub />
              <SectionRow label="BALANCE TAX / REFUND" value={stmt.balance_tax} bold />
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
