// src/pages/hr-admin/AccountsJVPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, Download, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const fetchJV = (m, y) => API.get('/hr/accounts-jv', { params: { month: m, year: y } }).then(r => r.data);

export default function AccountsJVPage() {
  const qc = useQueryClient();
  const [month, setMonth] = useState(currentMonth);
  const [year,  setYear]  = useState(currentYear);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['accounts-jv', month, year],
    queryFn: () => fetchJV(month, year),
  });
  const jv = data?.data || null;
  const entries = jv?.entries || [];

  const exportMut = useMutation({
    mutationFn: () => API.post('/hr/accounts-jv/export', { month, year }),
    onSuccess: (res) => {
      toast.success('Journal Voucher exported');
      if (res.data?.download_url) {
        const a = document.createElement('a');
        a.href = res.data.download_url;
        a.download = `JV-${MONTHS[month-1]}-${year}.xlsx`;
        a.click();
      }
    },
    onError: () => toast.error('Export failed'),
  });

  const totalDebits  = entries.filter(e => e.type === 'Dr').reduce((s, e) => s + (e.amount || 0), 0);
  const totalCredits = entries.filter(e => e.type === 'Cr').reduce((s, e) => s + (e.amount || 0), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookOpen size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Accounts Journal Voucher</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Salary journal entries for posting to accounts system.</p>
          </div>
        </div>
        <button onClick={() => exportMut.mutate()} disabled={exportMut.isPending}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Download size={15} /> {exportMut.isPending ? 'Exporting…' : 'Export JV'}
        </button>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 20, display: 'flex', gap: 14, alignItems: 'flex-end' }}>
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

      {/* JV info */}
      {!isLoading && jv && (
        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 12, padding: '14px 20px', marginBottom: 20, display: 'flex', gap: 32, alignItems: 'center' }}>
          <div><div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 700 }}>JV DATE</div><div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{jv.jv_date ? new Date(jv.jv_date).toLocaleDateString('en-IN') : '—'}</div></div>
          <div><div style={{ fontSize: 11, color: '#7C3AED', fontWeight: 700 }}>NARRATION</div><div style={{ fontSize: 13, color: '#374151' }}>{jv.narration || `Salary for ${MONTHS[month-1]} ${year}`}</div></div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 24 }}>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#059669', fontWeight: 700 }}>TOTAL DR</div><div style={{ fontSize: 16, fontWeight: 800, color: '#059669' }}>₹{totalDebits.toLocaleString('en-IN')}</div></div>
            <div style={{ textAlign: 'right' }}><div style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>TOTAL CR</div><div style={{ fontSize: 16, fontWeight: 800, color: '#DC2626' }}>₹{totalCredits.toLocaleString('en-IN')}</div></div>
          </div>
        </div>
      )}

      {/* Entries table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['#', 'Account Code', 'Account Name', 'Dr/Cr', 'Amount', 'Cost Centre'].map(h => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : entries.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No JV entries for {MONTHS[month-1]} {year}.</td></tr>
            ) : entries.map((e, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}
                onMouseEnter={ev => ev.currentTarget.style.background = '#FAFBFF'}
                onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#94A3B8' }}>{i+1}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{e.account_code}</td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{e.account_name}</td>
                <td style={{ padding: '10px 14px' }}>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: '3px 10px', borderRadius: 6, background: e.type === 'Dr' ? '#F0FDF4' : '#FEF2F2', color: e.type === 'Dr' ? '#15803D' : '#DC2626' }}>{e.type}</span>
                </td>
                <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: e.type === 'Dr' ? '#059669' : '#DC2626' }}>₹{Number(e.amount || 0).toLocaleString('en-IN')}</td>
                <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{e.cost_centre || '—'}</td>
              </tr>
            ))}
          </tbody>
          {!isLoading && entries.length > 0 && (
            <tfoot>
              <tr style={{ background: '#F8FAFC', borderTop: '2px solid #E2E8F0' }}>
                <td colSpan={4} style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: '#64748B' }}>
                  {totalDebits === totalCredits ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#15803D' }}><CheckCircle size={13} /> Balanced</span> : <span style={{ color: '#DC2626' }}>Out of Balance</span>}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A' }}>₹{totalDebits.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px 14px' }}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
