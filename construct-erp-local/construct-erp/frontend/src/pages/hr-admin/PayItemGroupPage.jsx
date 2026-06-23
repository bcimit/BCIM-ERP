// src/pages/hr-admin/PayItemGroupPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, X, Edit2, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const lbl = { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const TYPES = ['Earning', 'Deduction', 'Reimbursement'];
const EMPTY = { name: '', type: 'Earning', description: '' };

const fetchGroups = () => API.get('/hr/pay-item-groups').then(r => r.data);

export default function PayItemGroupPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const { data, isLoading } = useQuery({ queryKey: ['pay-item-groups'], queryFn: fetchGroups });
  const groups = data?.data || [];

  const openAdd = () => { setForm(EMPTY); setEditing(null); setModal(true); };
  const openEdit = (g) => { setForm({ name: g.name, type: g.type || 'Earning', description: g.description || '' }); setEditing(g.id); setModal(true); };

  const saveMut = useMutation({
    mutationFn: () => editing ? API.put(`/hr/pay-item-groups/${editing}`, form) : API.post('/hr/pay-item-groups', form),
    onSuccess: () => { toast.success(editing ? 'Updated' : 'Group created'); qc.invalidateQueries({ queryKey: ['pay-item-groups'] }); setModal(false); },
    onError: e => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: (id) => API.delete(`/hr/pay-item-groups/${id}`),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey: ['pay-item-groups'] }); },
    onError: () => toast.error('Delete failed'),
  });

  const TYPE_COLORS = { Earning: { bg: '#F0FDF4', text: '#15803D' }, Deduction: { bg: '#FEF2F2', text: '#DC2626' }, Reimbursement: { bg: '#EFF6FF', text: '#1D4ED8' } };

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Layers size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Pay Item Groups</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Organize earnings, deductions, and reimbursements into named pay item groups.</p>
          </div>
        </div>
        <button onClick={openAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
          <Plus size={15} /> Add Group
        </button>
      </div>

      {/* Groups by type */}
      {TYPES.map(type => {
        const typeGroups = groups.filter(g => (g.type || 'Earning') === type);
        const tc = TYPE_COLORS[type];
        return (
          <div key={type} style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '3px 10px', borderRadius: 6, background: tc.bg, color: tc.text }}>{type}s</span>
              <span style={{ fontSize: 12, color: '#94A3B8' }}>{typeGroups.length} group{typeGroups.length !== 1 ? 's' : ''}</span>
            </div>
            {typeGroups.length === 0 ? (
              <div style={{ background: '#F8FAFC', border: '1px dashed #E2E8F0', borderRadius: 12, padding: '20px 24px', fontSize: 13, color: '#94A3B8' }}>
                No {type.toLowerCase()} groups yet.
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
                {typeGroups.map((g, i) => (
                  <div key={g.id || i} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < typeGroups.length - 1 ? '1px solid #F8FAFC' : 'none' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFBFF'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <GripVertical size={14} color="#CBD5E1" style={{ marginRight: 12, cursor: 'grab', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{g.name}</div>
                      {g.description && <div style={{ fontSize: 12, color: '#64748B', marginTop: 2 }}>{g.description}</div>}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginLeft: 16 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B' }}>{g.item_count || 0} items</span>
                      <button onClick={() => openEdit(g)} style={{ padding: '5px 10px', border: '1px solid #E2E8F0', borderRadius: 6, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#4F46E5', fontWeight: 600 }}><Edit2 size={11} /> Edit</button>
                      <button onClick={() => deleteMut.mutate(g.id)} style={{ padding: '5px 10px', border: '1px solid #FEE2E2', borderRadius: 6, background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#EF4444', fontWeight: 600 }}><Trash2 size={11} /> Del</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {isLoading && <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>}

      {/* Modal */}
      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 440, maxWidth: '95vw' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>{editing ? 'Edit Group' : 'New Pay Item Group'}</h2>
              <button onClick={() => setModal(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}><X size={18} color="#64748B" /></button>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label style={lbl}>Group Name</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Core Earnings"
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={lbl}>Type</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={3}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setModal(false)} style={{ padding: '9px 18px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, cursor: 'pointer', background: '#F8FAFC', color: '#64748B', fontWeight: 600 }}>Cancel</button>
              <button onClick={() => saveMut.mutate()} disabled={!form.name || saveMut.isPending}
                style={{ padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                {saveMut.isPending ? 'Saving…' : editing ? 'Update' : 'Create Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
