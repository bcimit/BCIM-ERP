// src/pages/hr-admin/SalaryRevisionAnalyticsPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const cur = new Date();

const fetch = (year) =>
  API.get('/hr/salary-revision-analytics', { params: { year } }).then(r => r.data);

const BAR_COLORS = ['#7C3AED','#2563EB','#059669','#D97706','#DC2626','#0891B2','#7C3AED80'];

export default function SalaryRevisionAnalyticsPage() {
  const [year, setYear] = useState(cur.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ['salary-revision-analytics', year],
    queryFn: () => fetch(year),
  });

  const summary   = data?.data?.summary   || { total_revised: 0, avg_hike_pct: 0, total_employees: 0, avg_revised_ctc: 0 };
  const bands     = data?.data?.bands     || [];
  const monthly   = data?.data?.monthly   || [];
  const topEarners= data?.data?.top_earners || [];

  const maxBandCount = Math.max(...bands.map(b => b.count), 1);
  const maxMonthly   = Math.max(...monthly.map(m => m.count), 1);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Salary Revision Analytics</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Salary distribution, hike trends, and band analysis.</p>
          </div>
        </div>
        <select value={year} onChange={e => setYear(Number(e.target.value))}
          style={{ padding: '8px 16px', border: '1px solid #E2E8F0', borderRadius: 10, fontSize: 14, fontWeight: 700, background: '#F8FAFC', color: B.purple, outline: 'none' }}>
          {[cur.getFullYear() - 2, cur.getFullYear() - 1, cur.getFullYear()].map(y => <option key={y}>{y}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading analytics…</div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Total Employees',    value: summary.total_employees, unit: '', color: '#7C3AED' },
              { label: 'Revisions This Year', value: summary.total_revised,  unit: '', color: '#2563EB' },
              { label: 'Avg Hike %',          value: `${(+summary.avg_hike_pct || 0).toFixed(1)}%`, unit: '', color: '#059669' },
              { label: 'Avg CTC (Revised)',   value: `₹${Number(summary.avg_revised_ctc || 0).toLocaleString('en-IN')}`, unit: '', color: '#D97706' },
            ].map(c => (
              <div key={c.label} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: '16px 20px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
            {/* CTC Band Distribution */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 24px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 20px' }}>CTC Band Distribution</h3>
              {bands.length === 0 ? (
                <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: 30 }}>No data</div>
              ) : bands.map((b, i) => (
                <div key={b.band} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, color: '#374151', fontWeight: 600 }}>{b.band}</span>
                    <span style={{ fontSize: 13, color: '#64748B' }}>{b.count} emp ({b.pct}%)</span>
                  </div>
                  <div style={{ height: 10, background: '#F1F5F9', borderRadius: 6, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${(b.count / maxBandCount) * 100}%`, background: BAR_COLORS[i % BAR_COLORS.length], borderRadius: 6, transition: 'width 0.4s' }} />
                  </div>
                </div>
              ))}
            </div>

            {/* Monthly revision count */}
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 24px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: '0 0 20px' }}>Revisions by Month</h3>
              {monthly.length === 0 ? (
                <div style={{ color: '#94A3B8', fontSize: 13, textAlign: 'center', padding: 30 }}>No revisions this year</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 140 }}>
                  {monthly.map((m, i) => (
                    <div key={m.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: '#7C3AED' }}>{m.count || ''}</div>
                      <div style={{ width: '100%', background: '#7C3AED', borderRadius: '4px 4px 0 0', height: `${Math.max((m.count / maxMonthly) * 110, m.count > 0 ? 6 : 0)}px`, transition: 'height 0.4s' }} />
                      <div style={{ fontSize: 9, color: '#94A3B8', fontWeight: 600 }}>{m.month_label}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Top earners table */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9' }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', margin: 0 }}>Recent Revisions</h3>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  {['Employee','Department','Previous CTC','Revised CTC','Hike %','Effective From'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topEarners.length === 0 ? (
                  <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>No revision data for {year}.</td></tr>
                ) : topEarners.map(r => {
                  const hike = r.previous_ctc > 0 ? (((r.revised_ctc - r.previous_ctc) / r.previous_ctc) * 100).toFixed(1) : null;
                  const up = r.revised_ctc >= r.previous_ctc;
                  return (
                    <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: '#94A3B8' }}>{r.employee_code}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.department || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#374151' }}>₹{Number(r.previous_ctc || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>₹{Number(r.revised_ctc || 0).toLocaleString('en-IN')}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {hike !== null && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 12, fontWeight: 700, color: up ? '#15803D' : '#DC2626' }}>
                            {up ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />} {Math.abs(hike)}%
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 13, color: '#64748B' }}>{r.effective_date ? new Date(r.effective_date).toLocaleDateString('en-IN') : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
