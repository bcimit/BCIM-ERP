// src/pages/hr-admin/ITDeclarationPage.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileBadge, Search, Save, CheckCircle } from 'lucide-react';
import { hrEmployeesAPI } from '../../api/client';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const lbl = { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 };
const API = axios.create({ baseURL: '/api', withCredentials: true });

const SECTIONS = [
  { id: '80C', label: 'Section 80C', max: 150000, items: ['PPF', 'ELSS Mutual Funds', 'LIC Premium', 'NSC', 'Tuition Fees', 'Home Loan Principal', 'Tax Saver FD', 'EPF (Employee)', 'ULIP', 'SSY (Sukanya Samriddhi)'] },
  { id: '80D', label: 'Section 80D (Medical Insurance)', max: 25000, items: ['Self & Family Premium', 'Parents Premium'] },
  { id: '80E', label: 'Section 80E (Education Loan)', max: null, items: ['Education Loan Interest'] },
  { id: 'HRA', label: 'HRA Exemption', max: null, items: ['Annual Rent Paid', 'Landlord PAN'] },
  { id: 'Other', label: 'Other Deductions', max: null, items: ['80G (Donations)', '80TTA (Savings Interest)', 'NPS 80CCD(1B)'] },
];

export default function ITDeclarationPage() {
  const qc = useQueryClient();
  const [search, setSearch]   = useState('');
  const [empId, setEmpId]     = useState(null);
  const [empName, setEmpName] = useState('');
  const [values, setValues]   = useState({});
  const [saved, setSaved]     = useState(false);

  const { data: empData } = useQuery({
    queryKey: ['hr-emp-itdecl', search],
    queryFn: () => hrEmployeesAPI.list({ search }).then(r => r.data),
    enabled: search.length > 1,
  });
  const employees = empData?.data || [];

  const { data: declData } = useQuery({
    queryKey: ['it-declaration', empId],
    queryFn: () => API.get(`/hr/it-declaration/${empId}`).then(r => r.data),
    enabled: !!empId,
    onSuccess: (d) => { if (d?.data) setValues(d.data); },
  });

  const saveMut = useMutation({
    mutationFn: () => API.post(`/hr/it-declaration/${empId}`, { declarations: values }),
    onSuccess: () => { toast.success('IT declaration saved'); setSaved(true); qc.invalidateQueries({ queryKey: ['it-declaration', empId] }); },
    onError: e => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  const setValue = (key, val) => { setValues(p => ({ ...p, [key]: val })); setSaved(false); };
  const sectionTotal = (items) => items.reduce((sum, item) => sum + (parseFloat(values[item]) || 0), 0);

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileBadge size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>IT Declaration</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Capture employee income tax investment declarations for TDS computation.</p>
      </div>

      {/* Employee Search */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <label style={lbl}>Search Employee</label>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setEmpId(null); setEmpName(''); setValues({}); setSaved(false); }}
            placeholder="Search by name or employee code"
            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          {search && employees.length > 0 && !empId && (
            <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50 }}>
              {employees.slice(0, 6).map(e => (
                <button key={e.id} onClick={() => { setEmpId(e.id); setEmpName(e.name); setSearch(`${e.employee_code} – ${e.name}`); }}
                  style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left', fontSize: 13 }}
                  onMouseEnter={ev => ev.currentTarget.style.background = '#F8FAFC'}
                  onMouseLeave={ev => ev.currentTarget.style.background = 'transparent'}>
                  {e.name} · {e.employee_code}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {!empId ? (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <FileBadge size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Search for an employee to enter IT declarations</p>
        </div>
      ) : (
        <>
          {SECTIONS.map(section => {
            const total = sectionTotal(section.items);
            const capped = section.max ? Math.min(total, section.max) : total;
            return (
              <div key={section.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ padding: '14px 20px', background: '#F8FAFC', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A' }}>{section.label}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: B.purple }}>Total: ₹{total.toLocaleString('en-IN')}</div>
                    {section.max && <div style={{ fontSize: 10, color: '#64748B' }}>Max: ₹{section.max.toLocaleString('en-IN')} → Allowed: ₹{capped.toLocaleString('en-IN')}</div>}
                  </div>
                </div>
                <div style={{ padding: '16px 20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {section.items.map(item => (
                    <div key={item}>
                      <label style={lbl}>{item}</label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#64748B' }}>₹</span>
                        <input type="number" min="0" value={values[item] || ''} onChange={e => setValue(item, e.target.value)} placeholder="0"
                          style={{ width: '100%', paddingLeft: 24, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', boxSizing: 'border-box' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
            {saved && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#15803D', fontWeight: 700 }}>
                <CheckCircle size={15} /> Saved successfully
              </div>
            )}
            <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 24px', background: B.purple, color: '#fff', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              <Save size={15} /> {saveMut.isPending ? 'Saving…' : 'Save Declaration'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
