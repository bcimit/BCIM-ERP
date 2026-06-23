// src/pages/hr-admin/PFYTDStatementPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, Download } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS_SHORT = ['Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar'];
const cur = new Date();

const fetchEmps   = () => API.get('/hr/employees/active').then(r => r.data);
const fetchPFYTD  = (empId, year) => API.get(`/hr/pf-ytd/${empId}`, { params: { year } }).then(r => r.data);

export default function PFYTDStatementPage() {
  const [year, setYear]   = useState(cur.getFullYear());
  const [empId, setEmpId] = useState('');

  const { data: empsData } = useQuery({ queryKey: ['active-employees'], queryFn: fetchEmps });
  const employees = empsData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['pf-ytd', empId, year],
    queryFn: () => fetchPFYTD(empId, year),
    enabled: !!empId,
  });

  const monthly = data?.data?.monthly || [];
  const totEmp  = monthly.reduce((s, m) => s + (m.pf_employee || 0), 0);
  const totEr   = monthly.reduce((s, m) => s + (m.pf_employer || 0), 0);
  const totWages= monthly.reduce((s, m) => s + (m.pf_wages || 0), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>PF YTD Statement</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Provident Fund contribution summary — financial year Apr–Mar.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={empId} onChange={e => setEmpId(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none', minWidth: 220 }}>
            <option value="">Select Employee…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, fontWeight: 700, background: '#F8FAFC', color: B.purple, outline: 'none' }}>
            {[cur.getFullYear() - 1, cur.getFullYear()].map(y => <option key={y} value={y}>FY {y}–{String(y + 1).slice(2)}</option>)}
          </select>
          {empId && (
            <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', color: '#374151', cursor: 'pointer' }}>
              <Download size={13} /> Export
            </button>
          )}
        </div>
      </div>

      {!empId ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14 }}>
          Select an employee to view their PF YTD statement.
        </div>
      ) : isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
            {[
              { label: 'PF Wages (YTD)',      value: `₹${totWages.toLocaleString('en-IN')}`,  color: '#374151' },
              { label: 'Employee PF (YTD)',    value: `₹${totEmp.toLocaleString('en-IN')}`,    color: '#7C3AED' },
              { label: 'Employer PF (YTD)',    value: `₹${totEr.toLocaleString('en-IN')}`,     color: '#2563EB' },
              { label: 'Total Contribution',   value: `₹${(totEmp + totEr).toLocaleString('en-IN')}`, color: '#059669' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Monthly table */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Month','PF Wages','Employee PF (12%)','Employer EPS (8.33%)','Employer EPF (3.67%)','Total'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {MONTHS_SHORT.map((label, i) => {
                  const m = monthly[i] || {};
                  const empPF  = m.pf_employee || 0;
                  const erEPS  = m.eps_employer || 0;
                  const erEPF  = m.epf_employer || 0;
                  const total  = empPF + erEPS + erEPF;
                  return (
                    <tr key={label} style={{ borderBottom: '1px solid #F1F5F9', background: total > 0 ? '#fff' : '#FAFAFA' }}>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#374151', textAlign: 'left' }}>{label} {i < 9 ? year : year + 1}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#374151' }}>{m.pf_wages ? `₹${Number(m.pf_wages).toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#7C3AED', fontWeight: 600 }}>{empPF ? `₹${empPF.toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#2563EB' }}>{erEPS ? `₹${erEPS.toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', color: '#2563EB' }}>{erEPF ? `₹${erEPF.toLocaleString('en-IN')}` : '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, textAlign: 'right', fontWeight: total > 0 ? 800 : 400, color: total > 0 ? '#0F172A' : '#94A3B8' }}>{total ? `₹${total.toLocaleString('en-IN')}` : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: '#F5F3FF', borderTop: '2px solid #E2E8F0' }}>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A' }}>Total</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#374151', textAlign: 'right' }}>₹{totWages.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#7C3AED', textAlign: 'right' }}>₹{totEmp.toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#2563EB', textAlign: 'right' }}>₹{monthly.reduce((s,m)=>s+(m.eps_employer||0),0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#2563EB', textAlign: 'right' }}>₹{monthly.reduce((s,m)=>s+(m.epf_employer||0),0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#059669', textAlign: 'right' }}>₹{(totEmp + totEr).toLocaleString('en-IN')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
