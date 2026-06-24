// src/pages/hr-admin/ReleaseSalaryPage.jsx
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlayCircle, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const B = { purple: '#7C3AED', green: '#15803D' };
const API = axios.create({ baseURL: '/api', withCredentials: true });

const fetchStopped = () => API.get('/hr/stop-salary').then(r => r.data);

export default function ReleaseSalaryPage() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({ queryKey: ['stop-salary-release'], queryFn: fetchStopped });
  const rows = data?.data || [];

  const releaseMut = useMutation({
    mutationFn: (id) => API.delete(`/hr/stop-salary/${id}`),
    onSuccess: () => { toast.success('Salary processing released — employee included in next payroll run'); qc.invalidateQueries({ queryKey: ['stop-salary-release'] }); qc.invalidateQueries({ queryKey: ['stop-salary'] }); },
    onError: () => toast.error('Failed to release'),
  });

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <PlayCircle size={18} color={B.green} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>Release Salary</h1>
          <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Re-include employees who were previously excluded from payroll processing.</p>
        </div>
      </div>

      {rows.length > 0 && (
        <div style={{ background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <AlertCircle size={16} color="#C2410C" style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ fontSize: 13, color: '#9A3412' }}>
            <strong>{rows.length} employee{rows.length > 1 ? 's' : ''}</strong> currently excluded from payroll. Click <strong>Release</strong> to re-include them in the next payroll run.
          </span>
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#F8FAFC' }}>
              {['Emp Code', 'Employee Name', 'Department', 'Reason for Stop', 'Stopped On', 'Action'].map(h => (
                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E2E8F0' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: 60, textAlign: 'center' }}>
                  <PlayCircle size={36} color="#BBF7D0" style={{ marginBottom: 10 }} />
                  <div style={{ fontSize: 14, color: '#94A3B8', fontWeight: 600 }}>All employees are currently active in payroll processing.</div>
                  <div style={{ fontSize: 12, color: '#CBD5E1', marginTop: 4 }}>No employees are on the stop-salary list.</div>
                </td>
              </tr>
            ) : rows.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #F1F5F9', background: '#FFFBEB' }}>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 700, color: '#374151' }}>{r.employee_code}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>{r.name}</td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: '#64748B' }}>{r.department || '—'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, background: '#FEE2E2', color: '#DC2626' }}>{r.reason}</span>
                </td>
                <td style={{ padding: '11px 14px', fontSize: 13, color: '#64748B' }}>{new Date(r.created_at).toLocaleDateString('en-IN')}</td>
                <td style={{ padding: '11px 14px' }}>
                  <button
                    onClick={() => { if (window.confirm(`Release salary for ${r.name}?`)) releaseMut.mutate(r.id); }}
                    disabled={releaseMut.isPending}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 14px', background: '#F0FDF4', color: B.green, border: '1px solid #BBF7D0', borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <PlayCircle size={13} /> Release
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
