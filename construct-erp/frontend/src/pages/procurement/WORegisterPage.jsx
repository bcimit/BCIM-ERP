// src/pages/procurement/WORegisterPage.jsx
import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries, useQuery } from '@tanstack/react-query';
import * as XLSX from 'xlsx';
import {
  AlertCircle,
  Building2,
  Calendar,
  ChevronRight,
  Download,
  FileText,
  Hammer,
  Plus,
  Search,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import { clsx } from 'clsx';
import { projectAPI, subcontractorAPI, vendorAPI } from '../../api/client';

const inr = v => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const STATUS = {
  draft:      { cls: 'bg-slate-100  text-slate-700  border-slate-200',   label: 'Draft' },
  pending:    { cls: 'bg-amber-50   text-amber-700  border-amber-200',   label: 'Pending' },
  submitted:  { cls: 'bg-blue-50    text-blue-700   border-blue-200',    label: 'Submitted' },
  approved:   { cls: 'bg-emerald-50 text-emerald-700 border-emerald-200',label: 'Approved' },
  active:     { cls: 'bg-teal-50    text-teal-700   border-teal-200',    label: 'Active' },
  completed:  { cls: 'bg-indigo-50  text-indigo-700 border-indigo-200',  label: 'Completed' },
  terminated: { cls: 'bg-red-50     text-red-600    border-red-200',     label: 'Terminated' },
  closed:     { cls: 'bg-gray-100   text-gray-500   border-gray-200',    label: 'Closed' },
  rejected:   { cls: 'bg-red-50     text-red-600    border-red-200',     label: 'Rejected' },
};

function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.pending;
  return (
    <span className={clsx('inline-flex px-2 py-0.5 rounded-full border text-[11px] font-medium', cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function TH({ children, right }) {
  return <th className={clsx('px-4 py-3 text-[11px] font-medium uppercase tracking-wider text-slate-900 font-medium whitespace-nowrap', right ? 'text-right' : 'text-left')}>{children}</th>;
}

function TD({ children, right, className = '' }) {
  return <td className={clsx('px-4 py-3 text-xs border-b border-slate-100 align-top', right ? 'text-right' : 'text-left', className)}>{children}</td>;
}

function WODrawer({ wo, onClose }) {
  const { data: detail, isLoading } = useQuery({
    queryKey: ['wo-register-detail', wo?.id],
    queryFn: () => subcontractorAPI.getWorkOrder(wo.id).then(r => r.data),
    enabled: !!wo?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnMount: 'always',
  });
  const data   = { ...wo, ...(detail || {}) };
  const items  = data.items || [];
  const val    = Number(data.total_value || data.contract_amount || 0);
  const billed = Number(data.total_billed || 0);
  const paid   = Number(data.total_paid || 0);
  const balance = Math.max(val - billed, 0);
  const statusCfg = STATUS[data.status] || STATUS.pending;

  return (
    /* Full-screen modal — "separate window" feel */
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-5xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Hammer className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="font-mono text-base font-bold text-white">{data.wo_number}</span>
                <span className={clsx('text-[11px] font-semibold px-2 py-0.5 rounded-full border', statusCfg.cls)}>
                  {statusCfg.label}
                </span>
                {data.cost_head && (
                  <span className="text-[11px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full">{data.cost_head}</span>
                )}
              </div>
              <p className="text-sm text-white/80 mt-0.5 truncate max-w-[600px]">{data.subject || 'No subject'}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white flex-shrink-0 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 p-6 space-y-5">

          {/* ── Financial summary strip ── */}
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

          {/* ── Work Order Details ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Work Order Details</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-0 divide-x divide-y divide-slate-100">
              {[
                ['Vendor / Sub-Con',    data.vendor_name     || '-'],
                ['Vendor Type',         data.vendor_type     || '-'],
                ['Vendor GSTIN',        data.vendor_gstin    || '-'],
                ['Project',             data.project_name    || '-'],
                ['Start Date',          data.start_date ? dayjs(data.start_date).format('DD MMM YYYY') : '-'],
                ['End / Target Date',   data.end_date   ? dayjs(data.end_date).format('DD MMM YYYY')   : '-'],
                ['Contract Amount',     `₹ ${inr(data.contract_amount || val)}`],
                ['Cost Head',           data.cost_head    || '-'],
                ['Work Category',       data.work_category || '-'],
                ['Tower / Block',       data.tower_block  || '-'],
                ['Work Description',    data.work_description || data.subject || '-'],
                ['Manager',             data.manager_name || '-'],
                ['Created Date',        data.created_at ? dayjs(data.created_at).format('DD MMM YYYY') : '-'],
              ].map(([label, value]) => (
                <div key={label} className="px-4 py-3">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-slate-800 break-words">{value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* ── BOQ Line Items ── */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">BOQ Line Items</p>
              <span className="text-[11px] font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                {isLoading ? '…' : `${items.length} item${items.length !== 1 ? 's' : ''}`}
              </span>
            </div>
            {isLoading ? (
              <div className="p-8 text-center text-sm text-slate-400">Loading line items…</div>
            ) : items.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No BOQ items found for this work order.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-800">
                    <tr>
                      {['#', 'Description', 'Unit', 'WO Qty', 'Billed Qty', 'Balance Qty', 'Rate (₹)', 'Amount (₹)'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[10px] font-bold uppercase tracking-wider text-white/80 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((it, idx) => {
                      const qty      = Number(it.quantity || 0);
                      const rate     = Number(it.rate || 0);
                      const bQty     = Number(it.billed_qty    || 0);
                      const remQty   = Number(it.remaining_qty ?? Math.max(qty - bQty, 0));
                      const amount   = Number(it.amount || qty * rate);
                      const billedPct = qty > 0 ? Math.round((bQty / qty) * 100) : 0;
                      return (
                        <tr key={it.id || idx} className={clsx('border-b border-slate-50', idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40')}>
                          <td className="px-4 py-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="px-4 py-3 font-medium text-slate-800 max-w-[260px]">{it.description || `Item ${idx + 1}`}</td>
                          <td className="px-4 py-3 text-slate-500">{it.unit || 'LS'}</td>
                          <td className="px-4 py-3 font-mono text-right text-slate-700">{qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</td>
                          <td className="px-4 py-3 font-mono text-right">
                            <span className="font-semibold text-emerald-700">{bQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</span>
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
                    {/* Totals row */}
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                      <td colSpan={7} className="px-4 py-3 text-right text-sm text-slate-700 uppercase tracking-wider">Total Contract Value</td>
                      <td className="px-4 py-3 font-mono text-right text-base font-bold text-slate-900">
                        {inr(items.reduce((s, it) => s + Number(it.amount || Number(it.quantity||0) * Number(it.rate||0)), 0))}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* ── Scope of Work ── */}
          {(data.scope_of_work || data.work_description) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-3">Scope of Work / Description</p>
              <p className="text-sm text-slate-700 whitespace-pre-line leading-relaxed">
                {data.scope_of_work || data.work_description}
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex-shrink-0 flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white">
          <div className="text-xs text-slate-400">
            WO created: {data.created_at ? dayjs(data.created_at).format('DD MMM YYYY') : '—'}
          </div>
          <button onClick={onClose}
            className="px-5 py-2 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function Mini({ label, value, tone = 'text-slate-700' }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-100 p-2">
      <p className="text-[9px] uppercase tracking-wider text-slate-900 font-medium font-bold">{label}</p>
      <p className={clsx('text-xs font-mono font-semibold', tone)}>{value}</p>
    </div>
  );
}

function exportCsv(rows, fileName) {
  const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export default function WORegisterPage() {
  const [projectId, setProjectId] = useState('');
  const [vendorId, setVendorId] = useState('');
  const [status, setStatus] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('summary');
  const [selectedWO, setSelectedWO] = useState(null);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectAPI.list().then(r => r.data?.data || r.data || []),
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors-all'],
    queryFn: () => vendorAPI.list({ limit: 500 }).then(r => r.data?.data || r.data || []),
  });

  const { data: workOrders = [], isLoading } = useQuery({
    queryKey: ['wo-register', projectId, vendorId, status],
    queryFn: () => subcontractorAPI.listWorkOrders({
      project_id: projectId || undefined,
      vendor_id: vendorId || undefined,
      status: status || undefined,
    }).then(r => r.data?.data || []),
  });

  const filtered = useMemo(() => {
    return workOrders.filter(wo => {
      const dt = wo.start_date || wo.created_at;
      const text = `${wo.wo_number || ''} ${wo.subject || ''} ${wo.vendor_name || ''} ${wo.project_name || ''}`.toLowerCase();
      if (search && !text.includes(search.toLowerCase())) return false;
      if (from && dt && dayjs(dt).isBefore(dayjs(from), 'day')) return false;
      if (to && dt && dayjs(dt).isAfter(dayjs(to), 'day')) return false;
      return true;
    });
  }, [workOrders, search, from, to]);

  const detailQueries = useQueries({
    queries: filtered.map(wo => ({
      queryKey: ['wo-register-items', wo.id],
      queryFn: () => subcontractorAPI.getWorkOrder(wo.id).then(r => r.data),
      enabled: tab === 'items' || exportingXlsx,
      staleTime: 5 * 60 * 1000,
      refetchOnMount: 'always',
    })),
  });

  const itemRows = useMemo(() => {
    return detailQueries.flatMap((q, idx) => {
      const wo = filtered[idx];
      const items = q.data?.items || [];
      return items.map((it, lineNo) => ({ ...it, lineNo: lineNo + 1, wo }));
    });
  }, [detailQueries, filtered]);

  const vendorSummary = useMemo(() => {
    const map = {};
    for (const wo of filtered) {
      const key = wo.vendor_id || wo.vendor_name || 'unknown';
      if (!map[key]) map[key] = { vendor_name: wo.vendor_name || 'Unknown', count: 0, total: 0, billed: 0, projects: new Set() };
      map[key].count += 1;
      map[key].total += Number(wo.total_value || 0);
      map[key].billed += Number(wo.total_billed || 0);
      if (wo.project_name) map[key].projects.add(wo.project_name);
    }
    return Object.values(map).map(v => ({ ...v, projects: Array.from(v.projects).join(', ') }));
  }, [filtered]);

  const totals = useMemo(() => ({
    count: filtered.length,
    value: filtered.reduce((s, w) => s + Number(w.total_value || 0), 0),
    billed: filtered.reduce((s, w) => s + Number(w.total_billed || 0), 0),
    vendors: new Set(filtered.map(w => w.vendor_id || w.vendor_name).filter(Boolean)).size,
  }), [filtered]);

  const handleExport = async () => {
    setExportingXlsx(true);

    // Wait for detail queries to finish loading (needed for Sheet 2 line items)
    let waited = 0;
    while (detailQueries.some(q => q.isLoading) && waited < 5000) {
      await new Promise(r => setTimeout(r, 1000));
      waited += 1000;
    }

    try {
      const wb = XLSX.utils.book_new();
      const dateStr = new Date().toISOString().slice(0, 10);
      const proj = projects.find(p => p.id === projectId);

      // ── Sheet 1: WO Summary ─────────────────────────────────────────────────
      const s1Headers = ['WO No', 'Date', 'Vendor', 'Project', 'Subject / Scope', 'Status', 'Total Value (₹)', 'Billed (₹)', 'Balance (₹)'];
      const s1Rows = filtered.map(wo => {
        const val    = Number(wo.total_value  || 0);
        const billed = Number(wo.total_billed || 0);
        return [
          wo.wo_number || '',
          wo.start_date ? dayjs(wo.start_date).format('DD-MM-YYYY') : '',
          wo.vendor_name  || '',
          wo.project_name || '',
          wo.subject      || '',
          (wo.status || 'pending').toUpperCase(),
          val,
          billed,
          Math.max(val - billed, 0),
        ];
      });
      const totalVal    = filtered.reduce((s, w) => s + Number(w.total_value  || 0), 0);
      const totalBilled = filtered.reduce((s, w) => s + Number(w.total_billed || 0), 0);
      s1Rows.push([]); // blank
      s1Rows.push(['TOTAL', '', '', '', '', '', totalVal, totalBilled, Math.max(totalVal - totalBilled, 0)]);

      const ws1 = XLSX.utils.aoa_to_sheet([s1Headers, ...s1Rows]);
      ws1['!cols'] = [14, 12, 22, 24, 36, 10, 16, 16, 16].map(wch => ({ wch }));
      XLSX.utils.book_append_sheet(wb, ws1, 'WO Summary');

      // ── Sheet 2: Line Item Details ──────────────────────────────────────────
      const s2Headers = ['WO No', 'Date', 'Vendor', 'Sl No', 'Description', 'UOM', 'Qty', 'Rate (₹)', 'Amount (₹)', 'Remarks'];
      const s2Rows = [];
      detailQueries.forEach((q, idx) => {
        const wo    = filtered[idx];
        const items = q.data?.items || q.data?.data?.items || [];
        items.forEach((it, i) => {
          const qty  = Number(it.quantity || 0);
          const rate = Number(it.rate || 0);
          s2Rows.push([
            wo.wo_number || '',
            wo.start_date ? dayjs(wo.start_date).format('DD-MM-YYYY') : '',
            wo.vendor_name || '',
            i + 1,
            it.description || it.item_name || '',
            it.unit || '',
            qty,
            rate,
            qty * rate,
            it.remarks || it.purpose || '',
          ]);
        });
        // If no items fetched yet, still add a summary row
        if (items.length === 0) {
          s2Rows.push([wo.wo_number || '', wo.start_date ? dayjs(wo.start_date).format('DD-MM-YYYY') : '', wo.vendor_name || '', '', '(Line items not available)', '', '', '', Number(wo.total_value || 0), '']);
        }
      });

      const ws2 = XLSX.utils.aoa_to_sheet([s2Headers, ...s2Rows]);
      ws2['!cols'] = [14, 12, 22, 6, 36, 8, 8, 12, 14, 24].map(wch => ({ wch }));
      XLSX.utils.book_append_sheet(wb, ws2, 'Line Item Details');

      // ── Sheet 3: Vendor Summary ─────────────────────────────────────────────
      const s3Headers = ['Vendor Name', 'WO Numbers', '# WOs', 'Total Value (₹)', 'Billed (₹)', 'Balance (₹)', 'Projects'];
      const s3Rows = vendorSummary.map(v => [
        v.vendor_name,
        '', // WO numbers — derive from filtered
        v.count,
        v.total,
        v.billed,
        Math.max(v.total - v.billed, 0),
        v.projects,
      ]);
      // Fill WO numbers per vendor
      const woByVendor = {};
      filtered.forEach(wo => {
        const key = wo.vendor_name || 'Unknown';
        if (!woByVendor[key]) woByVendor[key] = [];
        woByVendor[key].push(wo.wo_number);
      });
      s3Rows.forEach(row => { row[1] = (woByVendor[row[0]] || []).join(', '); });
      s3Rows.push([]);
      s3Rows.push(['TOTAL', '', vendorSummary.reduce((s, v) => s + v.count, 0), totalVal, totalBilled, Math.max(totalVal - totalBilled, 0), '']);

      const ws3 = XLSX.utils.aoa_to_sheet([s3Headers, ...s3Rows]);
      ws3['!cols'] = [26, 40, 8, 16, 16, 16, 30].map(wch => ({ wch }));
      XLSX.utils.book_append_sheet(wb, ws3, 'Vendor Summary');

      // ── Write ───────────────────────────────────────────────────────────────
      const fileName = `WO_Register_${proj?.name?.replace(/\s+/g, '_') || 'export'}_${dateStr}.xlsx`;
      XLSX.writeFile(wb, fileName);
    } finally {
      setExportingXlsx(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 mr-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 flex items-center justify-center">
              <Hammer className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-sm font-medium text-slate-900">WO Register</h1>
              <p className="text-xs text-slate-500">Work order history with vendor and line item details</p>
            </div>
          </div>

          <select className="h-9 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400 min-w-[190px]" value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>

          <select className="h-9 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400 min-w-[180px]" value={vendorId} onChange={e => setVendorId(e.target.value)}>
            <option value="">All vendors</option>
            {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
          </select>

          <select className="h-9 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All Status</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="submitted">Submitted</option>
            <option value="approved">Approved</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
            <option value="terminated">Terminated</option>
            <option value="closed">Closed</option>
            <option value="rejected">Rejected</option>
          </select>

          <input type="date" className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400" value={from} onChange={e => setFrom(e.target.value)} />
          <span className="text-slate-900 font-medium text-xs">to</span>
          <input type="date" className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400" value={to} onChange={e => setTo(e.target.value)} />

          <div className="ml-auto flex gap-2">
            <Link to="/procurement/work-orders" className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors">
              <Plus className="w-4 h-4" /> New WO
            </Link>
            <button onClick={handleExport} disabled={filtered.length === 0 || exportingXlsx} className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 transition-colors">
              <Download className="w-4 h-4" /> {exportingXlsx ? 'Building Excel…' : 'Export Excel'}
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPI label="Total WOs" value={totals.count} icon={FileText} />
          <KPI label="WO Value" value={`Rs ${inr(totals.value)}`} icon={Hammer} />
          <KPI label="Billed So Far" value={`Rs ${inr(totals.billed)}`} icon={Calendar} />
          <KPI label="Vendors" value={totals.vendors} icon={Building2} />
        </div>
      </div>

      <div className="border-b border-slate-200 bg-white px-6">
        {[
          ['summary', 'WO Summary', filtered.length],
          ['items', 'Line Item Details', tab === 'items' ? itemRows.length : ''],
          ['vendors', 'Vendor Summary', vendorSummary.length],
        ].map(([id, label, count]) => (
          <button key={id} onClick={() => setTab(id)} className={clsx('mr-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors', tab === id ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-900 font-medium hover:text-slate-700')}>
            {label}
            {count !== '' && <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">{count}</span>}
          </button>
        ))}
      </div>

      <div className="p-6 space-y-4">
        <div className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input className="w-full h-9 bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 text-sm outline-none focus:border-indigo-400" placeholder="Search WO number, vendor, project, subject..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <span className="text-xs text-slate-400">{filtered.length} records</span>
        </div>

        {isLoading ? (
          <div className="py-20 text-center text-sm text-slate-400">Loading work order register...</div>
        ) : filtered.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-slate-400">
            <AlertCircle className="w-10 h-10 mb-3" />
            <p className="text-sm font-medium">No work orders found for the selected filters</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              {tab === 'summary' && (
                <table className="w-full min-w-[1100px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr><TH>WO No</TH><TH>Date</TH><TH>Vendor</TH><TH>Project</TH><TH>Subject</TH><TH>Status</TH><TH right>Total Value</TH><TH right>Billed</TH><TH right>Balance</TH><TH></TH></tr>
                  </thead>
                  <tbody>
                    {filtered.map(wo => {
                      const value = Number(wo.total_value || 0);
                      const billed = Number(wo.total_billed || 0);
                      return (
                        <tr key={wo.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => setSelectedWO(wo)}>
                          <TD className="font-mono font-medium text-indigo-700">{wo.wo_number}</TD>
                          <TD>{wo.start_date ? dayjs(wo.start_date).format('DD MMM YYYY') : '-'}</TD>
                          <TD className="font-medium text-slate-800">{wo.vendor_name || '-'}</TD>
                          <TD>{wo.project_name || '-'}</TD>
                          <TD className="max-w-[260px] truncate">{wo.subject || '-'}</TD>
                          <TD><StatusBadge status={wo.status} /></TD>
                          <TD right className="font-mono font-semibold">Rs {inr(value)}</TD>
                          <TD right className="font-mono text-emerald-700">Rs {inr(billed)}</TD>
                          <TD right className="font-mono text-slate-800">Rs {inr(value - billed)}</TD>
                          <TD right><ChevronRight className="w-4 h-4 text-slate-300 ml-auto" /></TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tab === 'items' && (
                <table className="w-full min-w-[1000px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr><TH>WO No</TH><TH>Date</TH><TH>Vendor</TH><TH>Description</TH><TH>Unit</TH><TH right>WO Qty</TH><TH right>Billed</TH><TH right>Remaining</TH><TH right>Rate</TH><TH right>Amount</TH></tr>
                  </thead>
                  <tbody>
                    {detailQueries.some(q => q.isLoading) && itemRows.length === 0 ? (
                      <tr><td colSpan={10} className="py-16 text-center text-sm text-slate-400">Loading line items...</td></tr>
                    ) : itemRows.length === 0 ? (
                      <tr><td colSpan={10} className="py-16 text-center text-sm text-slate-400">No line items found.</td></tr>
                    ) : itemRows.map((row, idx) => {
                      const qty = Number(row.quantity || 0);
                      const billedQty = Number(row.billed_qty || 0);
                      const remainingQty = Number(row.remaining_qty ?? Math.max(qty - billedQty, 0));
                      const rate = Number(row.rate || 0);
                      const amount = Number(row.amount || qty * rate);
                      return (
                        <tr key={`${row.wo.id}-${row.id || idx}`} className="hover:bg-slate-50">
                          <TD className="font-mono font-medium text-indigo-700">{row.wo.wo_number}</TD>
                          <TD>{row.wo.start_date ? dayjs(row.wo.start_date).format('DD MMM YYYY') : '-'}</TD>
                          <TD>{row.wo.vendor_name || '-'}</TD>
                          <TD className="max-w-[420px]">{row.description || '-'}</TD>
                          <TD>{row.unit || '-'}</TD>
                          <TD right className="font-mono">{qty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</TD>
                          <TD right className="font-mono text-emerald-700 font-semibold">{billedQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</TD>
                          <TD right className={clsx('font-mono font-semibold', remainingQty > 0 ? 'text-orange-700' : 'text-slate-500')}>{remainingQty.toLocaleString('en-IN', { maximumFractionDigits: 3 })}</TD>
                          <TD right className="font-mono">Rs {inr(rate)}</TD>
                          <TD right className="font-mono font-semibold">Rs {inr(amount)}</TD>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}

              {tab === 'vendors' && (
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr><TH>Vendor</TH><TH>Projects</TH><TH right>WO Count</TH><TH right>Total Value</TH><TH right>Billed</TH><TH right>Balance</TH></tr>
                  </thead>
                  <tbody>
                    {vendorSummary.map(v => (
                      <tr key={v.vendor_name} className="hover:bg-slate-50">
                        <TD className="font-medium text-slate-800">{v.vendor_name}</TD>
                        <TD className="max-w-[320px] truncate">{v.projects || '-'}</TD>
                        <TD right className="font-mono">{v.count}</TD>
                        <TD right className="font-mono font-semibold">Rs {inr(v.total)}</TD>
                        <TD right className="font-mono text-emerald-700">Rs {inr(v.billed)}</TD>
                        <TD right className="font-mono text-slate-800">Rs {inr(v.total - v.billed)}</TD>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {selectedWO && <WODrawer wo={selectedWO} onClose={() => setSelectedWO(null)} />}
    </div>
  );
}

function KPI({ label, value, icon: Icon }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-lg font-medium text-slate-900 mt-1">{value}</p>
        </div>
        <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center">
          <Icon className="w-4 h-4 text-indigo-600" />
        </div>
      </div>
    </div>
  );
}
