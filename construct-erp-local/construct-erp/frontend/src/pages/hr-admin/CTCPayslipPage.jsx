// src/pages/hr-admin/CTCPayslipPage.jsx
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { FileText, Printer, Download } from 'lucide-react';
import axios from 'axios';

const B = { purple: '#7C3AED' };
const API = axios.create({ baseURL: '/api', withCredentials: true });
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const cur = new Date();

const fetchEmps   = () => API.get('/hr/employees/active').then(r => r.data);
const fetchCTCPayslip = (empId, month, year) =>
  API.get(`/hr/ctc-payslip/${empId}`, { params: { month, year } }).then(r => r.data);

const Row = ({ label, emp, er, total, bold, shade }) => (
  <tr style={{ background: shade ? '#F8FAFC' : '#fff', borderBottom: '1px solid #F1F5F9' }}>
    <td style={{ padding: '9px 16px', fontSize: 13, color: bold ? '#0F172A' : '#374151', fontWeight: bold ? 800 : 500, width: '40%' }}>{label}</td>
    <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: bold ? 800 : 600, color: '#7C3AED', textAlign: 'right' }}>
      {emp != null ? `₹${Number(emp).toLocaleString('en-IN')}` : '—'}
    </td>
    <td style={{ padding: '9px 16px', fontSize: 13, fontWeight: bold ? 800 : 500, color: '#2563EB', textAlign: 'right' }}>
      {er != null ? `₹${Number(er).toLocaleString('en-IN')}` : '—'}
    </td>
    <td style={{ padding: '9px 16px', fontSize: bold ? 15 : 13, fontWeight: 800, color: '#0F172A', textAlign: 'right' }}>
      {total != null ? `₹${Number(total).toLocaleString('en-IN')}` : '—'}
    </td>
  </tr>
);

export default function CTCPayslipPage() {
  const [empId, setEmpId] = useState('');
  const [month, setMonth] = useState(cur.getMonth() + 1);
  const [year, setYear]   = useState(cur.getFullYear());

  const { data: empsData } = useQuery({ queryKey: ['active-employees'], queryFn: fetchEmps });
  const employees = empsData?.data || [];

  const { data, isLoading } = useQuery({
    queryKey: ['ctc-payslip', empId, month, year],
    queryFn: () => fetchCTCPayslip(empId, month, year),
    enabled: !!empId,
  });

  const d = data?.data;

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900, margin: '0 auto' }}>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#7C3AED15', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} color={B.purple} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#0F172A', margin: 0 }}>CTC Payslip</h1>
            <p style={{ fontSize: 13, color: '#64748B', margin: 0 }}>Full cost-to-company breakdown including employer contributions.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <select value={empId} onChange={e => setEmpId(e.target.value)}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none', minWidth: 220 }}>
            <option value="">Select Employee…</option>
            {employees.map(e => <option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
          </select>
          <select value={month} onChange={e => setMonth(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none' }}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(Number(e.target.value))}
            style={{ padding: '8px 12px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 14, background: '#F8FAFC', color: '#374151', outline: 'none' }}>
            {[cur.getFullYear() - 1, cur.getFullYear()].map(y => <option key={y}>{y}</option>)}
          </select>
          {d && (
            <>
              <button onClick={() => window.print()}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1px solid #E2E8F0', borderRadius: 8, fontSize: 13, background: '#F8FAFC', color: '#374151', cursor: 'pointer' }}>
                <Printer size={13} />
              </button>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: B.purple, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                <Download size={13} /> PDF
              </button>
            </>
          )}
        </div>
      </div>

      {!empId ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14 }}>
          Select an employee and month to generate the CTC payslip.
        </div>
      ) : isLoading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94A3B8' }}>Loading…</div>
      ) : !d ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94A3B8', background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14 }}>
          No payroll data for {MONTHS[month - 1]} {year}.
        </div>
      ) : (
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ background: B.purple, padding: '20px 24px', color: '#fff' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 2 }}>{d.name}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{d.designation} · {d.department}</div>
                <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Emp Code: {d.employee_code}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, opacity: 0.85 }}>CTC Payslip</div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{MONTHS[month - 1]} {year}</div>
                <div style={{ fontSize: 12, opacity: 0.7 }}>Working Days: {d.working_days} · Paid: {d.paid_days}</div>
              </div>
            </div>
          </div>

          {/* CTC Table */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#374151', width: '40%' }}>Component</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>Employee</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#2563EB' }}>Employer</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ background: '#F5F3FF' }}>
                <td colSpan={4} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 800, color: B.purple, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Earnings</td>
              </tr>
              <Row label="Basic Salary"         emp={d.basic}              er={null}             total={d.basic} />
              <Row label="HRA"                   emp={d.hra}                er={null}             total={d.hra} />
              <Row label="Conveyance"            emp={d.conveyance}         er={null}             total={d.conveyance} />
              <Row label="Medical Allowance"     emp={d.medical}            er={null}             total={d.medical} />
              <Row label="Special Allowance"     emp={d.special_allowance}  er={null}             total={d.special_allowance} />
              <Row label="Other Allowances"      emp={d.other_earnings}     er={null}             total={d.other_earnings} />
              <Row label="Gross Earnings"        emp={d.gross_earnings}     er={null}             total={d.gross_earnings} bold shade />

              <tr style={{ background: '#EFF6FF' }}>
                <td colSpan={4} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 800, color: '#1D4ED8', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Employer Contributions (CTC Add-ons)</td>
              </tr>
              <Row label="PF (Employer)"         emp={null}                 er={d.pf_employer}    total={d.pf_employer} />
              <Row label="ESI (Employer)"        emp={null}                 er={d.esi_employer}   total={d.esi_employer} />
              <Row label="Gratuity"              emp={null}                 er={d.gratuity}       total={d.gratuity} />
              <Row label="Total CTC"             emp={d.gross_earnings}     er={d.total_employer_cost} total={d.ctc} bold shade />

              <tr style={{ background: '#F0FDF4' }}>
                <td colSpan={4} style={{ padding: '8px 16px', fontSize: 11, fontWeight: 800, color: '#15803D', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Deductions</td>
              </tr>
              <Row label="PF (Employee)"         emp={d.pf_employee}        er={null}             total={d.pf_employee} />
              <Row label="ESI (Employee)"        emp={d.esi_employee}       er={null}             total={d.esi_employee} />
              <Row label="Professional Tax"      emp={d.pt}                 er={null}             total={d.pt} />
              <Row label="TDS"                   emp={d.tds}                er={null}             total={d.tds} />
              <Row label="Total Deductions"      emp={d.total_deductions}   er={null}             total={d.total_deductions} bold shade />
            </tbody>
            <tfoot>
              <tr style={{ background: '#7C3AED', color: '#fff' }}>
                <td style={{ padding: '14px 16px', fontSize: 15, fontWeight: 800, color: '#fff' }}>Net Pay</td>
                <td colSpan={2} />
                <td style={{ padding: '14px 16px', fontSize: 18, fontWeight: 900, color: '#fff', textAlign: 'right' }}>₹{Number(d.net_pay || 0).toLocaleString('en-IN')}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
