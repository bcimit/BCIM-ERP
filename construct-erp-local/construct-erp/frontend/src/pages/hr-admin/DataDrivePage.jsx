// src/pages/hr-admin/DataDrivePage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Database, Send, Clock, Plus, X, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });

const DRIVE_TYPES = ['Aadhaar', 'Bank Details', 'PAN', 'Vaccination'];
const DRIVE_ICONS = { Aadhaar: '🪪', 'Bank Details': '🏦', PAN: '💳', Vaccination: '💉' };
const EMPTY = { drive_type: 'Aadhaar', title: '', deadline: '' };

export default function DataDrivePage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({
    queryKey: ['data-drives'],
    queryFn: () => API.get('/hr/data-drive').then(r => r.data),
  });
  const drives = data?.data || [];

  const createMut = useMutation({
    mutationFn: (d) => API.post('/hr/data-drive', d).then(r => r.data),
    onSuccess: () => { toast.success('Data drive created'); qc.invalidateQueries({ queryKey: ['data-drives'] }); setShowModal(false); setForm(EMPTY); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const delMut = useMutation({
    mutationFn: (id) => API.delete(`/hr/data-drive/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('Drive deleted'); qc.invalidateQueries({ queryKey: ['data-drives'] }); },
    onError: () => toast.error('Delete failed'),
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const pct = (d) => d.total_emp ? Math.round((d.response_count / d.total_emp) * 100) : 0;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Database size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Data Drive</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Initiate data collection drives for Aadhaar, bank details, PAN, and vaccination records.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> New Drive
        </button>
      </div>

      {isLoading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Loading…</div>
      ) : drives.length === 0 ? (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <Database size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>No data drives yet. Click "New Drive" to get started.</p>
        </div>
      ) : drives.map(drive => {
        const p = pct(drive);
        const isActive = drive.status === 'Active';
        return (
          <div key={drive.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: '20px 24px', marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F5F3FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>
                  {DRIVE_ICONS[drive.drive_type] || '📋'}
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>{drive.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 3 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4, background: isActive ? '#F0FDF4' : '#F8FAFC', color: isActive ? '#15803D' : '#94A3B8' }}>{drive.status}</span>
                    <span style={{ fontSize: 11, color: '#64748B' }}>{drive.drive_type}</span>
                    {drive.deadline && <span style={{ fontSize: 11, color: '#64748B', display: 'flex', alignItems: 'center', gap: 3 }}><Clock size={10} /> Deadline: {drive.deadline?.slice(0,10)}</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 20, fontWeight: 800, color: B.purple }}>{p}%</div>
                  <div style={{ fontSize: 11, color: '#64748B' }}>{drive.response_count} / {drive.total_emp} responded</div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => toast.success('Reminders sent!')}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', background: '#fff', border: `1px solid ${B.purple}`, borderRadius: 7, fontSize: 12, color: B.purple, fontWeight: 700, cursor: 'pointer' }}>
                    <Send size={12} /> Remind
                  </button>
                  <button onClick={() => { if (window.confirm('Delete this drive?')) delMut.mutate(drive.id); }}
                    style={{ padding: '7px 10px', background: '#fff', border: '1px solid #FECACA', borderRadius: 7, color: '#DC2626', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 14, background: '#F1F5F9', borderRadius: 99, height: 6 }}>
              <div style={{ width: `${p}%`, background: B.purple, borderRadius: 99, height: 6, transition: 'width 0.4s' }} />
            </div>
          </div>
        );
      })}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>New Data Drive</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            {[
              { label: 'Drive Type', key: 'drive_type', type: 'select', opts: DRIVE_TYPES },
              { label: 'Title *', key: 'title', type: 'text', placeholder: 'e.g. Q1 Aadhaar Collection Drive' },
              { label: 'Deadline', key: 'deadline', type: 'date' },
            ].map(({ label, key, type, opts, placeholder }) => (
              <div key={key} style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
                {type === 'select' ? (
                  <select value={form[key]} onChange={e => set(key, e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC' }}>
                    {opts.map(o => <option key={o}>{o}</option>)}
                  </select>
                ) : (
                  <input type={type} value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder}
                    style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
                )}
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 18px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { if (!form.title) { toast.error('Title required'); return; } createMut.mutate(form); }}
                disabled={createMut.isPending}
                style={{ padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: createMut.isPending ? 0.6 : 1 }}>
                {createMut.isPending ? 'Creating…' : 'Create Drive'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
