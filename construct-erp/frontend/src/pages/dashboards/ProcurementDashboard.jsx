import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ShoppingCart, Users, Hammer, TrendingUp, ClipboardList, IndianRupee,
  Clock, UserCheck, Building2, CheckCircle2, Package, Check, AlertTriangle,
  ArrowRight, ChevronRight, RefreshCw,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { poAPI, quotationAPI, vendorAPI, subcontractorAPI, mrsAPI, inventoryAPI } from '../../api/client';
import useAuthStore from '../../store/authStore';
import { inr, inrCompact, Badge } from './DashKPI';
import dayjs from 'dayjs';

const PO_STATUS_CLS = {
  draft:         'bg-gray-100 text-gray-600',
  pending:       'bg-amber-100 text-amber-700',
  approved:      'bg-emerald-100 text-emerald-700',
  received:      'bg-blue-100 text-blue-700',
  cancelled:     'bg-red-100 text-red-700',
  verified_audit:'bg-sky-100 text-sky-700',
  released_mgmt: 'bg-violet-100 text-violet-700',
  part_received: 'bg-cyan-100 text-cyan-700',
};
const WO_STATUS_CLS = {
  draft:      'bg-gray-100 text-gray-600',
  pending:    'bg-amber-100 text-amber-700',
  approved:   'bg-emerald-100 text-emerald-700',
  active:     'bg-teal-100 text-teal-700',
  completed:  'bg-blue-100 text-blue-700',
  terminated: 'bg-red-100 text-red-700',
};

// ─── Zoho-style KPI card ─────────────────────────────────────────────────────
function ZKpi({ icon: Icon, label, value, sub, color = 'blue', to }) {
  const palette = {
    blue:   { border: '#1573B3', icon: '#EBF4FB', iconText: '#1573B3' },
    green:  { border: '#29A55A', icon: '#E8F7ED', iconText: '#29A55A' },
    orange: { border: '#F07C25', icon: '#FEF3E7', iconText: '#F07C25' },
    red:    { border: '#D74C4C', icon: '#FCEAEA', iconText: '#D74C4C' },
    purple: { border: '#7B6CF6', icon: '#F0EFFE', iconText: '#7B6CF6' },
    teal:   { border: '#0EA5A0', icon: '#E6F7F7', iconText: '#0EA5A0' },
    indigo: { border: '#4361EE', icon: '#EEF1FE', iconText: '#4361EE' },
  };
  const c = palette[color] || palette.blue;
  const Wrap = to ? Link : 'div';
  return (
    <Wrap to={to} className="block bg-white rounded border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all"
      style={{ borderLeft: `3px solid ${c.border}` }}>
      <div className="p-3.5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded flex items-center justify-center flex-shrink-0"
            style={{ background: c.icon }}>
            <Icon size={16} style={{ color: c.iconText }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[22px] font-bold leading-none text-[#1D2B3A] truncate">{value}</div>
            <div className="text-[11px] text-gray-500 mt-1 font-medium truncate">{label}</div>
            {sub && <div className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</div>}
          </div>
        </div>
      </div>
    </Wrap>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
function ZSection({ title, action, children, noPad }) {
  return (
    <div className="bg-white rounded border border-gray-200">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <span className="text-[12px] font-semibold text-[#1D2B3A]">{title}</span>
        {action && <span className="text-[11px] text-[#1573B3] flex items-center gap-0.5 hover:underline cursor-pointer">{action}</span>}
      </div>
      <div className={noPad ? '' : 'p-0'}>{children}</div>
    </div>
  );
}

// ─── Compact table ────────────────────────────────────────────────────────────
function ZTable({ cols, rows, empty = 'No records', to }) {
  if (!rows?.length) return (
    <div className="py-8 text-center text-[12px] text-gray-400">{empty}</div>
  );
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px]">
        <thead>
          <tr className="bg-[#F8F9FB]">
            {cols.map(c => (
              <th key={c.key} className={`px-3.5 py-2 text-[11px] font-semibold text-gray-500 ${c.right ? 'text-right' : 'text-left'} whitespace-nowrap border-b border-gray-100`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className={`${i % 2 === 1 ? 'bg-[#FAFBFC]' : 'bg-white'} hover:bg-blue-50 transition-colors`}>
              {cols.map(c => (
                <td key={c.key} className={`px-3.5 py-2 text-[12px] text-[#1D2B3A] border-b border-gray-50 ${c.right ? 'text-right' : ''} ${c.cls || ''}`}>
                  {c.render ? c.render(row) : (row[c.key] ?? <span className="text-gray-400">—</span>)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Pipeline step ────────────────────────────────────────────────────────────
function PipelineStep({ label, count, color, last }) {
  const colors = {
    gray:    { bg: '#F3F4F6', text: '#374151', dot: '#9CA3AF' },
    amber:   { bg: '#FEF3C7', text: '#92400E', dot: '#F59E0B' },
    blue:    { bg: '#DBEAFE', text: '#1E40AF', dot: '#3B82F6' },
    violet:  { bg: '#EDE9FE', text: '#5B21B6', dot: '#7C3AED' },
    emerald: { bg: '#D1FAE5', text: '#065F46', dot: '#10B981' },
    cyan:    { bg: '#CFFAFE', text: '#155E75', dot: '#06B6D4' },
    green:   { bg: '#DCFCE7', text: '#166534', dot: '#22C55E' },
  };
  const c = colors[color] || colors.gray;
  return (
    <div className="flex items-center">
      <div className="flex flex-col items-center min-w-[80px]">
        <div className="text-[20px] font-bold text-[#1D2B3A]">{count}</div>
        <div className="flex items-center gap-1 mt-1">
          <span className="w-2 h-2 rounded-full" style={{ background: c.dot }} />
          <span className="text-[10px] font-medium text-gray-500 text-center leading-tight whitespace-nowrap">{label}</span>
        </div>
      </div>
      {!last && <ChevronRight size={14} className="text-gray-300 mx-1 flex-shrink-0" />}
    </div>
  );
}

const CHART_COLORS = ['#1573B3', '#29A55A', '#F07C25', '#D74C4C', '#7B6CF6', '#0EA5A0'];

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded shadow-md px-3 py-2 text-[12px]">
      <p className="font-semibold text-[#1D2B3A] mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: <span className="font-bold">{p.value}</span></p>
      ))}
    </div>
  );
};

export default function ProcurementDashboard() {
  const { user } = useAuthStore();
  const thisMonth = dayjs().format('YYYY-MM');

  const { data: pos = [], isLoading: loadP, refetch: refetchP } = useQuery({
    queryKey: ['proc-dash-pos'],
    queryFn: () => poAPI.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); }),
  });
  const { data: quotations = [], isLoading: loadQ } = useQuery({
    queryKey: ['proc-dash-quotations'],
    queryFn: () => quotationAPI.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); }),
  });
  const { data: vendors = [] } = useQuery({
    queryKey: ['proc-dash-vendors'],
    queryFn: () => vendorAPI.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); }),
  });
  const { data: wos = [] } = useQuery({
    queryKey: ['proc-dash-wos'],
    queryFn: () => subcontractorAPI.listWorkOrders().then(r => r.data?.data ?? []),
  });
  const { data: mrsList = [] } = useQuery({
    queryKey: ['proc-dash-mrs'],
    queryFn: () => mrsAPI.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); }),
  });
  const { data: lowStock = [] } = useQuery({
    queryKey: ['proc-dash-low-stock'],
    queryFn: () => inventoryAPI.lowStock().then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); }),
  });

  const pendingPOs   = pos.filter(p => p.status === 'pending');
  const auditOKPOs   = pos.filter(p => p.status === 'verified_audit');
  const releasedPOs  = pos.filter(p => p.status === 'released_mgmt');
  const approvedPOs  = pos.filter(p => p.status === 'approved');
  const receivingPOs = pos.filter(p => p.status === 'part_received');
  const receivedPOs  = pos.filter(p => p.status === 'received' || p.status === 'fully_received');
  const thisMonthPOs = pos.filter(p => dayjs(p.po_date || p.created_at).format('YYYY-MM') === thisMonth);
  const poValueMonth = thisMonthPOs.reduce((s, p) => s + parseFloat(p.grand_total || p.total_amount || 0), 0);
  const poValueTotal = pos.reduce((s, p) => s + parseFloat(p.grand_total || p.total_amount || 0), 0);
  const pendingQuotes= quotations.filter(q => q.status === 'sent' || q.status === 'draft');
  const pendingWOs   = wos.filter(w => w.status === 'pending' || w.status === 'draft');
  const activeWOs    = wos.filter(w => ['submitted', 'approved', 'active'].includes(w.status));
  const thisMonthWOs = wos.filter(w => dayjs(w.wo_date || w.created_at).format('YYYY-MM') === thisMonth);
  const woValueTotal = wos.reduce((s, w) => s + parseFloat(w.total_value || 0), 0);
  const pendingMRS   = mrsList.filter(m => m.status === 'pending' || m.status === 'draft');

  const poStatusChartData = [
    { name: 'Pending', value: pendingPOs.length },
    { name: 'Audit OK', value: auditOKPOs.length },
    { name: 'Released', value: releasedPOs.length },
    { name: 'Authorized', value: approvedPOs.length },
    { name: 'Receiving', value: receivingPOs.length },
    { name: 'Received', value: receivedPOs.length },
  ].filter(d => d.value > 0);

  const spendPieData = [
    { name: 'PO Spend', value: Math.round(poValueTotal) },
    { name: 'WO Spend', value: Math.round(woValueTotal) },
  ].filter(d => d.value > 0);

  const poCols = [
    { key: 'po_number',   label: 'PO #',   cls: 'font-mono text-[11px] text-[#1573B3]' },
    { key: 'vendor_name', label: 'Vendor', cls: 'max-w-[110px] truncate font-medium' },
    { key: 'grand_total', label: 'Value',  right: true, render: r => inrCompact(r.grand_total || r.total_amount) },
    { key: 'po_date',     label: 'Date',   render: r => r.po_date ? dayjs(r.po_date).format('DD MMM') : '—' },
    { key: 'status',      label: 'Status', render: r => <Badge label={r.status || 'draft'} cls={`text-[10px] px-1.5 py-0.5 rounded ${PO_STATUS_CLS[r.status] || PO_STATUS_CLS.draft}`} /> },
  ];
  const woCols = [
    { key: 'wo_number',   label: 'WO #',      cls: 'font-mono text-[11px] text-[#1573B3]' },
    { key: 'vendor_name', label: 'Contractor', cls: 'max-w-[110px] truncate font-medium' },
    { key: 'total_value', label: 'Value',      right: true, render: r => inrCompact(r.total_value) },
    { key: 'status',      label: 'Status',     render: r => <Badge label={r.status || 'draft'} cls={`text-[10px] px-1.5 py-0.5 rounded ${WO_STATUS_CLS[r.status] || WO_STATUS_CLS.draft}`} /> },
  ];
  const qtCols = [
    { key: 'quotation_number', label: 'Ref',     cls: 'font-mono text-[11px] text-[#1573B3]' },
    { key: 'vendor_name',      label: 'Vendor',  cls: 'max-w-[110px] truncate font-medium' },
    { key: 'subject',          label: 'Material',cls: 'max-w-[120px] truncate' },
    { key: 'created_at',       label: 'Date',    render: r => r.created_at ? dayjs(r.created_at).format('DD MMM') : '—' },
  ];
  const mrsCols = [
    { key: 'mrs_number',   label: 'MRS #',   cls: 'font-mono text-[11px] text-[#1573B3]' },
    { key: 'project_name', label: 'Project', cls: 'max-w-[110px] truncate font-medium' },
    { key: 'created_at',   label: 'Date',    render: r => r.created_at ? dayjs(r.created_at).format('DD MMM') : '—' },
    { key: 'status',       label: 'Status',  render: r => <Badge label={r.status || 'draft'} cls="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700" /> },
  ];

  return (
    <div className="min-h-full" style={{ background: '#F5F6FA' }}>
      {/* ── Header ── */}
      <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mb-0.5">
            <span>Dashboards</span>
            <ChevronRight size={11} />
            <span className="text-[#1573B3] font-medium">Procurement</span>
          </div>
          <h1 className="text-[15px] font-bold text-[#1D2B3A] leading-none">
            {dayjs().hour() < 12 ? 'Good morning' : dayjs().hour() < 17 ? 'Good afternoon' : 'Good evening'}, {user?.name?.split(' ')[0]}
          </h1>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-gray-400">
          <span>{dayjs().format('dddd, D MMMM YYYY')}</span>
          <button onClick={() => refetchP()} className="flex items-center gap-1 px-2.5 py-1.5 rounded border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors text-gray-500">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">

        {/* ── KPI row ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <ZKpi icon={ShoppingCart} label="POs This Month"  value={thisMonthPOs.length}    sub={inrCompact(poValueMonth)} color="blue"   to="/procurement/po" />
          <ZKpi icon={IndianRupee}  label="Total PO Spend"  value={inrCompact(poValueTotal)} sub={`${pos.length} orders`}   color="indigo" to="/procurement/po-register" />
          <ZKpi icon={Hammer}       label="Total WO Spend"  value={inrCompact(woValueTotal)} sub={`${wos.length} WOs`}      color="purple" to="/procurement/work-orders" />
          <ZKpi icon={TrendingUp}   label="Quotes Pending"  value={pendingQuotes.length}   sub="Awaiting evaluation"       color="orange" to="/procurement/quotations" />
          <ZKpi icon={ClipboardList} label="MRS Pending"    value={pendingMRS.length}      sub="Awaiting approval"         color="teal"   to="/procurement/material-request" />
          <ZKpi icon={Users}        label="Vendors"         value={vendors.length}         sub="Registered"                color="green"  to="/procurement/vendors" />
        </div>

        {/* ── PO Pipeline ── */}
        <ZSection title="Purchase Order Pipeline">
          <div className="px-4 py-3 flex items-center flex-wrap gap-y-2">
            <PipelineStep label="Pending Audit" count={pendingPOs.length}   color="amber"   />
            <PipelineStep label="Audit OK"      count={auditOKPOs.length}   color="blue"    />
            <PipelineStep label="Mgmt Released" count={releasedPOs.length}  color="violet"  />
            <PipelineStep label="Authorized"    count={approvedPOs.length}  color="emerald" />
            <PipelineStep label="Receiving"     count={receivingPOs.length} color="cyan"    />
            <PipelineStep label="Received"      count={receivedPOs.length}  color="green"   last />
          </div>
        </ZSection>

        {/* ── Charts row ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          <ZSection title="PO Status Distribution">
            {poStatusChartData.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-gray-400">No PO data to chart</div>
            ) : (
              <div className="px-2 py-3" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={poStatusChartData} margin={{ top: 4, right: 16, left: -20, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F0F0F0" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="value" name="POs" radius={[3, 3, 0, 0]} fill="#1573B3" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </ZSection>

          <ZSection title="Procurement Spend Split (PO vs WO)">
            {spendPieData.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-gray-400">No spend data</div>
            ) : (
              <div className="px-2 py-3" style={{ height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={spendPieData} cx="40%" cy="50%" innerRadius={55} outerRadius={80}
                      dataKey="value" nameKey="name" paddingAngle={3}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}>
                      {spendPieData.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Tooltip formatter={(v) => inrCompact(v)} content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      return (
                        <div className="bg-white border border-gray-200 rounded shadow-md px-3 py-2 text-[12px]">
                          <p className="font-semibold text-[#1D2B3A]">{payload[0].name}</p>
                          <p style={{ color: payload[0].payload.fill }}>{inrCompact(payload[0].value)}</p>
                        </div>
                      );
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </ZSection>
        </div>

        {/* ── POs + WOs tables ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ZSection
            title="Recent Purchase Orders"
            action={<Link to="/procurement/po" className="flex items-center gap-0.5">View All <ArrowRight size={11} /></Link>}
          >
            <ZTable cols={poCols} rows={pos.slice(0, 7)} empty="No purchase orders found" />
          </ZSection>

          <ZSection
            title="Recent Work Orders"
            action={<Link to="/procurement/work-orders" className="flex items-center gap-0.5">View All <ArrowRight size={11} /></Link>}
          >
            <ZTable cols={woCols} rows={wos.slice(0, 7)} empty="No work orders found" />
          </ZSection>
        </div>

        {/* ── Quotations + MRS ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ZSection
            title={`Quotations Pending Evaluation${pendingQuotes.length ? ` (${pendingQuotes.length})` : ''}`}
            action={<Link to="/procurement/quotations" className="flex items-center gap-0.5">View All <ArrowRight size={11} /></Link>}
          >
            <ZTable cols={qtCols} rows={pendingQuotes.slice(0, 7)} empty="No pending quotations" />
          </ZSection>

          <ZSection
            title={`Material Requests Pending${pendingMRS.length ? ` (${pendingMRS.length})` : ''}`}
            action={<Link to="/procurement/material-request" className="flex items-center gap-0.5">View All <ArrowRight size={11} /></Link>}
          >
            <ZTable cols={mrsCols} rows={pendingMRS.slice(0, 7)} empty="No pending material requests" />
          </ZSection>
        </div>

        {/* ── Work orders summary + Low stock + Vendor chips ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <ZSection title="Work Order Summary">
            <div className="divide-y divide-gray-50">
              {[
                { label: 'This Month', value: thisMonthWOs.length, color: '#1573B3' },
                { label: 'Pending Approval', value: pendingWOs.length, color: '#F07C25' },
                { label: 'Active WOs', value: activeWOs.length, color: '#29A55A' },
                { label: 'Total WO Value', value: inrCompact(woValueTotal), color: '#7B6CF6' },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-[12px] text-gray-500">{label}</span>
                  <span className="text-[14px] font-bold" style={{ color }}>{value}</span>
                </div>
              ))}
            </div>
          </ZSection>

          <ZSection title={`Low Stock Alerts${lowStock.length ? ` (${lowStock.length})` : ''}`}
            action={<Link to="/procurement/inventory" className="flex items-center gap-0.5">Inventory <ArrowRight size={11} /></Link>}>
            {lowStock.length === 0 ? (
              <div className="py-6 text-center">
                <CheckCircle2 size={24} className="mx-auto text-green-400 mb-1" />
                <p className="text-[12px] text-gray-400">All stock levels healthy</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {lowStock.slice(0, 5).map((item, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 gap-2">
                    <span className="text-[12px] font-medium text-[#1D2B3A] truncate">{item.item_name}</span>
                    <div className="text-right flex-shrink-0">
                      <span className="text-[11px] text-red-500 font-semibold">{item.current_stock ?? 0}</span>
                      <span className="text-[11px] text-gray-400"> / {item.reorder_level ?? '—'} {item.unit || ''}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ZSection>

          <ZSection title="Vendors"
            action={<Link to="/procurement/vendors" className="flex items-center gap-0.5">All ({vendors.length}) <ArrowRight size={11} /></Link>}>
            <div className="p-3 flex flex-wrap gap-1.5">
              {vendors.slice(0, 10).map(v => (
                <div key={v.id} className="px-2.5 py-1 rounded border border-gray-200 bg-[#F8F9FB] hover:border-[#1573B3] hover:bg-blue-50 cursor-pointer transition-colors">
                  <p className="text-[11px] font-medium text-[#1D2B3A] truncate max-w-[120px]">{v.name}</p>
                  <p className="text-[10px] text-gray-400">{v.vendor_type || 'Vendor'}</p>
                </div>
              ))}
              {vendors.length > 10 && (
                <div className="px-2.5 py-1 rounded border border-dashed border-gray-300 flex items-center">
                  <span className="text-[11px] text-gray-400">+{vendors.length - 10} more</span>
                </div>
              )}
            </div>
          </ZSection>
        </div>

      </div>
    </div>
  );
}
