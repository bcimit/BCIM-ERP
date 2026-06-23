// src/pages/hr-admin/LoanStatementPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Wallet, Search, TrendingDown } from 'lucide-react';
import { hrEmployeesAPI } from '../../api/client';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });

export default function LoanStatementPage() {
  const [search, setSearch]   = useState('');
  const [empId, setEmpId]     = useState(null);
  const [empName, setEmpName] = useState('');

  const { data: empData } = useQuery({
    queryKey: ['hr-emp-loan-stmt', search],
    queryFn: () => hrEmployeesAPI.list({ search }).then(r => r.data),
    enabled: search.length > 1,
  });
  const employees = empData?.data || [];

  const { data: loanData, isLoading } = useQuery({
    queryKey: ['loan-statement', empId],
    queryFn: () => API.get(`/hr/loan-statement/${empId}`).then(r => r.data),
    enabled: !!empId,
  });
  const loans = loanData?.data || [];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Loan Statement</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>View the loan ledger and monthly repayment schedule for any employee.</p>
      </div>

      {/* Search */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Search Employee</div>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setEmpId(null); setEmpName(''); }}
            placeholder="Search by name or employee code"
            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
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

      {!empId ? (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <Wallet size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Search for an employee to view their loan statement</p>
        </div>
      ) : isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
      ) : loans.length === 0 ? (
        <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 14, padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 14, color: '#94A3B8' }}>No loans found for {empName}.</p>
        </div>
      ) : (
        loans.map((loan, li) => (
          <div key={loan.id || li} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, marginBottom: 20, overflow: 'hidden' }}>
            {/* Loan header */}
            <div style={{ padding: '16px 20px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{loan.loan_type || 'Personal Loan'} — #{loan.loan_no || loan.id}</div>
                <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>Disbursed: {loan.disbursement_date ? new Date(loan.disbursement_date).toLocaleDateString('en-IN') : '—'}</div>
              </div>
              <div style={{ display: 'flex', gap: 20 }}>
                {[
                  { label: 'Loan Amount', value: loan.amount, color: '#7C3AED' },
                  { label: 'Paid', value: loan.paid || 0, color: '#059669' },
                  { label: 'Balance', value: (loan.amount || 0) - (loan.paid || 0), color: '#DC2626' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>{label}</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color }}>₹{Number(value || 0).toLocaleString('en-IN')}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* Repayment schedule */}
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#FAFBFF' }}>
                  {['Month', 'EMI', 'Principal', 'Interest', 'Balance', 'Status'].map(h => (
                    <th key={h} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(loan.schedule || []).length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94A3B8', fontSize: 12 }}>No repayment schedule available.</td></tr>
                ) : (loan.schedule || []).map((s, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#374151' }}>{s.month}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 600, color: '#0F172A' }}>₹{Number(s.emi || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748B' }}>₹{Number(s.principal || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748B' }}>₹{Number(s.interest || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 16px', fontSize: 12, color: '#DC2626', fontWeight: 600 }}>₹{Number(s.balance || 0).toLocaleString('en-IN')}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 6, padding: '3px 8px', background: s.status === 'Paid' ? '#F0FDF4' : '#FFFBEB', color: s.status === 'Paid' ? '#15803D' : '#B45309' }}>
                        {s.status || 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}
