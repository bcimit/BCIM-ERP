// src/pages/hr-admin/PositionHistoryPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { History, Search, Building2, Briefcase, MapPin, Calendar, ChevronRight, Plus, X, Trash2 } from 'lucide-react';
import { hrEmployeesAPI } from '../../api/client';
import axios from 'axios';
import toast from 'react-hot-toast';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });

const CHANGE_TYPES = ['Promotion', 'Transfer', 'Demotion', 'Lateral Move', 'Location Change', 'Department Change'];
const EMPTY = { effective_date: '', designation: '', department: '', location: '', grade: '', change_type: 'Promotion', reason: '', remarks: '' };

export default function PositionHistoryPage() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [empId,  setEmpId]    = useState(null);
  const [empName, setEmpName] = useState('');
  const [empType, setEmpType] = useState('Current');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY);

  const { data: empData } = useQuery({
    queryKey: ['hr-employees-search', search],
    queryFn: () => hrEmployeesAPI.list({ search, status: empType === 'Current' ? 'active' : undefined }).then(r => r.data),
    enabled: search.length > 1,
  });

  const { data: histData, isLoading } = useQuery({
    queryKey: ['hr-position-history', empId],
    queryFn: () => API.get(`/hr/position-history/${empId}`).then(r => r.data),
    enabled: !!empId,
  });

  const addMut = useMutation({
    mutationFn: (data) => API.post(`/hr/position-history/${empId}`, data).then(r => r.data),
    onSuccess: () => { toast.success('Position entry added'); qc.invalidateQueries({ queryKey: ['hr-position-history', empId] }); setShowModal(false); setForm(EMPTY); },
    onError: (e) => toast.error(e?.response?.data?.error || 'Failed to add'),
  });

  const delMut = useMutation({
    mutationFn: (id) => API.delete(`/hr/position-history/${empId}/${id}`).then(r => r.data),
    onSuccess: () => { toast.success('Entry deleted'); qc.invalidateQueries({ queryKey: ['hr-position-history', empId] }); },
    onError: () => toast.error('Delete failed'),
  });

  const employees = empData?.data || [];
  const history   = histData?.data || [];
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <History size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Position History</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>View and record designation, department, grade, and location changes.</p>
          </div>
        </div>
        {empId && (
          <button onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
            <Plus size={15} /> Add Entry
          </button>
        )}
      </div>

      {/* Search */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Employee Type</label>
            <select value={empType} onChange={e => setEmpType(e.target.value)}
              style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC' }}>
              <option>Current</option><option>Ex-Employee</option><option>All</option>
            </select>
          </div>
          <div style={{ flex: 3 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>Search Employee</label>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
              <input value={search} onChange={e => { setSearch(e.target.value); setEmpId(null); setEmpName(''); }}
                placeholder="Search by Emp No / Name"
                style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
              {search && employees.length > 0 && !empId && (
                <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: 220, overflowY: 'auto' }}>
                  {employees.slice(0, 8).map(e => (
                    <button key={e.id} onClick={() => { setEmpId(e.id); setEmpName(e.name); setSearch(`${e.employee_code || e.id} – ${e.name}`); }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                      onMouseEnter={el => el.currentTarget.style.background = '#F8FAFC'}
                      onMouseLeave={el => el.currentTarget.style.background = 'transparent'}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: B.purple }}>
                        {(e.name || '').split(' ').map(x => x[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{e.name}</div>
                        <div style={{ fontSize: 11, color: '#64748B' }}>{e.employee_code} · {e.designation || e.department}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {!empId && (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <History size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Search for an employee to view their position history</p>
        </div>
      )}

      {empId && isLoading && <div style={{ textAlign: 'center', padding: 60, color: '#94A3B8' }}>Loading…</div>}

      {empId && !isLoading && (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Position History — {empName}</h3>
            <span style={{ fontSize: 12, color: '#64748B' }}>{history.length} record{history.length !== 1 ? 's' : ''}</span>
          </div>
          {history.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', fontSize: 13 }}>No position history. Use "Add Entry" to record the first change.</div>
          ) : (
            <div style={{ padding: '16px 24px' }}>
              {history.map((h, i) => (
                <div key={h.id} style={{ display: 'flex', gap: 16, paddingBottom: 20 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#7C3AED15', border: `2px solid ${B.purple}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <ChevronRight size={14} color={B.purple} />
                    </div>
                    {i < history.length - 1 && <div style={{ width: 2, flex: 1, background: '#E2E8F0', marginTop: 4 }} />}
                  </div>
                  <div style={{ flex: 1, paddingTop: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <div style={{ fontSize: 12, color: '#64748B', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Calendar size={11} /> {h.effective_date?.slice(0, 10) || 'N/A'}
                        <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 700, background: '#F0F4FF', color: '#3730A3', padding: '2px 8px', borderRadius: 4 }}>{h.change_type}</span>
                      </div>
                      <button onClick={() => { if (window.confirm('Delete this entry?')) delMut.mutate(h.id); }}
                        style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: '#94A3B8', padding: 4 }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {h.designation && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, background: '#EFF6FF', color: '#1D4ED8', borderRadius: 6, padding: '3px 8px' }}><Briefcase size={11} /> {h.designation}</span>}
                      {h.department  && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, background: '#F0FDF4', color: '#15803D', borderRadius: 6, padding: '3px 8px' }}><Building2 size={11} /> {h.department}</span>}
                      {h.location    && <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, background: '#FFF7ED', color: '#C2410C', borderRadius: 6, padding: '3px 8px' }}><MapPin size={11} /> {h.location}</span>}
                      {h.grade       && <span style={{ fontSize: 12, background: '#F5F3FF', color: '#6D28D9', borderRadius: 6, padding: '3px 8px' }}>Grade: {h.grade}</span>}
                    </div>
                    {h.reason  && <p style={{ fontSize: 12, color: '#64748B', marginTop: 4, marginBottom: 0 }}><b>Reason:</b> {h.reason}</p>}
                    {h.remarks && <p style={{ fontSize: 12, color: '#64748B', marginTop: 2, marginBottom: 0 }}>{h.remarks}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: 520, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: 0 }}>Add Position Entry</h2>
              <button onClick={() => setShowModal(false)} style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              {[
                { label: 'Effective Date *', key: 'effective_date', type: 'date' },
                { label: 'Change Type', key: 'change_type', type: 'select', opts: CHANGE_TYPES },
                { label: 'New Designation', key: 'designation', type: 'text' },
                { label: 'New Department',  key: 'department',  type: 'text' },
                { label: 'New Location',    key: 'location',    type: 'text' },
                { label: 'Grade',           key: 'grade',       type: 'text' },
              ].map(({ label, key, type, opts }) => (
                <div key={key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
                  {type === 'select' ? (
                    <select value={form[key]} onChange={e => set(key, e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC' }}>
                      {opts.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={type} value={form[key]} onChange={e => set(key, e.target.value)}
                      style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
                  )}
                </div>
              ))}
            </div>
            {[{ label: 'Reason', key: 'reason' }, { label: 'Remarks', key: 'remarks' }].map(({ label, key }) => (
              <div key={key} style={{ marginTop: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'block', marginBottom: 5 }}>{label}</label>
                <textarea value={form[key]} onChange={e => set(key, e.target.value)} rows={2}
                  style={{ width: '100%', padding: '8px 10px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={() => setShowModal(false)}
                style={{ padding: '9px 18px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, fontWeight: 600, background: '#fff', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => { if (!form.effective_date) { toast.error('Effective date required'); return; } addMut.mutate(form); }}
                disabled={addMut.isPending}
                style={{ padding: '9px 18px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: addMut.isPending ? 0.6 : 1 }}>
                {addMut.isPending ? 'Saving…' : 'Save Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
