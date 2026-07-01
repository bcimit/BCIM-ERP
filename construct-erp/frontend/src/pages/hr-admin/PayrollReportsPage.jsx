import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, FileText, CreditCard, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, IndianRupee } from 'lucide-react';
import { hrPayrollExtAPI } from '../../api/client';

const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function fmt(n) {
  const v = parseFloat(n || 0);
  return '₹' + v.toLocaleString('en-IN', { maximumFractionDigits: 0 });
}

function fyOptions() {
  const curr = new Date().getFullYear();
  return Array.from({ length: 5 }, (_, i) => curr - i);
}

// ─── Form 16 Section ────────────────────────────────────────────────
function Form16Row({ r, expanded, onToggle }) {
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden mb-2">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-slate-50 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
            {r.full_name?.[0] || '?'}
          </div>
          <div>
            <div className="font-medium text-slate-800">{r.full_name}</div>
            <div className="text-xs text-slate-500">{r.emp_code} · {r.designation || 'N/A'} · PAN: {r.pan_number || 'Not set'}</div>
          </div>
        </div>
        <div className="flex items-center gap-6 pr-2">
          <div className="text-right">
            <div className="text-xs text-slate-500">Gross Earnings</div>
            <div className="font-semibold text-slate-800">{fmt(r.total_gross)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">TDS Deducted</div>
            <div className="font-semibold text-red-600">{fmt(r.total_tds)}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500">Taxable Income</div>
            <div className="font-semibold text-amber-700">{fmt(r.taxable_income)}</div>
          </div>
          <div className="text-slate-400">{expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-4">
          <div className="grid grid-cols-3 gap-4">
            {/* Earnings */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Earnings ({r.months_processed} months)</div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['Basic', r.total_basic],
                    ['HRA', r.total_hra],
                    ['Conveyance', r.total_conveyance],
                    ['Medical', r.total_medical],
                    ['Special Allowance', r.total_special],
                    ['Other Earnings', r.total_other_earnings],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td className="py-0.5 text-slate-600">{label}</td>
                      <td className="py-0.5 text-right tabular-nums text-slate-800">{fmt(val)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-300 font-semibold">
                    <td className="pt-1 text-slate-700">Gross Earnings</td>
                    <td className="pt-1 text-right tabular-nums text-slate-900">{fmt(r.total_gross)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Deductions */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Deductions</div>
              <table className="w-full text-sm">
                <tbody>
                  {[
                    ['PF (Employee)', r.total_pf_employee],
                    ['ESI (Employee)', r.total_esi_employee],
                    ['Professional Tax', r.total_pt],
                    ['TDS', r.total_tds],
                    ['Loan Deduction', r.total_loan_deduction],
                  ].map(([label, val]) => (
                    <tr key={label}>
                      <td className="py-0.5 text-slate-600">{label}</td>
                      <td className="py-0.5 text-right tabular-nums text-slate-800">{fmt(val)}</td>
                    </tr>
                  ))}
                  <tr className="border-t border-slate-300 font-semibold">
                    <td className="pt-1 text-slate-700">Total Deductions</td>
                    <td className="pt-1 text-right tabular-nums text-slate-900">{fmt(r.total_deductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Tax Summary */}
            <div>
              <div className="text-xs font-semibold text-slate-500 uppercase mb-2">Tax Summary</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Gross Earnings</span><span className="tabular-nums">{fmt(r.total_gross)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">PF Deduction</span><span className="tabular-nums text-red-500">- {fmt(r.total_pf_employee)}</span></div>
                <div className="flex justify-between"><span className="text-slate-600">Standard Deduction</span><span className="tabular-nums text-red-500">- {fmt(r.standard_deduction)}</span></div>
                <div className="flex justify-between font-semibold border-t border-slate-200 pt-1"><span className="text-slate-700">Taxable Income</span><span className="tabular-nums text-amber-700">{fmt(r.taxable_income)}</span></div>
                <div className="flex justify-between font-semibold mt-2 bg-red-50 rounded px-2 py-1"><span className="text-red-700">TDS Deducted</span><span className="tabular-nums text-red-700">{fmt(r.total_tds)}</span></div>
                <div className="flex justify-between font-semibold bg-emerald-50 rounded px-2 py-1"><span className="text-emerald-700">Net Pay</span><span className="tabular-nums text-emerald-700">{fmt(r.total_net_pay)}</span></div>
              </div>
              <div className="mt-3 text-xs text-slate-500">
                Working days: {r.total_working_days} · Paid: {r.total_paid_days} · LOP: {r.total_lop_days}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bank Transfer Section ───────────────────────────────────────────
function BankTransferSection() {
  const currDate = new Date();
  const [month, setMonth] = useState(currDate.getMonth() + 1);
  const [year,  setYear]  = useState(currDate.getFullYear());
  const [downloading, setDownloading] = useState(null);

  const handleDownload = async (format) => {
    setDownloading(format);
    try {
      const response = await hrPayrollExtAPI.bankTransfer({ month, year, format });
      const blob  = response.data instanceof Blob ? response.data : new Blob([response.data]);
      const ext   = format === 'text' ? 'txt' : 'csv';
      const mname = MONTHS[month - 1];
      const url   = URL.createObjectURL(blob);
      const a     = document.createElement('a');
      a.href      = url;
      a.download  = `salary_transfer_${mname}_${year}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err?.response?.data ? 'Error: ' + (err.response.data?.error || 'Download failed') : 'Download failed');
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard size={18} className="text-teal-600"/>
        <h3 className="font-semibold text-slate-800">Bank Transfer File</h3>
        <span className="ml-auto text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">NEFT / RTGS</span>
      </div>

      <p className="text-sm text-slate-500 mb-4">
        Generate a salary disbursement file for bulk NEFT/RTGS upload to your bank portal.
        Includes employees with bank account and IFSC details filled in their profile.
      </p>

      <div className="flex items-end gap-3 mb-5">
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Month</label>
          <select value={month} onChange={e => setMonth(+e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-600 mb-1">Year</label>
          <select value={year} onChange={e => setYear(+e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500">
            {fyOptions().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => handleDownload('csv')}
          disabled={!!downloading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download size={15}/>
          {downloading === 'csv' ? 'Downloading…' : 'Download CSV'}
        </button>
        <button
          onClick={() => handleDownload('text')}
          disabled={!!downloading}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-700 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Download size={15}/>
          {downloading === 'text' ? 'Downloading…' : 'Download TXT (NEFT)'}
        </button>
      </div>

      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 space-y-1">
        <div className="font-semibold">Before uploading:</div>
        <div>• Ensure employee bank details (Account No, IFSC) are set in Employee Profile → Banking tab</div>
        <div>• Only employees with status <strong>approved</strong> or <strong>paid</strong> in payroll appear in the file</div>
        <div>• CSV format works with HDFC, ICICI, Axis, SBI bulk payment portals</div>
        <div>• TXT (tab-delimited) format for portals that don't accept CSV</div>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────
export default function PayrollReportsPage() {
  const currYear = new Date().getFullYear();
  const [fyYear, setFyYear] = useState(currYear);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState('form16');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['form16', fyYear],
    queryFn: () => hrPayrollExtAPI.form16({ year: fyYear }),
    select: r => r.data,
    enabled: activeTab === 'form16',
  });

  const rows = data?.data || [];

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Payroll Reports</h1>
          <p className="text-sm text-slate-500 mt-0.5">Form 16 (TDS Summary) & Bank Transfer File</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-lg w-fit">
        {[
          { id: 'form16', label: 'Form 16 / TDS', icon: FileText },
          { id: 'bank',   label: 'Bank Transfer', icon: CreditCard },
        ].map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}>
            <Icon size={15}/>{label}
          </button>
        ))}
      </div>

      {/* Form 16 Tab */}
      {activeTab === 'form16' && (
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Financial Year</label>
              <select value={fyYear} onChange={e => setFyYear(+e.target.value)}
                className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                {fyOptions().map(y => <option key={y} value={y}>FY {y - 1}–{String(y).slice(-2)}</option>)}
              </select>
            </div>
            {rows.length > 0 && (
              <div className="mt-5 text-sm text-slate-500">
                <CheckCircle2 size={14} className="inline text-emerald-500 mr-1"/>
                {rows.length} employee{rows.length !== 1 ? 's' : ''} · FY {fyYear - 1}–{String(fyYear).slice(-2)}
              </div>
            )}
          </div>

          {isLoading && (
            <div className="text-center py-16 text-slate-400">Loading Form 16 data…</div>
          )}
          {isError && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4 text-sm">
              <AlertCircle size={16}/>{error?.response?.data?.error || error?.message || 'Failed to load data'}
            </div>
          )}
          {!isLoading && !isError && rows.length === 0 && (
            <div className="text-center py-16">
              <IndianRupee size={40} className="text-slate-200 mx-auto mb-3"/>
              <div className="text-slate-500">No approved payroll records found for FY {fyYear - 1}–{String(fyYear).slice(-2)}</div>
              <div className="text-sm text-slate-400 mt-1">Run and approve payroll for at least one employee first.</div>
            </div>
          )}
          {rows.map(r => (
            <Form16Row
              key={r.user_id}
              r={r}
              expanded={expandedId === r.user_id}
              onToggle={() => setExpandedId(expandedId === r.user_id ? null : r.user_id)}
            />
          ))}

          {rows.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 grid grid-cols-4 gap-4 text-center">
              {[
                ['Total Employees', rows.length, 'text-slate-800'],
                ['Total Gross', fmt(rows.reduce((s, r) => s + +r.total_gross, 0)), 'text-slate-800'],
                ['Total TDS', fmt(rows.reduce((s, r) => s + +r.total_tds, 0)), 'text-red-600'],
                ['Total Net Pay', fmt(rows.reduce((s, r) => s + +r.total_net_pay, 0)), 'text-emerald-700'],
              ].map(([label, val, cls]) => (
                <div key={label}>
                  <div className="text-xs text-slate-500 mb-0.5">{label}</div>
                  <div className={`font-bold text-lg ${cls}`}>{val}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bank Transfer Tab */}
      {activeTab === 'bank' && <BankTransferSection />}
    </div>
  );
}
