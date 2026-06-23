// src/pages/hr-admin/BankTransferPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Landmark, Download, CheckCircle, AlertCircle, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const currentYear  = new Date().getFullYear();
const currentMonth = new Date().getMonth() + 1;

const fetchBankData = (month, year) => API.get('/hr/bank-transfer', { params: { month, year } }).then(r => r.data);

export default function BankTransferPage() {
  const qc = useQueryClient();
  const [month, setMonth]     = useState(currentMonth);
  const [year,  setYear]      = useState(currentYear);
  const [search, setSearch]   = useState('');
  const [selected, setSelected] = useState(new Set());

  const { data, isLoading } = useQuery({
    queryKey: ['bank-transfer', month, year],
    queryFn: () => fetchBankData(month, year),
  });
  const rows = data?.data || [];
  const filtered = rows.filter(r => !search || r.name?.toLowerCase().includes(search.toLowerCase()) || r.employee_code?.includes(search));
  const totalSelected = [...selected].reduce((sum, id) => {
    const r = filtered.find(r => r.id === id);
    return sum + (r?.net_pay || 0);
  }, 0);

  const toggleAll = () => {
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(r => r.id)));
  };
  const toggle = (id) => setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const generateMut = useMutation({
    mutationFn: () => API.post('/hr/bank-transfer/generate', { month, year, employee_ids: [...selected] }),
    onSuccess: (res) => {
      toast.success('Bank transfer file generated');
      if (res.data?.download_url) {
        const a = document.createElement('a');
        a.href = res.data.download_url;
        a.download = `bank-transfer-${MONTHS[month-1]}-${year}.txt`;
        a.click();
      }
      qc.invalidateQueries({ queryKey: ['bank-transfer', month, year] });
    },
    onError: e => toast.error(e?.response?.data?.error || 'Generation failed'),
  });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Landmark size={18} color={B.purple} />
            </div>
            <div>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Bank Transfer</h1>
              <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Generate NEFT/RTGS bank transfer files for salary disbursement.</p>
            </div>
          </div>
          <button onClick={() => generateMut.mutate()} disabled={selected.size === 0 || generateMut.isPending}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: selected.size === 0 ? '#CBD5E1' : B.purple, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: selected.size === 0 ? 'not-allowed' : 'pointer' }}>
            <Download size={15} /> {generateMut.isPending ? 'Generating…' : `Generate File${selected.size > 0 ? ` (${selected.size})` : ''}`}
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

      {selected.size > 0 && (
        <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '10px 18px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
          <span style={{ color: '#4C1D95', fontWeight: 700 }}>{selected.size} employees selected</span>
          <span style={{ color: '#7C3AED', fontWeight: 800 }}>Total: ₹{totalSelected.toLocaleString('en-IN')}</span>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              <th style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', width: 40 }}>
                <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0} onChange={toggleAll} style={{ cursor: 'pointer' }} />
              </th>
              {['Emp Code', 'Name', 'Bank Name', 'Account No', 'IFSC', 'Net Pay', 'Status'].map(h => (
                <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #F1F5F9' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ padding: 48, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No payroll data for {MONTHS[month-1]} {year}.</td></tr>
            ) : filtered.map((r, i) => {
              const sel = selected.has(r.id);
              const hasBankDetails = r.bank_account && r.ifsc_code;
              return (
                <tr key={r.id || i} style={{ borderBottom: '1px solid #F8FAFC', background: sel ? '#F5F3FF' : 'transparent' }}
                  onMouseEnter={e => { if (!sel) e.currentTarget.style.background = '#FAFBFF'; }}
                  onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
                  <td style={{ padding: '10px 16px' }}>
                    <input type="checkbox" checked={sel} onChange={() => toggle(r.id)} disabled={!hasBankDetails} style={{ cursor: hasBankDetails ? 'pointer' : 'not-allowed' }} />
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B', fontFamily: 'monospace' }}>{r.employee_code}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748B' }}>{r.bank_name || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>
                    {r.bank_account ? `****${String(r.bank_account).slice(-4)}` : (
                      <span style={{ color: '#EF4444', fontSize: 11, fontWeight: 600 }}>Missing</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151', fontFamily: 'monospace' }}>{r.ifsc_code || '—'}</td>
                  <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 800, color: '#0F172A' }}>₹{Number(r.net_pay || 0).toLocaleString('en-IN')}</td>
                  <td style={{ padding: '10px 14px' }}>
                    {r.transfer_status === 'Transferred' ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#15803D', background: '#F0FDF4', borderRadius: 6, padding: '3px 8px' }}><CheckCircle size={11} /> Transferred</span>
                    ) : !hasBankDetails ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 700, color: '#DC2626', background: '#FEF2F2', borderRadius: 6, padding: '3px 8px' }}><AlertCircle size={11} /> No Bank Details</span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 700, color: '#B45309', background: '#FFFBEB', borderRadius: 6, padding: '3px 8px' }}>Pending</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
