import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import * as XLSX from 'xlsx';
import {
  Download, Search, Building2, PackageCheck, ClipboardList,
  Boxes, ShoppingCart, Users, XCircle, Truck,
} from 'lucide-react';
import { ignAPI, projectAPI } from '../../api/client';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

const STATUS = {
  pending:   { label: 'Pending',   bg: 'bg-amber-100',   text: 'text-amber-800'   },
  inspected: { label: 'Inspected', bg: 'bg-blue-100',    text: 'text-blue-800'    },
  approved:  { label: 'Approved',  bg: 'bg-emerald-100', text: 'text-emerald-800' },
  cancelled: { label: 'Cancelled', bg: 'bg-red-100',     text: 'text-red-700'     },
};

const fmtQty   = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
const fmtMoney = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtDate  = (d) => {
  if (!d) return '—';
  const x = new Date(d);
  if (isNaN(x.getTime())) return '—';
  return `${String(x.getDate()).padStart(2, '0')}-${String(x.getMonth() + 1).padStart(2, '0')}-${x.getFullYear()}`;
};
const dayKey = (d) => {
  const x = new Date(d);
  if (isNaN(x.getTime())) return '0000-00-00';
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
};

/* per-line receipt derivations */
const acceptedOf = (r) => {
  const insp = r.qty_inspected != null ? Number(r.qty_inspected) : Number(r.qty_as_per_dc || 0);
  return Math.max(insp - Number(r.qty_rejected || 0), 0);
};
const valueOf = (r) => acceptedOf(r) * Number(r.rate || 0);
const poOf    = (r) => r.po_serial || r.po_ref_no || r.po_number || '—';

const TH = ({ children, right }) => (
  <th className={`px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-slate-600 whitespace-nowrap ${right ? 'text-right' : 'text-left'}`}>{children}</th>
);
const TD = ({ children, right, bold, mono, className = '' }) => (
  <td className={`px-3 py-2 text-sm ${right ? 'text-right' : 'text-left'} ${bold ? 'font-semibold text-slate-900' : 'text-slate-700'} ${mono ? 'font-mono text-xs' : ''} ${className}`}>{children}</td>
);
const Pill = ({ s }) => {
  const c = STATUS[s] || STATUS.pending;
  return <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${c.bg} ${c.text}`}>{c.label}</span>;
};

export default function DailyMaterialRegisterPage() {
  const { selectedProjectId } = useAuthStore();
  const [searchParams, setSearchParams] = useSearchParams();
  const [projectId, setProjectId] = useState(searchParams.get('project') || selectedProjectId || '');
  const [from, setFrom] = useState('');
  const [to, setTo]     = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState(searchParams.get('tab') === 'register' ? 'register' : 'receipt');

  // keep tab in URL so the two sidebar menus land on the right view
  useEffect(() => {
    const q = searchParams.get('tab');
    if (q === 'register' && tab !== 'register') setTab('register');
    if (q === 'receipt'  && tab !== 'receipt')  setTab('receipt');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  const switchTab = (t) => { setTab(t); const sp = new URLSearchParams(searchParams); sp.set('tab', t); setSearchParams(sp, { replace: true }); };

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectAPI.list().then(r => r.data?.data || r.data || []).catch(() => []),
  });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ['dmr-register', projectId, from, to, status],
    queryFn: () => ignAPI.register({
      project_id: projectId || undefined,
      from_date: from || undefined,
      to_date: to ? `${to}T23:59:59` : undefined,
      status: status || undefined,
    }).then(r => r.data?.data ?? r.data ?? []),
  });

  /* client-side search */
  const lines = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(r => [r.material_name, r.ign_number, poOf(r), r.vendor_name, r.dc_number, r.bill_number]
      .join(' ').toLowerCase().includes(needle));
  }, [rows, search]);

  /* KPIs */
  const kpi = useMemo(() => {
    const igns = new Set(), pos = new Set(), vendors = new Set();
    let value = 0, rejected = 0;
    for (const r of lines) {
      igns.add(r.ign_id);
      if (r.po_number || r.po_serial) pos.add(r.po_number || r.po_serial);
      if (r.vendor_name) vendors.add(r.vendor_name);
      value += valueOf(r);
      rejected += Number(r.qty_rejected || 0);
    }
    return { receipts: igns.size, items: lines.length, value, rejected, pos: pos.size, vendors: vendors.size };
  }, [lines]);

  /* date-grouped register */
  const grouped = useMemo(() => {
    const map = {};
    for (const r of lines) {
      const k = dayKey(r.date_time);
      if (!map[k]) map[k] = { key: k, date: r.date_time, rows: [], value: 0, accepted: 0 };
      map[k].rows.push(r);
      map[k].value += valueOf(r);
      map[k].accepted += acceptedOf(r);
    }
    return Object.values(map).sort((a, b) => b.key.localeCompare(a.key));
  }, [lines]);

  const handleExport = () => {
    if (!lines.length) return toast.error('Nothing to export');
    const data = lines.map(r => ({
      'Date': fmtDate(r.date_time), 'IGN No': r.ign_number, 'PO No': poOf(r),
      'Vendor': r.vendor_name || '', 'DC No': r.dc_number || '', 'Invoice No': r.bill_number || '',
      'Vehicle': r.vehicle_no || '', 'Material': r.material_name, 'Unit': r.unit || '',
      'DC Qty': Number(r.qty_as_per_dc || 0), 'Accepted Qty': acceptedOf(r), 'Rejected Qty': Number(r.qty_rejected || 0),
      'Rate': Number(r.rate || 0), 'Value': valueOf(r),
      'Batch': r.batch_number || '', 'Status': (STATUS[r.status] || {}).label || r.status,
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(data), 'Daily Material Register');
    const proj = projects.find(p => p.id === projectId);
    XLSX.writeFile(wb, `DMR_${proj?.project_code || 'all'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success('Excel downloaded');
  };

  const selectedProject = projects.find(p => p.id === projectId);

  const KPI = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-3 bg-white border border-slate-200 rounded-xl px-4 py-2.5 shadow-sm">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${color}`}><Icon className="w-4 h-4" /></div>
      <div>
        <p className="text-base font-bold text-slate-900 leading-none tabular-nums">{value}</p>
        <p className="text-[11px] text-slate-500 mt-0.5">{label}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <style>{`
        div.mrs-hscroll { scrollbar-width: thin; scrollbar-color: #94a3b8 transparent; }
        div.mrs-hscroll::-webkit-scrollbar { height: 10px; }
        div.mrs-hscroll::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 8px; }
        div.mrs-hscroll::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 8px; }
        div.mrs-hscroll::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      {/* ── Header ── */}
      <div className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-3 mr-2">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center">
              <PackageCheck className="w-4 h-4 text-teal-600" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">Daily Material Register (DMR)</h1>
              <p className="text-xs text-slate-500">Materials received against POs — daily receipt log (from IGN)</p>
            </div>
          </div>

          <select className="h-9 pl-3 pr-8 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400 min-w-[180px]"
            value={projectId} onChange={e => setProjectId(e.target.value)}>
            <option value="">All projects</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input type="date" className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400"
            value={from} onChange={e => setFrom(e.target.value)} title="From date" />
          <span className="text-slate-400 text-xs">to</span>
          <input type="date" className="h-9 px-3 text-sm border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400"
            value={to} onChange={e => setTo(e.target.value)} title="To date" />

          <div className="ml-auto">
            <button onClick={handleExport}
              className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors">
              <Download className="w-4 h-4" /> Download Excel
            </button>
          </div>
        </div>

        {/* filters */}
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search material, IGN, PO, vendor, DC…"
              className="h-8 pl-8 pr-3 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400 w-72" />
          </div>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="h-8 pl-2 pr-7 text-xs border border-slate-200 rounded-lg bg-white outline-none focus:border-indigo-400">
            <option value="">All statuses</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          {selectedProject && (
            <span className="ml-auto flex items-center gap-1.5 text-xs text-slate-500">
              <Building2 className="w-3.5 h-3.5" />
              <span className="font-medium text-slate-700">{selectedProject.name}</span>
              <span>·</span><span>{selectedProject.project_code}</span>
            </span>
          )}
        </div>

        {/* KPI strip */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-6 gap-2.5">
          <KPI icon={ClipboardList} label="Receipts (IGN)" value={kpi.receipts}        color="bg-teal-50 text-teal-600" />
          <KPI icon={Boxes}         label="Line Items"     value={kpi.items}           color="bg-slate-100 text-slate-600" />
          <KPI icon={Download}      label="Accepted Value" value={fmtMoney(kpi.value)} color="bg-emerald-50 text-emerald-600" />
          <KPI icon={XCircle}       label="Rejected Qty"   value={fmtQty(kpi.rejected)} color="bg-rose-50 text-rose-600" />
          <KPI icon={ShoppingCart}  label="POs"            value={kpi.pos}             color="bg-indigo-50 text-indigo-600" />
          <KPI icon={Users}         label="Vendors"        value={kpi.vendors}         color="bg-amber-50 text-amber-600" />
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="border-b border-slate-200 bg-white px-6">
        {[
          { id: 'receipt',  label: 'Daily Material Receipt',  count: lines.length },
          { id: 'register', label: 'Daily Material Register', count: grouped.length },
        ].map(t => (
          <button key={t.id} onClick={() => switchTab(t.id)}
            className={`mr-1 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {t.label}
            <span className="ml-2 px-1.5 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-600">{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      <div className="p-6">
        {isLoading ? (
          <div className="flex justify-center py-20 text-slate-400 text-sm">Loading…</div>
        ) : lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <PackageCheck className="w-10 h-10 mb-3" />
            <p className="text-sm">No material receipts found</p>
            <p className="text-xs mt-1">Adjust the project, date range, or filters above. Receipts come from IGN (Inward Goods).</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto mrs-hscroll">

              {/* ── Daily Material Receipt (line-item detail) ── */}
              {tab === 'receipt' && (
                <table className="w-full text-left border-collapse min-w-[1180px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <TH>Date</TH><TH>IGN No</TH><TH>PO No</TH><TH>Vendor</TH>
                      <TH>Material</TH><TH>Unit</TH><TH right>DC Qty</TH><TH right>Accepted</TH><TH right>Rejected</TH>
                      <TH right>Rate</TH><TH right>Value</TH><TH>Status</TH>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lines.map((r, idx) => (
                      <tr key={r.item_id || idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                        <TD>{fmtDate(r.date_time)}</TD>
                        <TD mono bold>{r.ign_number}</TD>
                        <TD mono className="text-indigo-700">{poOf(r)}</TD>
                        <TD>{r.vendor_name || '—'}</TD>
                        <TD bold>{r.material_name}</TD>
                        <TD>{r.unit || '—'}</TD>
                        <TD right>{fmtQty(r.qty_as_per_dc)}</TD>
                        <TD right className="text-emerald-700 font-semibold">{fmtQty(acceptedOf(r))}</TD>
                        <TD right className={Number(r.qty_rejected) > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>{fmtQty(r.qty_rejected)}</TD>
                        <TD right>{Number(r.rate) > 0 ? fmtMoney(r.rate) : '—'}</TD>
                        <TD right bold>{valueOf(r) > 0 ? fmtMoney(valueOf(r)) : '—'}</TD>
                        <TD><Pill s={r.status} /></TD>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-teal-50 border-t-2 border-teal-200">
                      <td colSpan={10} className="px-3 py-2.5 text-sm font-semibold text-teal-900">TOTAL — {lines.length} receipt lines</td>
                      <TD right bold className="text-teal-900">{fmtMoney(kpi.value)}</TD>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              )}

              {/* ── Daily Material Register (date-grouped) ── */}
              {tab === 'register' && (
                <table className="w-full text-left border-collapse min-w-[980px]">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <TH>Material</TH><TH>IGN No</TH><TH>PO No</TH><TH>Vendor</TH>
                      <TH>Unit</TH><TH right>Accepted</TH><TH right>Rejected</TH><TH right>Rate</TH><TH right>Value</TH>
                    </tr>
                  </thead>
                  <tbody>
                    {grouped.map(g => (
                      <React.Fragment key={g.key}>
                        <tr className="bg-slate-800 text-white">
                          <td colSpan={5} className="px-3 py-2 text-xs font-bold uppercase tracking-wide flex items-center gap-2">
                            <Truck className="w-3.5 h-3.5 opacity-70" /> {fmtDate(g.date)}
                            <span className="ml-1 font-normal text-slate-300">· {g.rows.length} item(s)</span>
                          </td>
                          <td className="px-3 py-2 text-xs text-right font-semibold text-emerald-300">{fmtQty(g.accepted)}</td>
                          <td colSpan={2} />
                          <td className="px-3 py-2 text-xs text-right font-bold text-amber-300">{fmtMoney(g.value)}</td>
                        </tr>
                        {g.rows.map((r, idx) => (
                          <tr key={r.item_id || idx} className="border-b border-slate-100 hover:bg-slate-50">
                            <TD bold>{r.material_name}</TD>
                            <TD mono className="text-slate-500 text-xs">{r.ign_number}</TD>
                            <TD mono className="text-indigo-700">{poOf(r)}</TD>
                            <TD>{r.vendor_name || '—'}</TD>
                            <TD>{r.unit || '—'}</TD>
                            <TD right className="text-emerald-700 font-semibold">{fmtQty(acceptedOf(r))}</TD>
                            <TD right className={Number(r.qty_rejected) > 0 ? 'text-rose-600 font-semibold' : 'text-slate-400'}>{fmtQty(r.qty_rejected)}</TD>
                            <TD right>{Number(r.rate) > 0 ? fmtMoney(r.rate) : '—'}</TD>
                            <TD right bold>{valueOf(r) > 0 ? fmtMoney(valueOf(r)) : '—'}</TD>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-teal-50 border-t-2 border-teal-200">
                      <td colSpan={8} className="px-3 py-2.5 text-sm font-semibold text-teal-900">GRAND TOTAL — {grouped.length} day(s), {lines.length} lines</td>
                      <TD right bold className="text-teal-900">{fmtMoney(kpi.value)}</TD>
                    </tr>
                  </tfoot>
                </table>
              )}

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
