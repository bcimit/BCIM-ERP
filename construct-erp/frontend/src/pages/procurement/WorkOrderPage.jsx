// src/pages/procurement/WorkOrderPage.jsx
import RecordAttachments from '../../components/shared/RecordAttachments';
import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import useAuthStore from '../../store/authStore';
import {
  Hammer, Plus, X, Search, FileText, Download,
  Printer, Building2, Clock, CheckCircle2,
  ChevronRight, Upload, IndianRupee, Calendar,
  AlertCircle, RefreshCw, FileSpreadsheet,
} from 'lucide-react';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import { subcontractorAPI, vendorAPI, projectAPI } from '../../api/client';
import toast from 'react-hot-toast';
import WOPrintTemplate from './WOPrintTemplate';

const UNITS = ['SQFT', 'SQM', 'RMT', 'Nos', 'MT', 'Point', 'Month', 'LS', 'Day'];
const inr = v => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS_CONFIG = {
  draft:      { label: 'Draft',      cls: 'bg-slate-100  text-slate-700  border-slate-200' },
  pending:    { label: 'Pending',    cls: 'bg-amber-50   text-amber-700  border-amber-200' },
  submitted:  { label: 'Submitted',  cls: 'bg-blue-50    text-blue-700   border-blue-200' },
  approved:   { label: 'Approved',   cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  active:     { label: 'Active',     cls: 'bg-teal-50    text-teal-700   border-teal-200' },
  completed:  { label: 'Completed',  cls: 'bg-indigo-50  text-indigo-700 border-indigo-200' },
  terminated: { label: 'Terminated', cls: 'bg-red-50     text-red-600    border-red-200' },
  closed:     { label: 'Closed',     cls: 'bg-gray-100   text-gray-500   border-gray-200' },
  rejected:   { label: 'Rejected',   cls: 'bg-red-50     text-red-600    border-red-200' },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={clsx('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

const inp = 'w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400';

const WORK_CATEGORIES = ['Civil', 'Structural', 'Waterproofing', 'Electrical', 'Plumbing', 'Painting', 'Carpentry', 'Tiles', 'Aluminium', 'Demolition', 'Earth Work', 'Fabrication', 'Interior', 'Landscaping', 'General'];

const DEFAULT_WO_TERMS = `1. This Work Order is issued subject to the terms of the registered agreement / quotation, if any.
2. All work shall be carried out as per approved drawings, specifications and instructions of the Site Engineer / Project Manager.
3. Measurement of completed work shall be jointly recorded in the Measurement Book (MB) and certified before billing.
4. Payment shall be released against certified RA bills, subject to Retention and TDS deductions as specified above.
5. Retention shall be released only after successful completion of work and the Defect Liability Period (DLP).
6. TDS and GST shall be deducted / charged as applicable under prevailing Income Tax and GST laws.
7. The Contractor shall ensure adequate manpower, tools, tackles and safety equipment (PPE) at site at all times.
8. The Contractor shall comply with all statutory, safety, health and environmental regulations during execution of work.
9. Any variation in scope, quantity or specification must have prior written approval before execution.
10. Time is of the essence. Delay in completion beyond the agreed schedule may attract penalty / liquidated damages as mutually agreed.
11. Any damage to existing works or materials caused due to the Contractor's negligence shall be rectified at the Contractor's own cost.
12. The Contractor shall maintain valid insurance, licenses and statutory registrations (PF / ESI / labour license) wherever applicable.
13. This Work Order may be terminated by BCIM without liability for unsatisfactory performance, safety violations or non-compliance.
14. Any dispute or difference shall be subject to the jurisdiction of courts at Bangalore.
15. Acceptance of this Work Order (by signature, seal or commencement of work) shall be deemed as acceptance of all terms stated herein.`;

/* ── Excel Import Modal ─────────────────────────────────────────────────── */
function ExcelImportModal({ onClose, onImported }) {
  const [step, setStep]       = useState(1); // 1=upload 2=review 3=done
  const [file, setFile]       = useState(null);
  const [preview, setPreview] = useState([]);
  const [errors, setErrors]   = useState([]);
  const [vendors, setVendors] = useState([]);
  const [projects, setProjects] = useState([]);
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState(null);
  const fileRef = useRef();

  const handleDownloadTemplate = async () => {
    try {
      const res = await subcontractorAPI.downloadWOTemplate();
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a'); a.href = url; a.download = 'WO_Import_Template.xlsx'; a.click();
      URL.revokeObjectURL(url);
      toast.success('Template downloaded');
    } catch { toast.error('Failed to download template'); }
  };

  const handleUpload = async () => {
    if (!file) return toast.error('Select an Excel file first');
    setLoading(true);
    try {
      const res = await subcontractorAPI.excelImportPreview(file);
      const d = res.data;
      setPreview(d.preview || []);
      setErrors(d.errors || []);
      setVendors(d.vendors || []);
      setProjects(d.projects || []);
      setRows((d.preview || []).map(r => ({ ...r })));
      setStep(2);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to parse Excel');
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    const invalid = rows.filter(r => !r.vendor_id || !r.project_id);
    if (invalid.length) return toast.error(`${invalid.length} rows have unmatched vendor or project — fix them first`);
    setLoading(true);
    try {
      const records = rows.map(r => ({
        wo_number: r.wo_number,
        vendor_id: r.vendor_id,
        subject:   r.subject,
        start_date: r.start_date,
        end_date:   r.end_date,
        total_value: r.total_value,
        status:     r.status,
        scope_of_work: r.scope_of_work,
      }));
      // Use first row's project_id (all rows share a project in bulk import)
      // Actually send all with individual project_ids using bulk-import per project
      const byProject = {};
      rows.forEach(r => {
        if (!byProject[r.project_id]) byProject[r.project_id] = [];
        byProject[r.project_id].push({ ...r });
      });
      let totalCreated = 0, totalSkipped = 0;
      for (const [project_id, recs] of Object.entries(byProject)) {
        const res = await subcontractorAPI.bulkImportWOs({ project_id, records: recs });
        totalCreated += res.data.created || 0;
        totalSkipped += res.data.skipped || 0;
      }
      setResult({ created: totalCreated, skipped: totalSkipped });
      setStep(3);
      onImported();
    } catch (e) {
      toast.error(e.response?.data?.error || 'Import failed');
    } finally { setLoading(false); }
  };

  const updateRow = (i, field, val) => setRows(p => p.map((r, idx) => idx === i ? { ...r, [field]: val } : r));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col overflow-hidden max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Import Work Orders from Excel</p>
              <p className="text-xs text-slate-400">
                {step === 1 ? 'Download template, fill it, then upload' : step === 2 ? 'Review and correct matched data before importing' : 'Import complete'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-900 font-medium hover:text-slate-900 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Steps */}
        <div className="flex border-b border-slate-100 flex-shrink-0">
          {['Upload Excel', 'Review & Match', 'Done'].map((label, i) => (
            <div key={i} className={clsx('flex-1 py-3 text-center text-xs font-medium border-b-2 transition-colors',
              step === i+1 ? 'border-indigo-500 text-indigo-600' : step > i+1 ? 'border-emerald-400 text-emerald-600' : 'border-transparent text-slate-400')}>
              {label}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">

          {step === 1 && (
            <div className="space-y-5">
              <div className="flex gap-3 bg-blue-50 border border-blue-100 rounded-xl p-4">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-800">Before you start</p>
                  <p className="text-xs text-blue-700 mt-1">Download the Excel template, fill in your work orders (one per row), then upload the filled file. Vendor and Project names must match what's in the system.</p>
                </div>
              </div>

              <button onClick={handleDownloadTemplate}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-100 transition-all">
                <Download className="w-4 h-4" /> Download Excel Template
              </button>

              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">
                  {file ? <span className="text-indigo-700">{file.name}</span> : 'Click to select filled Excel file'}
                </p>
                <p className="text-xs text-slate-900 font-medium mt-1">.xlsx or .xls · max 10 MB</p>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
                  onChange={e => setFile(e.target.files[0])} />
              </div>

              <div className="flex justify-end">
                <button onClick={handleUpload} disabled={!file || loading}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Parsing…</> : 'Preview Data →'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 text-xs">
                <span className="px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-full font-semibold">{rows.length} valid rows</span>
                {errors.length > 0 && <span className="px-2.5 py-1 bg-red-50 border border-red-200 text-red-600 rounded-full font-semibold">{errors.length} errors (skipped)</span>}
                <span className="text-slate-400">Fix vendor/project mismatches using the dropdowns below</span>
              </div>

              {errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 space-y-1">
                  {errors.map((e, i) => <p key={i} className="text-xs text-red-600">Row {e.row}: {e.reason}</p>)}
                </div>
              )}

              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50">
                    <tr>
                      {['Row', 'WO Number', 'Vendor', 'Project', 'Subject', 'Start Date', 'Value (₹)', 'Status'].map(h => (
                        <th key={h} className="px-3 py-2.5 text-left font-medium text-slate-900 font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rows.map((r, i) => (
                      <tr key={i} className={r.vendor_id && r.project_id ? '' : 'bg-amber-50'}>
                        <td className="px-3 py-2 text-slate-400">{r.row}</td>
                        <td className="px-3 py-2 font-mono font-medium text-indigo-700 whitespace-nowrap">{r.wo_number}</td>
                        <td className="px-3 py-2 min-w-[160px]">
                          <select value={r.vendor_id || ''} onChange={e => updateRow(i, 'vendor_id', e.target.value)}
                            className={clsx('w-full border rounded px-2 py-1 text-xs outline-none', r.vendor_id ? 'border-slate-200' : 'border-amber-400 bg-amber-50')}>
                            <option value="">— select vendor —</option>
                            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 min-w-[160px]">
                          <select value={r.project_id || ''} onChange={e => updateRow(i, 'project_id', e.target.value)}
                            className={clsx('w-full border rounded px-2 py-1 text-xs outline-none', r.project_id ? 'border-slate-200' : 'border-amber-400 bg-amber-50')}>
                            <option value="">— select project —</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                          </select>
                        </td>
                        <td className="px-3 py-2 max-w-[150px] truncate text-slate-600">{r.subject || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap text-slate-500">{r.start_date || '—'}</td>
                        <td className="px-3 py-2 whitespace-nowrap font-mono text-slate-800">₹{inr(r.total_value)}</td>
                        <td className="px-3 py-2">
                          <select value={r.status} onChange={e => updateRow(i, 'status', e.target.value)}
                            className="border border-slate-200 rounded px-2 py-1 text-xs outline-none">
                            {['draft','pending','approved'].map(s => <option key={s}>{s}</option>)}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-2 border border-slate-200 text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-50">← Back</button>
                <button onClick={handleConfirm} disabled={loading || rows.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Importing…</> : `Import ${rows.length} Work Orders`}
                </button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 font-medium mb-1">Import Complete</h3>
              <p className="text-sm text-slate-500">
                <strong className="text-emerald-700">{result.created}</strong> work orders created
                {result.skipped > 0 && <>, <strong className="text-amber-600">{result.skipped}</strong> duplicates skipped</>}
              </p>
              <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800">Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── PDF Import Modal ───────────────────────────────────────────────────── */
function PdfImportModal({ onClose, vendors, projects, onImported }) {
  const [step, setStep]           = useState(1);
  const [file, setFile]           = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [header, setHeader]       = useState({});
  const [items, setItems]         = useState([]);
  const [projectId, setProjectId] = useState('');
  const [vendorId, setVendorId]   = useState('');
  const [loading, setLoading]     = useState(false);
  const [result, setResult]       = useState(null);
  const fileRef = useRef();

  const handleUpload = async () => {
    if (!file) return toast.error('Select a PDF file');
    setLoading(true);
    try {
      const res = await subcontractorAPI.importWOPreview(file);
      const data = res.data;
      setExtracted(data);
      setHeader(data.header || {});
      setItems((data.items || []).map(it => ({ ...it })));
      const vName = (data.header?.vendor_name || '').toLowerCase();
      const matched = (vendors || []).find(v => v.name?.toLowerCase().includes(vName) || vName.includes(v.name?.toLowerCase()));
      if (matched) setVendorId(matched.id);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to parse PDF');
    } finally { setLoading(false); }
  };

  const handleConfirm = async () => {
    if (!projectId) return toast.error('Select a project');
    if (!vendorId)  return toast.error('Select a vendor');
    setLoading(true);
    try {
      const res = await subcontractorAPI.importWOConfirm({ project_id: projectId, vendor_id: vendorId, header, items });
      setResult(res.data);
      setStep(3);
      onImported();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save Work Order');
    } finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col overflow-hidden max-h-[92vh]">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">Import Work Order from PDF</p>
              <p className="text-xs text-slate-400">{step === 1 ? 'Upload PDF' : step === 2 ? 'Review extracted data' : 'Complete'}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-900 font-medium hover:text-slate-900 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 flex-shrink-0">
          {['Upload PDF', 'Review', 'Done'].map((label, i) => (
            <div key={i} className={clsx('flex-1 py-3 text-center text-xs font-medium border-b-2 transition-colors',
              step === i+1 ? 'border-indigo-500 text-indigo-600' : step > i+1 ? 'border-emerald-400 text-emerald-600' : 'border-transparent text-slate-400')}>
              {label}
            </div>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-slate-200 rounded-xl p-10 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all">
                <Upload className="w-8 h-8 text-slate-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-600">{file ? <span className="text-indigo-700">{file.name}</span> : 'Click to select a Work Order PDF'}</p>
                <p className="text-xs text-slate-900 font-medium mt-1">PDF format only · max 10 MB</p>
                <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => setFile(e.target.files[0])} />
              </div>
              <p className="text-xs text-slate-900 font-medium bg-amber-50 border border-amber-200 rounded-lg p-3">
                The system uses AI to extract WO number, contractor, dates, scope, and line items. Review and edit before saving.
              </p>
              <div className="flex justify-end">
                <button onClick={handleUpload} disabled={!file || loading}
                  className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Parsing…</> : 'Extract Data →'}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Project *</label>
                  <select value={projectId} onChange={e => setProjectId(e.target.value)} className={inp}>
                    <option value="">Select project…</option>
                    {(projects || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Vendor / Contractor *</label>
                  <select value={vendorId} onChange={e => setVendorId(e.target.value)} className={inp}>
                    <option value="">Select vendor…</option>
                    {(vendors || []).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                  {extracted?.header?.vendor_name && <p className="text-[11px] text-slate-900 font-medium mt-1">Extracted: <em>{extracted.header.vendor_name}</em></p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-900 font-medium mb-1">WO Number</label>
                  <input value={header.wo_number || ''} onChange={e => setHeader(h => ({ ...h, wo_number: e.target.value }))} className={inp} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Start Date</label>
                  <input type="date" value={header.start_date || ''} onChange={e => setHeader(h => ({ ...h, start_date: e.target.value }))} className={inp} />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Subject / Scope</label>
                  <input value={header.subject || ''} onChange={e => setHeader(h => ({ ...h, subject: e.target.value }))} className={inp} />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-slate-600">Scope Items ({items.length})</p>
                  <button onClick={() => setItems(p => [...p, { description:'', unit:'LS', quantity:0, rate:0, remarks:'' }])}
                    className="text-xs text-indigo-600 hover:underline font-semibold">+ Add Row</button>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50">
                      <tr>
                        {['Description','Unit','Qty','Rate (₹)','Remarks',''].map(h => (
                          <th key={h} className="px-3 py-2 text-left font-medium text-slate-500">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-center text-slate-400">No items — add manually</td></tr>}
                      {items.map((it, i) => (
                        <tr key={i}>
                          <td className="px-2 py-1"><input value={it.description||''} onChange={e => setItems(p => p.map((x,j) => j===i?{...x,description:e.target.value}:x))} className="w-full border border-slate-200 rounded px-2 py-1 text-xs outline-none min-w-[160px]" /></td>
                          <td className="px-2 py-1">
                            <select value={it.unit||'LS'} onChange={e => setItems(p => p.map((x,j) => j===i?{...x,unit:e.target.value}:x))} className="border border-slate-200 rounded px-1 py-1 text-xs outline-none">
                              {UNITS.map(u => <option key={u}>{u}</option>)}
                            </select>
                          </td>
                          <td className="px-2 py-1"><input type="number" value={it.quantity||''} onChange={e => setItems(p => p.map((x,j) => j===i?{...x,quantity:e.target.value}:x))} className="w-16 border border-slate-200 rounded px-2 py-1 text-xs outline-none" /></td>
                          <td className="px-2 py-1"><input type="number" value={it.rate||''} onChange={e => setItems(p => p.map((x,j) => j===i?{...x,rate:e.target.value}:x))} className="w-20 border border-slate-200 rounded px-2 py-1 text-xs outline-none" /></td>
                          <td className="px-2 py-1"><input value={it.remarks||''} onChange={e => setItems(p => p.map((x,j) => j===i?{...x,remarks:e.target.value}:x))} className="w-28 border border-slate-200 rounded px-2 py-1 text-xs outline-none" /></td>
                          <td className="px-2 py-1"><button onClick={() => setItems(p => p.filter((_,j) => j!==i))} className="text-red-400 hover:text-red-600"><X className="w-3.5 h-3.5"/></button></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setStep(1)} className="px-4 py-2 border border-slate-200 text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-50">← Back</button>
                <button onClick={handleConfirm} disabled={loading}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg">
                  {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving…</> : 'Confirm & Import WO'}
                </button>
              </div>
            </div>
          )}

          {step === 3 && result && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 font-medium mb-1">Work Order Imported!</h3>
              <p className="text-sm text-slate-500">WO <strong>{result.wo_number}</strong> created with status Draft.</p>
              <button onClick={onClose} className="mt-6 px-6 py-2 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-800">Close</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Create WO Modal ─────────────────────────────────────────────────────── */
function CreateWOModal({ onClose, vendors, projects, onCreate }) {
  const [form, setForm] = useState({
    project_id: '', vendor_id: '',
    wo_number: '',
    start_date: dayjs().format('YYYY-MM-DD'),
    end_date: '',
    subject: '',
    scope_of_work: '',
    work_category: '',
    tower_block: '',
    cost_head: '',
    gst_pct: 18,
    tds_pct: 2,
    retention_pct: 5,
    advance_recovery_pct: 10,
    terms_conditions: DEFAULT_WO_TERMS,
  });
  const [items, setItems] = useState([{ description:'', quantity:'', unit:'SQFT', rate:'', remarks:'' }]);
  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const formTotal = items.reduce((s, it) => s + parseFloat(it.quantity||0) * parseFloat(it.rate||0), 0);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-2xl flex flex-col max-h-[92vh] shadow-2xl overflow-hidden border border-slate-200">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
              <Plus className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-900">New Work Order</p>
              <p className="text-xs text-slate-400">Issue a work order to a subcontractor or vendor</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-900 font-medium hover:text-slate-900 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <p className="text-xs font-medium text-slate-900 font-medium uppercase tracking-wider mb-4">Work Order Details</p>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Project *</label>
                <select className={inp} value={form.project_id} onChange={e => f('project_id', e.target.value)}>
                  <option value="">Select project…</option>
                  {(projects||[]).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Vendor / Subcontractor *</label>
                <select className={inp} value={form.vendor_id} onChange={e => f('vendor_id', e.target.value)}>
                  <option value="">Select vendor…</option>
                  {(vendors||[]).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">WO Number</label>
                <input className={`${inp} bg-slate-100 font-mono text-indigo-700`} value={form.wo_number || 'Auto: WODQS###'} readOnly />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Start Date</label>
                <input type="date" className={inp} value={form.start_date} onChange={e => f('start_date', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">End Date</label>
                <input type="date" className={inp} value={form.end_date} onChange={e => f('end_date', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Work Category</label>
                <select className={inp} value={form.work_category} onChange={e => f('work_category', e.target.value)}>
                  <option value="">Select…</option>
                  {WORK_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Tower / Block</label>
                <input className={inp} placeholder="e.g. Tower A / Block 1" value={form.tower_block} onChange={e => f('tower_block', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Cost Head</label>
                <input className={inp} placeholder="e.g. Civil Works" value={form.cost_head} onChange={e => f('cost_head', e.target.value)} />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Subject / Scope *</label>
                <input className={inp} placeholder="e.g. External plaster work – Block B" value={form.subject} onChange={e => f('subject', e.target.value)} />
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Scope of Work (detailed)</label>
                <textarea rows={3} className={inp} placeholder="Detailed scope description…" value={form.scope_of_work} onChange={e => f('scope_of_work', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-medium text-slate-900 font-medium uppercase tracking-wider">Scope Items</p>
              <button onClick={() => setItems(p => [...p, { description:'', quantity:'', unit:'SQFT', rate:'', remarks:'' }])}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition-all">
                <Plus className="w-3 h-3" /> Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['Description', 'Unit', 'Qty', 'Rate (₹)', 'Amount', ''].map(h => (
                      <th key={h} className="pb-2 text-left text-xs font-medium text-slate-900 font-medium pr-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="pr-3 py-1.5">
                        <input className={inp} placeholder="Description of work" value={it.description}
                          onChange={e => setItems(p => p.map((x,j) => j===i?{...x,description:e.target.value}:x))} />
                      </td>
                      <td className="pr-3 py-1.5 w-24">
                        <select className={inp} value={it.unit} onChange={e => setItems(p => p.map((x,j) => j===i?{...x,unit:e.target.value}:x))}>
                          {UNITS.map(u => <option key={u}>{u}</option>)}
                        </select>
                      </td>
                      <td className="pr-3 py-1.5 w-24">
                        <input type="number" min="0" className={inp} placeholder="0" value={it.quantity}
                          onChange={e => setItems(p => p.map((x,j) => j===i?{...x,quantity:e.target.value}:x))} />
                      </td>
                      <td className="pr-3 py-1.5 w-32">
                        <input type="number" min="0" className={inp} placeholder="0.00" value={it.rate}
                          onChange={e => setItems(p => p.map((x,j) => j===i?{...x,rate:e.target.value}:x))} />
                      </td>
                      <td className="pr-3 py-1.5 w-32">
                        <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-sm font-mono text-slate-600">
                          ₹{inr(parseFloat(it.quantity||0)*parseFloat(it.rate||0))}
                        </div>
                      </td>
                      <td className="py-1.5">
                        <button onClick={() => setItems(p => p.filter((_,j) => j!==i))} disabled={items.length===1}
                          className="w-9 h-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-900 font-medium hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-30">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-end gap-6">
              <span className="text-xs text-slate-400">Retention ({form.retention_pct || 0}%): <span className="font-mono text-slate-600">₹{inr(formTotal*(parseFloat(form.retention_pct||0)/100))}</span></span>
              <span className="text-xs text-slate-400">TDS Est. ({form.tds_pct || 0}%): <span className="font-mono text-slate-600">₹{inr(formTotal*(parseFloat(form.tds_pct||0)/100))}</span></span>
              <span className="text-sm font-medium text-slate-900">Total: <span className="font-mono text-indigo-700">₹{inr(formTotal)}</span></span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <p className="text-xs font-medium text-slate-900 font-medium uppercase tracking-wider mb-4">Financial Terms</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">GST %</label>
                <input type="number" min="0" max="100" className={inp} value={form.gst_pct} onChange={e => f('gst_pct', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">TDS %</label>
                <input type="number" min="0" max="100" className={inp} value={form.tds_pct} onChange={e => f('tds_pct', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Retention %</label>
                <input type="number" min="0" max="100" className={inp} value={form.retention_pct} onChange={e => f('retention_pct', e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-900 font-medium mb-1">Advance Recovery %</label>
                <input type="number" min="0" max="100" className={inp} value={form.advance_recovery_pct} onChange={e => f('advance_recovery_pct', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-5 border border-slate-200">
            <p className="text-xs font-medium text-slate-900 font-medium uppercase tracking-wider mb-3">Terms &amp; Conditions</p>
            <textarea
              rows={12}
              className={clsx(inp, 'h-auto py-3 font-mono text-xs leading-relaxed resize-y')}
              value={form.terms_conditions}
              onChange={e => f('terms_conditions', e.target.value)}
            />
            <p className="mt-2 text-[11px] text-slate-500">Edit this block for each work order before issuing.</p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex-shrink-0 flex gap-3">
          <button onClick={onClose} className="px-5 py-2.5 bg-white border border-slate-200 text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-50">Cancel</button>
          <button onClick={() => onCreate({ ...form, items })} disabled={!form.project_id || !form.vendor_id || !form.subject}
            className="flex-1 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-all">
            Issue Work Order
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── WO Detail Panel — Full-Screen Modal ────────────────────────────────── */
function WODetailPanel({ wo, onClose, onDelete, onApprove, onReject, isApproving, isRejecting }) {
  const { data: detail, isLoading: detailLoading } = useQuery({
    queryKey: ['work-order-detail', wo?.id],
    queryFn: () => subcontractorAPI.getWorkOrder(wo.id).then(r => r.data),
    enabled: !!wo?.id,
  });

  const printZoneRef = React.useRef(null);
  const displayWO = { ...wo, ...(detail || {}) };
  const lineItems = displayWO.items || [];
  const val     = Number(displayWO.total_value || displayWO.contract_amount || 0);
  const billed  = Number(displayWO.total_billed || 0);
  const paid    = Number(displayWO.total_paid || 0);
  const balance = Math.max(val - billed, 0);
  const cfg     = STATUS_CONFIG[displayWO.status] || STATUS_CONFIG.pending;
  const canApprove = ['draft','pending','submitted'].includes(displayWO.status);

  // ── Print in a new isolated window — same approach as Purchase Orders ─────
  const handlePrint = () => {
    if (!printZoneRef.current) return;
    const html = printZoneRef.current.innerHTML;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { window.print(); return; }           // fallback if popup blocked
    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>Work Order — ${displayWO.wo_number}</title>
  <style>
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; box-sizing: border-box; }
    body { margin: 0; padding: 0; background: white; font-family: Arial, sans-serif; }
    table { border-collapse: collapse; }
    thead { display: table-header-group; }
    tbody tr { page-break-inside: avoid; }
    .wo-items-table thead { display: table-header-group; }
    .wo-items-table tbody tr { page-break-inside: avoid; page-break-after: auto; }
    .wo-totals-block, .wo-approval-block, .wo-terms-block { page-break-inside: avoid; }
    @page { size: A4 portrait; margin: 8mm 8mm 12mm 8mm; }
    @media print { body { margin: 0; } }
  </style>
</head>
<body>${html}</body>
</html>`);
    win.document.close();
    win.onload = () => { win.focus(); win.print(); win.close(); };
    setTimeout(() => { try { win.focus(); win.print(); win.close(); } catch(_) {} }, 1200);
  };

  return (
    <>
    {/* Full-screen centred modal — covers entire viewport */}
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Hammer className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-base font-bold text-white">{displayWO.wo_number}</span>
                <span className={clsx('text-[11px] font-semibold px-2.5 py-0.5 rounded-full border', cfg.cls)}>
                  {cfg.label}
                </span>
                {displayWO.cost_head && (
                  <span className="text-[11px] bg-white/10 text-white/70 px-2 py-0.5 rounded-full">{displayWO.cost_head}</span>
                )}
              </div>
              <p className="text-sm text-white/75 mt-0.5 truncate max-w-[600px]">{wo.subject || '—'}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-5">

          {/* Financial summary strip */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl border-2 border-blue-800 p-4" style={{background:'linear-gradient(135deg,#1a3a6b 0%,#122d58 100%)'}}>
              <p className="text-xs font-bold text-blue-200 uppercase tracking-wider mb-2">Contract / Total Value</p>
              <p className="text-xl font-bold font-mono text-white leading-tight">₹ {inr(val)}</p>
            </div>
            <div className="rounded-xl border-2 border-indigo-400 bg-indigo-600 p-4">
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-wider mb-2">Billed So Far</p>
              <p className="text-xl font-bold font-mono text-white leading-tight">₹ {inr(billed)}</p>
              {val > 0 && <p className="text-sm font-semibold text-indigo-200 mt-1">{Math.round((billed/val)*100)}% of WO value</p>}
            </div>
            <div className={clsx('rounded-xl border-2 p-4', balance > 0 ? 'border-amber-400 bg-amber-500' : 'border-emerald-400 bg-emerald-600')}>
              <p className={clsx('text-xs font-bold uppercase tracking-wider mb-2', balance > 0 ? 'text-amber-100' : 'text-emerald-100')}>Balance to Bill</p>
              <p className="text-xl font-bold font-mono text-white leading-tight">₹ {inr(balance)}</p>
              <p className={clsx('text-sm font-semibold mt-1', balance > 0 ? 'text-amber-100' : 'text-emerald-100')}>{balance > 0 ? 'Pending billing' : '✓ Fully billed'}</p>
            </div>
            <div className="rounded-xl border-2 border-emerald-400 bg-emerald-600 p-4">
              <p className="text-xs font-bold text-emerald-100 uppercase tracking-wider mb-2">Amount Paid</p>
              <p className="text-xl font-bold font-mono text-white leading-tight">₹ {inr(paid)}</p>
              {billed > 0 && <p className="text-sm font-semibold text-emerald-100 mt-1">{Math.round((paid/billed)*100)}% of billed</p>}
            </div>
          </div>

          {/* WO Details grid */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Work Order Details</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 divide-x divide-y divide-slate-100">
              {[
                ['Vendor / Sub-Con',  displayWO.vendor_name   || '—'],
                ['Vendor Type',       displayWO.vendor_type   || '—'],
                ['Project',           displayWO.project_name  || '—'],
                ['Start Date',        wo.start_date ? dayjs(wo.start_date).format('DD MMM YYYY') : '—'],
                ['End Date',          wo.end_date   ? dayjs(wo.end_date).format('DD MMM YYYY')   : '—'],
                ['Contract Amount',   `₹ ${inr(displayWO.contract_amount || val)}`],
                ['Cost Head',         displayWO.cost_head     || '—'],
                ['Work Category',     displayWO.work_category || '—'],
                ['Tower / Block',     displayWO.tower_block   || '—'],
                ['Work Description',  displayWO.work_description || displayWO.subject || '—'],
                ['Vendor GSTIN',      displayWO.vendor_gstin  || '—'],
                ['Manager',           displayWO.manager_name  || '—'],
                ['Created',           displayWO.created_at ? dayjs(displayWO.created_at).format('DD MMM YYYY') : '—'],
              ].map(([label, value]) => (
                <div key={label} className="px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* BOQ Line Items table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">BOQ Line Items</p>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                {detailLoading ? '…' : `${lineItems.length} item${lineItems.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            {detailLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading line items…</div>
            ) : lineItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No BOQ items added for this work order.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800">
                    <tr>
                      {['#', 'Description', 'Unit', 'WO Qty', 'Billed', 'Balance', 'Rate (₹)', 'Amount (₹)'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/80 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, idx) => {
                      const qty        = Number(item.quantity   || 0);
                      const billedQty  = Number(item.billed_qty || 0);
                      const remQty     = Number(item.remaining_qty ?? Math.max(qty - billedQty, 0));
                      const rate       = Number(item.rate   || 0);
                      const amount     = Number(item.amount || qty * rate);
                      const billedPct  = qty > 0 ? Math.round((billedQty / qty) * 100) : 0;
                      return (
                        <tr key={item.id || idx} className={clsx('border-b border-slate-50', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
                          <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-[280px]">
                            <p>{item.description || `Item ${idx + 1}`}</p>
                            {item.remarks && <p className="text-[11px] text-slate-500 mt-0.5">{item.remarks}</p>}
                          </td>
                          <td className="px-4 py-3 text-slate-500">{item.unit || 'LS'}</td>
                          <td className="px-4 py-3 font-mono text-right text-slate-700">{qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</td>
                          <td className="px-4 py-3 font-mono text-right">
                            <span className="font-semibold text-emerald-700">{billedQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
                            {billedPct > 0 && <span className="text-[9px] text-emerald-500 ml-1">({billedPct}%)</span>}
                          </td>
                          <td className="px-4 py-3 font-mono text-right">
                            <span className={clsx('font-semibold', remQty > 0 ? 'text-amber-600' : 'text-slate-400')}>
                              {remQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-right text-slate-600">{inr(rate)}</td>
                          <td className="px-4 py-3 font-mono text-right font-semibold text-slate-800">{inr(amount)}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                      <td colSpan={7} className="px-4 py-3 text-right text-sm text-slate-700 uppercase tracking-wider">Total</td>
                      <td className="px-4 py-3 text-right font-mono text-base font-bold text-slate-900">
                        {inr(lineItems.reduce((s, it) => s + Number(it.amount || (Number(it.quantity||0)*Number(it.rate||0))), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Scope + Terms */}
          {(displayWO.scope_of_work || displayWO.work_description) && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Scope of Work</p>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {displayWO.scope_of_work || displayWO.work_description}
              </p>
            </div>
          )}
          {wo.terms_conditions && (
            <div className="bg-white border border-slate-200 rounded-xl p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Terms & Conditions</p>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">{wo.terms_conditions}</p>
            </div>
          )}

          {/* Attachments */}
          <div className="bg-white border border-slate-200 rounded-xl p-5">
            <RecordAttachments
              module="work_order"
              recordId={wo.id}
              projectId={wo.project_id}
              label="WO Attachments — Contracts, Site Photos, BOQ"
              compact
            />
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 flex items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-white flex-wrap">
          <div className="flex gap-2 flex-wrap">
            <button onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 text-sm font-medium rounded-xl hover:bg-slate-50 transition-colors">
              <Printer className="w-4 h-4" /> Print
            </button>
            {canApprove && onApprove && (
              <button onClick={() => onApprove(wo.id)} disabled={isApproving}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm font-medium rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                <CheckCircle2 className="w-4 h-4" /> {isApproving ? 'Approving…' : 'Approve WO'}
              </button>
            )}
            {canApprove && onReject && (
              <button onClick={() => onReject(wo.id)} disabled={isRejecting}
                className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 text-sm font-medium rounded-xl hover:bg-amber-100 disabled:opacity-50 transition-colors">
                <X className="w-4 h-4" /> {isRejecting ? 'Rejecting…' : 'Reject WO'}
              </button>
            )}
            <button
              onClick={() => { if (window.confirm(`Delete Work Order ${wo.wo_number}? This cannot be undone.`)) { onDelete(wo.id); } }}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 text-red-600 text-sm font-medium rounded-xl hover:bg-red-100 transition-colors">
              <X className="w-4 h-4" /> Delete
            </button>
          </div>
          <button onClick={onClose}
            className="px-6 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>

    {/* Hidden print zone — content captured via ref, printed in new window */}
    <div ref={printZoneRef} style={{ display: 'none' }} aria-hidden="true">
      <WOPrintTemplate data={displayWO} />
    </div>
    </>
  );
}

/* ── Main Page ─────────────────────────────────────────────────────────── */
export default function WorkOrderPage() {
  const [showCreate,     setShowCreate]     = useState(false);
  const [showPdfImport,  setShowPdfImport]  = useState(false);
  const [showExcelImport,setShowExcelImport]= useState(false);
  const [selectedWO,     setSelectedWO]     = useState(null);
  const [attachWOId,     setAttachWOId]     = useState(null);
  const [search,         setSearch]         = useState('');
  const [filterStatus,   setFilterStatus]   = useState('');
  const qc = useQueryClient();

  const { data: woData = [], isLoading } = useQuery({
    queryKey: ['work-orders'],
    queryFn: () => subcontractorAPI.listWorkOrders().then(r => r.data?.data ?? []),
  });

  const { data: vendorsData = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => vendorAPI.list().then(r => r.data?.data ?? []),
  });

  const { data: projectsData = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectAPI.list().then(r => r.data?.data ?? []),
  });

  const createMutation = useMutation({
    mutationFn: d => subcontractorAPI.createWorkOrder(d),
    onSuccess: () => {
      toast.success('Work Order issued successfully');
      setShowCreate(false);
      qc.invalidateQueries({ queryKey: ['work-orders'] });
    },
    onError: e => toast.error(e?.response?.data?.error || 'Failed to issue Work Order'),
  });

  const deleteMutation = useMutation({
    mutationFn: id => subcontractorAPI.deleteWorkOrder(id),
    onSuccess: () => {
      toast.success('Work Order deleted');
      setSelectedWO(null);
      qc.invalidateQueries({ queryKey: ['work-orders'] });
    },
    onError: e => toast.error(e?.response?.data?.error || 'Failed to delete Work Order'),
  });

  const approveMutation = useMutation({
    mutationFn: id => subcontractorAPI.approveWorkOrder(id),
    onSuccess: () => {
      toast.success('Work Order approved');
      setSelectedWO(null);
      qc.invalidateQueries({ queryKey: ['work-orders'] });
    },
    onError: e => toast.error(e?.response?.data?.error || 'Approval failed'),
  });

  const rejectMutation = useMutation({
    mutationFn: id => subcontractorAPI.rejectWorkOrder(id),
    onSuccess: () => {
      toast.success('Work Order rejected');
      setSelectedWO(null);
      qc.invalidateQueries({ queryKey: ['work-orders'] });
    },
    onError: e => toast.error(e?.response?.data?.error || 'Rejection failed'),
  });

  const allWOs = woData;
  const filtered = allWOs.filter(wo => {
    const matchSearch = !search || `${wo.wo_number} ${wo.vendor_name||''} ${wo.project_name||''} ${wo.subject||''}`.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || wo.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const totalValue    = allWOs.reduce((s, w) => s + parseFloat(w.total_value || 0), 0);
  const approvedCount = allWOs.filter(w => w.status === 'approved').length;
  const pendingCount  = allWOs.filter(w => w.status === 'pending').length;

  const refresh = () => qc.invalidateQueries({ queryKey: ['work-orders'] });

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Page Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs text-slate-900 font-medium mb-1">
              <Hammer className="w-3.5 h-3.5" />
              <span>Procurement</span>
              <ChevronRight className="w-3 h-3" />
              <span className="text-slate-900 font-medium">Work Orders</span>
            </div>
            <h1 className="text-2xl font-medium text-slate-900 tracking-tight">Work Orders</h1>
            <p className="text-sm text-slate-900 font-medium mt-0.5">Subcontractor & labour work order management</p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setShowPdfImport(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-900 text-sm font-medium rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
              <FileText className="w-3.5 h-3.5" /> Import PDF
            </button>
            <button onClick={() => setShowExcelImport(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-white border border-emerald-200 text-emerald-700 text-sm font-medium rounded-lg hover:bg-emerald-50 transition-all shadow-sm">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Import Excel
            </button>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-all">
              <Plus className="w-3.5 h-3.5" /> New Work Order
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total WOs',     value: allWOs.length,   accent: 'border-indigo-500',  bg: 'bg-indigo-50',  text: 'text-indigo-700',  icon: FileText },
            { label: 'Total Value',   value: `₹${inr(totalValue)}`, accent: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', icon: IndianRupee },
            { label: 'Pending Appvl', value: pendingCount,    accent: 'border-amber-500',   bg: 'bg-amber-50',   text: 'text-amber-700',   icon: Clock },
            { label: 'Approved',      value: approvedCount,   accent: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', icon: CheckCircle2 },
          ].map(({ label, value, accent, bg, text, icon: Icon }) => (
            <div key={label} className={`bg-white border border-slate-200 rounded-xl p-4 shadow-sm border-l-4 ${accent}`}>
              <div className={`inline-flex items-center justify-center w-8 h-8 rounded-lg ${bg} mb-2`}>
                <Icon className={`w-4 h-4 ${text}`} />
              </div>
              <div className={`text-xl font-medium font-mono ${text}`}>{value}</div>
              <div className="text-xs text-slate-900 font-medium mt-0.5">{label}</div>
            </div>
          ))}
        </div>

        {/* ── Search + Filter Bar ── */}
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search WO number, vendor, project…"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all placeholder:text-slate-400" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-900 outline-none focus:border-indigo-400 transition-all">
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button onClick={refresh} className="p-2 text-slate-900 font-medium hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all" title="Refresh">
            <RefreshCw className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-900 font-medium shrink-0">{filtered.length} of {allWOs.length}</span>
        </div>

        {/* ── Table ── */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['WO Number', 'Subject', 'Vendor / Sub-Con', 'Project', 'Date', 'Value', 'Status', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-medium text-slate-900 font-medium uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-slate-100">
                      {[...Array(8)].map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-slate-100 rounded animate-pulse" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filtered.map(wo => (
                  <React.Fragment key={wo.id}>
                  <tr onClick={() => setSelectedWO(wo)}
                    className="border-b border-slate-100 last:border-0 cursor-pointer hover:bg-slate-50 transition-colors group">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center flex-shrink-0">
                          <Hammer className="w-3.5 h-3.5 text-indigo-500" />
                        </div>
                        <span className="text-xs font-medium font-mono text-indigo-700 group-hover:underline">{wo.wo_number}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="text-xs text-slate-900 truncate">{wo.subject || '—'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-xs font-medium text-slate-900 font-medium max-w-[140px] truncate">{wo.vendor_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-900 font-medium max-w-[140px] truncate">{wo.project_name || '—'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {wo.start_date ? dayjs(wo.start_date).format('DD MMM YYYY') : wo.created_at ? dayjs(wo.created_at).format('DD MMM YYYY') : '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm font-medium font-mono text-slate-800">₹{inr(wo.total_value)}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <StatusBadge status={wo.status} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setAttachWOId(attachWOId === wo.id ? null : wo.id)}
                          title="Attachments"
                          className={clsx(
                            'flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-medium transition-all',
                            attachWOId === wo.id
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-indigo-50 text-indigo-600 border-indigo-200 hover:bg-indigo-100 opacity-0 group-hover:opacity-100'
                          )}
                        >
                          <Upload className="w-3 h-3" />
                          {attachWOId === wo.id ? 'Close' : 'Attach'}
                        </button>
                        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 transition-colors ml-auto" />
                      </div>
                    </td>
                  </tr>
                  {attachWOId === wo.id && (
                    <tr>
                      <td colSpan={8} className="px-6 pb-4 bg-indigo-50/30 border-b border-indigo-100">
                        <RecordAttachments
                          module="work_order"
                          recordId={wo.id}
                          projectId={wo.project_id}
                          label="WO Attachments — Contract Document, BOQ, Site Photos, Completion Certificate"
                        />
                      </td>
                    </tr>
                  )}
                  </React.Fragment>
                ))}

                {!isLoading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center">
                          <Hammer className="w-5 h-5 text-slate-300" />
                        </div>
                        <p className="text-sm font-medium text-slate-400">
                          {search || filterStatus ? 'No work orders match your filters' : 'No work orders yet'}
                        </p>
                        {(search || filterStatus) ? (
                          <button onClick={() => { setSearch(''); setFilterStatus(''); }}
                            className="text-xs text-indigo-500 hover:underline font-semibold">Clear filters</button>
                        ) : (
                          <button onClick={() => setShowCreate(true)}
                            className="flex items-center gap-1.5 text-xs text-indigo-600 hover:underline font-semibold">
                            <Plus className="w-3.5 h-3.5" /> Create your first Work Order
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {allWOs.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-400">{allWOs.length} work order{allWOs.length !== 1 ? 's' : ''} total</span>
              <span className="text-xs font-medium font-mono text-slate-600">Total Value: ₹{inr(totalValue)}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      {showCreate && (
        <CreateWOModal
          onClose={() => setShowCreate(false)}
          vendors={vendorsData}
          projects={projectsData}
          onCreate={data => createMutation.mutate(data)}
        />
      )}

      {showPdfImport && (
        <PdfImportModal
          onClose={() => setShowPdfImport(false)}
          vendors={vendorsData}
          projects={projectsData}
          onImported={refresh}
        />
      )}

      {showExcelImport && (
        <ExcelImportModal
          onClose={() => setShowExcelImport(false)}
          onImported={refresh}
        />
      )}

      {selectedWO && (
        <WODetailPanel
          wo={selectedWO}
          onClose={() => setSelectedWO(null)}
          onDelete={id => deleteMutation.mutate(id)}
          onApprove={id => approveMutation.mutate(id)}
          onReject={id => rejectMutation.mutate(id)}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
        />
      )}
    </div>
  );
}
