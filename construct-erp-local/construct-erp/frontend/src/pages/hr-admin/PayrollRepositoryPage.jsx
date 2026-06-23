// src/pages/hr-admin/PayrollRepositoryPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Archive, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear = new Date().getFullYear();

const fetchRepo = (year) => API.get('/hr/payroll-repository', { params: { year } }).then(r => r.data);

const STATUS_COLORS = {
  Finalized:  { bg: '#F0FDF4', text: '#15803D', icon: <CheckCircle size={13} /> },
  Processing: { bg: '#EFF6FF', text: '#1D4ED8', icon: <Clock size={13} /> },
  Pending:    { bg: '#FFFBEB', text: '#B45309', icon: <Clock size={13} /> },
  Skipped:    { bg: '#F8FAFC', text: '#94A3B8', icon: <XCircle size={13} /> },
};

export default function PayrollRepositoryPage() {
  const [year, setYear] = useState(currentYear);

  const { data, isLoading } = useQuery({
    queryKey: ['payroll-repository', year],
    queryFn: () => fetchRepo(year),
  });
  const months = data?.data || [];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Archive size={18} color={B.purple} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Payroll Repository</h1>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Archive of all monthly payroll runs — status, employee count, and totals.</p>
            </div>
          </div>
          <div>
            <select value={year} onChange={e => setYear(Number(e.target.value))}
              style={{ padding: '9px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#F8FAFC', outline: 'none', color: B.purple }}>
              {[currentYear-1, currentYear, currentYear+1].map(y => <option key={y}>{y}</option>)}
            </select>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {MONTHS.map((monthName, mi) => {
            const rec = months.find(m => m.month === mi+1 && m.year === year);
            const status = rec?.status || 'Pending';
            const sc = STATUS_COLORS[status] || STATUS_COLORS.Pending;
            const isPast = new Date(year, mi, 1) < new Date();
            return (
              <div key={monthName} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', opacity: !isPast && !rec ? 0.5 : 1 }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#0F172A' }}>{monthName} {year}</div>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 6, background: sc.bg, color: sc.text }}>
                    {sc.icon} {status}
                  </span>
                </div>
                <div style={{ padding: '14px 18px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  {[
                    { label: 'Employees', value: rec?.employee_count || 0 },
                    { label: 'Working Days', value: rec?.working_days || '—' },
                    { label: 'Gross Payable', value: rec?.gross_total ? `₹${Number(rec.gross_total).toLocaleString('en-IN')}` : '—' },
                    { label: 'Net Payable', value: rec?.net_total ? `₹${Number(rec.net_total).toLocaleString('en-IN')}` : '—' },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: '#0F172A' }}>{value}</div>
                    </div>
                  ))}
                </div>
                {rec?.finalized_on && (
                  <div style={{ padding: '8px 18px', borderTop: '1px solid #F8FAFC', fontSize: 11, color: '#94A3B8' }}>
                    Finalized: {new Date(rec.finalized_on).toLocaleDateString('en-IN')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
