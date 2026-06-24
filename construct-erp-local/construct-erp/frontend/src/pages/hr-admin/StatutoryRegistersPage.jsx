// src/pages/hr-admin/StatutoryRegistersPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookMarked, Download, FileText, ChevronDown } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const cur = new Date();
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const REGISTERS = [
  { key: 'form_b',   label: 'Form B',        desc: 'Register of Establishments',         act: 'Factories Act / S&E Act' },
  { key: 'form_c',   label: 'Form C',        desc: 'Register of Adult Workers',           act: 'Factories Act' },
  { key: 'form_d',   label: 'Form D',        desc: 'Register of Leave with Wages',        act: 'Factories Act' },
  { key: 'form_14',  label: 'Form 14',       desc: 'Register of Wages',                   act: 'Payment of Wages Act' },
  { key: 'muster_roll', label: 'Muster Roll', desc: 'Daily attendance register',          act: 'Contract Labour Act' },
  { key: 'overtime', label: 'OT Register',   desc: 'Overtime hours — Form I',             act: 'Factories Act' },
  { key: 'form_16a', label: 'Form 16A',      desc: 'Register of Advances',                act: 'Payment of Wages Act' },
  { key: 'accident', label: 'Accident Book', desc: 'Form for recording workplace injuries', act: 'Factories Act' },
];

const fetchRegister = (key, month, year) => API.get('/hr/compliance/statutory-registers', { params: { register: key, month, year } }).then(r => r.data);

export default function StatutoryRegistersPage() {
  const [selected, setSelected] = useState('form_c');
  const [month, setMonth] = useState(cur.getMonth() + 1);
  const [year, setYear]   = useState(cur.getFullYear());

  const reg = REGISTERS.find(r => r.key === selected);

  const { data, isLoading } = useQuery({
    queryKey: ['statutory-register', selected, month, year],
    queryFn: () => fetchRegister(selected, month, year),
  });
  const rows = data?.data || [];

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <BookMarked size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Statutory Registers</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>All mandatory registers under Labour Laws — Factories Act, S&E Act, Contract Labour Act</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', outline: 'none' }}>
            {[cur.getFullYear()-1, cur.getFullYear()].map(y => <option key={y}>{y}</option>)}
          </select>
          <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Download size={14} /> Download {reg?.label}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 20 }}>
        {/* Sidebar register list */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', height: 'fit-content' }}>
          {REGISTERS.map(r => (
            <button key={r.key} onClick={() => setSelected(r.key)}
              style={{ width: '100%', textAlign: 'left', padding: '12px 16px', border: 'none', background: selected === r.key ? '#F5F3FF' : '#fff', borderLeft: `3px solid ${selected === r.key ? B.purple : 'transparent'}`, cursor: 'pointer', borderBottom: '1px solid #F1F5F9' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: selected === r.key ? B.purple : '#0F172A', marginBottom: 2 }}>{r.label}</div>
              <div style={{ fontSize: 11, color: '#94A3B8' }}>{r.act}</div>
            </button>
          ))}
        </div>

        {/* Register content */}
        <div>
          <div style={{ background: '#F5F3FF', border: '1px solid #DDD6FE', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: B.purple }}>{reg?.label} — {reg?.desc}</div>
            <div style={{ fontSize: 12, color: '#7C3AED', marginTop: 2 }}>Under: {reg?.act} · Period: {MONTHS[month-1]} {year}</div>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
            {isLoading ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading register…</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>
                <FileText size={32} style={{ marginBottom: 12, opacity: 0.3 }} />
                <div style={{ fontSize: 14, fontWeight: 600 }}>No data for {MONTHS[month-1]} {year}</div>
                <div style={{ fontSize: 12, marginTop: 4 }}>Run payroll for this month to populate this register.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC' }}>
                      {Object.keys(rows[0] || {}).map(k => (
                        <th key={k} style={{ padding: '10px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid #E2E8F0', whiteSpace: 'nowrap' }}>
                          {k.replace(/_/g, ' ')}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        {Object.values(r).map((v, j) => (
                          <td key={j} style={{ padding: '9px 12px', fontSize: 12, color: '#374151' }}>
                            {v != null ? String(v) : '—'}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
