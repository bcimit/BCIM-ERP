// src/pages/hr-admin/FinalSettlementPage.jsx
import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FileCheck, Search, Save, Calculator, RefreshCw } from 'lucide-react';
import { hrEmployeesAPI } from '../../api/client';
import axios from 'axios';
import toast from 'react-hot-toast';

const API = axios.create({ baseURL: '/api', withCredentials: true });
const B = { purple: '#7C3AED' };
const inr = v => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const lbl = { fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 };

const EMPTY_FORM = {
  days_worked: 0, pro_rata_salary: 0,
  earned_leave_days: 0, leave_encashment: 0,
  gratuity_years: 0, gratuity_amount: 0,
  notice_period_days: 0, notice_deduction: 0,
  arrears: 0, other_deductions: 0,
  gross_payable: 0, total_deductions: 0, net_payable: 0,
  remarks: '', status: 'Draft',
};

export default function FinalSettlementPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [empId, setEmpId]   = useState(null);
  const [empName, setEmpName] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: empData } = useQuery({
    queryKey: ['hr-employees-fnf', search],
    queryFn: () => hrEmployeesAPI.list({ search }).then(r => r.data),
    enabled: search.length > 1,
  });
  const employees = empData?.data || [];

  const { data: settlementRes, isLoading, refetch } = useQuery({
    queryKey: ['final-settlement', empId],
    queryFn: () => API.get(`/hr/final-settlement/${empId}`).then(r => r.data),
    enabled: !!empId,
  });

  useEffect(() => {
    if (settlementRes?.data) {
      const d = settlementRes.data;
      setForm({
        days_worked: d.days_worked || 0,
        pro_rata_salary: d.pro_rata_salary || 0,
        earned_leave_days: d.earned_leave_days || 0,
        leave_encashment: d.leave_encashment || 0,
        gratuity_years: d.gratuity_years || 0,
        gratuity_amount: d.gratuity_amount || 0,
        notice_period_days: d.notice_period_days || 0,
        notice_deduction: d.notice_deduction || 0,
        arrears: d.arrears || 0,
        other_deductions: d.other_deductions || 0,
        gross_payable: d.gross_payable || 0,
        total_deductions: d.total_deductions || 0,
        net_payable: d.net_payable || 0,
        remarks: d.remarks || '',
        status: d.status || 'Draft',
      });
    }
  }, [settlementRes]);

  const saveMut = useMutation({
    mutationFn: () => API.post(`/hr/final-settlement/${empId}`, form).then(r => r.data),
    onSuccess: () => { toast.success('Final settlement saved'); qc.invalidateQueries({ queryKey: ['final-settlement', empId] }); },
    onError: e => toast.error(e?.response?.data?.error || 'Save failed'),
  });

  const set = (k, v) => {
    setForm(f => {
      const next = { ...f, [k]: v };
      next.gross_payable = Number(next.pro_rata_salary) + Number(next.leave_encashment) + Number(next.gratuity_amount) + Number(next.arrears);
      next.total_deductions = Number(next.notice_deduction) + Number(next.other_deductions);
      next.net_payable = next.gross_payable - next.total_deductions;
      return next;
    });
  };

  const d = settlementRes?.data;

  const Row = ({ label, value, field, editable = false, accent }) => (
    <tr style={{ borderBottom: '1px solid #F1F5F9' }}>
      <td style={{ padding: '12px 16px', fontSize: 13, color: '#374151', fontWeight: 500 }}>{label}</td>
      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
        {editable ? (
          <input type="number" value={form[field]} onChange={e => set(field, e.target.value)} min="0" step="0.01"
            style={{ width: 140, padding: '6px 10px', border: `1px solid ${B.purple}30`, borderRadius: 7, fontSize: 13, fontWeight: 600, textAlign: 'right', outline: 'none', background: '#F5F3FF' }} />
        ) : (
          <span style={{ fontSize: 14, fontWeight: 700, color: accent || '#0F172A', fontFamily: 'monospace' }}>{inr(value)}</span>
        )}
      </td>
    </tr>
  );

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileCheck size={18} color={B.purple} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Final Settlement</h1>
        </div>
        <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Calculate and process full & final settlement for separating employees.</p>
      </div>

      {/* Search */}
      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <label style={lbl}>Search Employee</label>
        <div style={{ position: 'relative', maxWidth: 420 }}>
          <Search size={15} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
          <input value={search} onChange={e => { setSearch(e.target.value); setEmpId(null); setEmpName(''); setForm(EMPTY_FORM); }}
            placeholder="Search by Emp No / Name"
            style={{ width: '100%', paddingLeft: 34, paddingRight: 12, paddingTop: 9, paddingBottom: 9, border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          {search && employees.length > 0 && !empId && (
            <div style={{ position: 'absolute', top: '110%', left: 0, right: 0, background: '#fff', border: '1px solid #E2E8F0', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 50 }}>
              {employees.slice(0, 6).map(e => (
                <button key={e.id} onClick={() => { setEmpId(e.id); setEmpName(e.name); setSearch(`${e.employee_code || e.id} – ${e.name}`); }}
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

      {!empId && (
        <div style={{ background: '#F8FAFC', border: '1px dashed #CBD5E1', borderRadius: 14, padding: 60, textAlign: 'center' }}>
          <Calculator size={40} color="#CBD5E1" style={{ marginBottom: 12 }} />
          <p style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>Search for an employee to calculate their final settlement</p>
        </div>
      )}

      {empId && isLoading && <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Calculating settlement…</div>}

      {empId && !isLoading && d && (
        <>
          {/* Employee & Separation Info */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20, marginBottom: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
              {[
                { label: 'Employee', value: d.name || empName },
                { label: 'Designation', value: d.designation || '—' },
                { label: 'Date of Joining', value: d.date_of_joining ? new Date(d.date_of_joining).toLocaleDateString('en-IN') : '—' },
                { label: 'Last Working Day', value: d.last_working_day ? new Date(d.last_working_day).toLocaleDateString('en-IN') : '—' },
                { label: 'Years Served', value: d.years_served ? `${d.years_served.toFixed(1)} yrs` : '—' },
                { label: 'Monthly Salary', value: inr(d.monthly_salary) },
                { label: 'Separation Reason', value: d.reason || 'Resignation' },
                { label: 'Status', value: form.status },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>{label}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Settlement Calculation Table */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden', marginBottom: 20 }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', margin: 0 }}>Settlement Breakdown — {empName}</h3>
              {settlementRes?.calculated && (
                <span style={{ fontSize: 11, background: '#EFF6FF', color: '#2563EB', borderRadius: 6, padding: '3px 10px', fontWeight: 700 }}>Auto-calculated — Review & adjust</span>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#F8FAFC' }}>
                  <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' }}>Component</th>
                  <th style={{ padding: '10px 16px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' }}>Amount (₹)</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
                  <td colSpan={2} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Earnings</td>
                </tr>
                <Row label={`Pro-rata Salary (${form.days_worked} days)`} field="pro_rata_salary" editable value={form.pro_rata_salary} />
                <Row label={`Earned Leave Encashment (${form.earned_leave_days} days)`} field="leave_encashment" editable value={form.leave_encashment} />
                <Row label={`Gratuity (${form.gratuity_years} years)`} field="gratuity_amount" editable value={form.gratuity_amount} />
                <Row label="Arrears / Other Payable" field="arrears" editable value={form.arrears} />
                <tr style={{ background: '#F0FDF4', borderBottom: '1px solid #BBF7D0' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#15803D' }}>Gross Payable</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#15803D', fontFamily: 'monospace' }}>{inr(form.gross_payable)}</td>
                </tr>
                <tr style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
                  <td colSpan={2} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 700, color: '#C2410C', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deductions</td>
                </tr>
                <Row label={`Notice Period Recovery (${form.notice_period_days} days)`} field="notice_deduction" editable value={form.notice_deduction} />
                <Row label="Other Deductions" field="other_deductions" editable value={form.other_deductions} />
                <tr style={{ background: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
                  <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 700, color: '#C2410C' }}>Total Deductions</td>
                  <td style={{ padding: '10px 16px', textAlign: 'right', fontSize: 15, fontWeight: 800, color: '#C2410C', fontFamily: 'monospace' }}>{inr(form.total_deductions)}</td>
                </tr>
                <tr style={{ background: '#F5F3FF' }}>
                  <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 800, color: B.purple }}>Net Payable</td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontSize: 18, fontWeight: 900, color: B.purple, fontFamily: 'monospace' }}>{inr(form.net_payable)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Remarks + Actions */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, padding: 20 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'flex-end' }}>
              <div>
                <label style={lbl}>Remarks</label>
                <textarea value={form.remarks} onChange={e => setForm(f => ({ ...f, remarks: e.target.value }))} rows={2}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ padding: '9px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', outline: 'none' }}>
                  {['Draft', 'Pending Approval', 'Approved', 'Processed'].map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={() => saveMut.mutate()} disabled={saveMut.isPending}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: 'pointer', opacity: saveMut.isPending ? 0.6 : 1 }}>
                  <Save size={14} /> {saveMut.isPending ? 'Saving…' : 'Save Settlement'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
