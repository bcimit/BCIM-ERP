// src/pages/hr-admin/SalaryRevisionHistoryPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { hrEmployeesAPI } from '../../api/client';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });

export default function SalaryRevisionHistoryPage() {
  const [search, setSearch] = useState('');
  const [empId, setEmpId]   = useState(null);
  const [empName, setEmpName] = useState('');

  const { data: empData } = useQuery({
    queryKey: ['hr-emp-search-rev', search],
    queryFn: () => hrEmployeesAPI.list({ search }).then(r => r.data),
    enabled: search.length > 1,
  });
  const employees = empData?.data || [];

  const { data: revData, isLoading } = useQuery({
    queryKey: ['salary-revisions', empId],
    queryFn: () => API.get(`/hr/salary-revisions/${empId}`).then(r => r.data),
    enabled: !!empId,
  });
  const revisions = revData?.data || [];

  const pct = (from, to) => {
    if (!from || !to) return 0;
    return (((to - from) / from) * 100).toFixed(1);
  };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Salary Revision History</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>View the complete salary revision timeline for any employee.</p>
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
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, color: B.purple }}>
                    {(e.name || '').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{e.employee_code} · {e.designation}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!empId ? (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <TrendingUp size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Search for an employee to view their salary revision history</p>
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Salary Revisions — {empName}</h3>
          </div>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
          ) : revisions.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No revision history found.</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Effective Date', 'Previous CTC', 'Revised CTC', 'Change %', 'Revised By', 'Reason'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {revisions.map((r, i) => {
                  const change = pct(r.previous_ctc, r.revised_ctc);
                  const isUp = change >= 0;
                  return (
                    <tr key={r.id || i} style={{ borderBottom: '1px solid #F8FAFC' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.effective_date ? new Date(r.effective_date).toLocaleDateString('en-IN') : '—'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: '#64748B' }}>₹{Number(r.previous_ctc || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>₹{Number(r.revised_ctc || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: isUp ? '#15803D' : '#DC2626' }}>
                          {isUp ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {Math.abs(change)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B' }}>{r.revised_by || 'HR Admin'}</td>
                      <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748B' }}>{r.reason || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
