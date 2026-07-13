// src/pages/dashboards/StoresDashboard.jsx — redesigned to match Procurement Dashboard style
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Truck, ClipboardList, AlertTriangle, PackageCheck, Clock, Plus,
  ArrowUpRight, Boxes, FileText, ChevronRight, RefreshCw,
  TrendingUp, Package, CheckCircle2, MoreVertical, Building2, IndianRupee,
} from 'lucide-react';
import { ignAPI, mrsAPI, minAPI, inventoryAPI } from '../../api/client';
import useAuthStore from '../../store/authStore';
import { PageHeader, Theme } from '../../theme';
import dayjs from 'dayjs';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

const MONTH_LABELS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

/* ── Status configs ─────────────────────────────────────────── */
const MRS_CFG = {
  pending:         { label: 'Pending',       color: '#f59e0b', bg: '#fffbeb' },
  stores_verified: { label: 'Stores ✓',      color: '#0ea5e9', bg: '#f0f9ff' },
  verified_tower:  { label: 'Tower ✓',       color: '#0ea5e9', bg: '#f0f9ff' },
  approved_pm:     { label: 'PM Approved',   color: '#6366f1', bg: '#eef2ff' },
  approved_srpm:   { label: 'Sr PM Approved',color: '#6366f1', bg: '#eef2ff' },
  approved_mgmt:   { label: 'Mgmt Approved', color: '#8b5cf6', bg: '#f5f3ff' },
  approved_md:     { label: 'MD Approved',   color: '#10b981', bg: '#f0fdf4' },
  issued:          { label: 'Issued',         color: '#14b8a6', bg: '#f0fdfa' },
  rejected:        { label: 'Rejected',       color: '#ef4444', bg: '#fff1f2' },
  draft:           { label: 'Draft',          color: '#94a3b8', bg: '#f8fafc' },
};

const IGN_CFG = {
  pending:   { label: 'Pending',   color: '#f59e0b', bg: '#fffbeb' },
  inspected: { label: 'Inspected', color: '#0ea5e9', bg: '#f0f9ff' },
  approved:  { label: 'Approved',  color: '#22c55e', bg: '#f0fdf4' },
  rejected:  { label: 'Rejected',  color: '#ef4444', bg: '#fff1f2' },
};

/* ── Helpers ─────────────────────────────────────────────────── */
const pctOf = (a, b) => b > 0 ? ((a / b) * 100).toFixed(1) : '0.0';

/* ── Sparkline ───────────────────────────────────────────────── */
function Sparkline({ data, color }) {
  if (!data?.length) return null;
  const w = 90, h = 36;
  const vals = data.map(Number);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - min) / range) * (h - 4) - 2}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <polyline points={`0,${h} ${pts} ${w},${h}`} fill={color} stroke="none" opacity={0.12} />
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

/* ── KPI Sparkline Card ──────────────────────────────────────── */
function KpiSparkCard({ icon: Icon, label, value, sub, color, accentBg, sparkData }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 18px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={15} style={{ color }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8' }}>{label}</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
          {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 5 }}>{sub}</div>}
        </div>
        <Sparkline data={sparkData} color={color} />
      </div>
    </div>
  );
}

/* ── Status progress row ─────────────────────────────────────── */
function StatusRow({ cfg, label, count, total }) {
  const w = total > 0 ? (count / total) * 100 : 0;
  const c = cfg || { label: label || '—', color: '#94a3b8', bg: '#f8fafc' };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
      <div style={{ width: 28, height: 28, borderRadius: 8, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, display: 'inline-block' }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 3 }}>{c.label}</div>
        <div style={{ height: 4, borderRadius: 999, background: '#f1f5f9' }}>
          <div style={{ height: '100%', borderRadius: 999, background: c.color, width: `${w}%`, transition: 'width .4s ease' }} />
        </div>
      </div>
      <span style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', minWidth: 24, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
      <span style={{ fontSize: 10, color: '#94a3b8', minWidth: 38, textAlign: 'right' }}>{pctOf(count, total)}%</span>
    </div>
  );
}

/* ── Inventory category bars ─────────────────────────────────── */
function CategoryRankRow({ rank, name, count, max, color }) {
  const w = max > 0 ? (count / max) * 100 : 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', borderBottom: '1px solid #f8fafc' }}>
      <span style={{ width: 18, fontSize: 11, fontWeight: 700, color: '#94a3b8', textAlign: 'center', flexShrink: 0 }}>{rank}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
        <div style={{ height: 3, borderRadius: 999, background: '#f1f5f9', marginTop: 4 }}>
          <div style={{ height: '100%', borderRadius: 999, background: color, width: `${w}%` }} />
        </div>
      </div>
      <span style={{ fontSize: 12, fontWeight: 800, color: '#0f172a', minWidth: 28, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
    </div>
  );
}

/* ── Main Dashboard ──────────────────────────────────────────── */
export default function StoresDashboard() {
  const now = dayjs();
  const { selectedProjectId, selectedProjectName } = useAuthStore();

  const projParam = selectedProjectId ? { project_id: selectedProjectId } : {};

  const { data: grns = [], isLoading: loadG, refetch: refetchG } = useQuery({
    queryKey: ['stores-dash-igns', selectedProjectId],
    queryFn: () => ignAPI.list(projParam).then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); }),
    staleTime: 0, refetchOnMount: 'always',
  });
  const { data: mrs = [], isLoading: loadM, refetch: refetchM } = useQuery({
    queryKey: ['stores-dash-mrs', selectedProjectId],
    queryFn: () => mrsAPI.list(projParam).then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); }),
    staleTime: 0, refetchOnMount: 'always',
  });
  const { data: issues = [], isLoading: loadI } = useQuery({
    queryKey: ['stores-dash-issues', selectedProjectId],
    queryFn: () => minAPI.list(projParam).then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); }),
    staleTime: 0, refetchOnMount: 'always',
  });
  const { data: inventory = [], isLoading: loadInv } = useQuery({
    queryKey: ['stores-dash-inventory'],
    queryFn: () => inventoryAPI.list().then(r => { const d = r.data; return Array.isArray(d) ? d : (d?.data ?? []); }),
    staleTime: 60000,
  });

  const refetch = () => { refetchG(); refetchM(); };
  const isLoading = loadG || loadM || loadI || loadInv;

  /* ── Derived MRS data ─────────────────────────────────────── */
  const MRS_CLOSED      = ['issued', 'rejected', 'draft'];
  const MRS_IN_APPROVAL = ['stores_verified','verified_tower','approved_pm','approved_srpm','approved_mgmt','approved_md'];
  const openMRS    = mrs.filter(m => !MRS_CLOSED.includes(m.status));
  const pendingMRS = mrs.filter(m => m.status === 'pending');
  const inApproval = mrs.filter(m => MRS_IN_APPROVAL.includes(m.status));
  const issuedMRS  = mrs.filter(m => m.status === 'issued');
  const recentMRS  = [...mrs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);

  /* ── MRS status buckets ─────────────────────────────────────── */
  const mrsStatusBuckets = useMemo(() => {
    const b = {};
    for (const m of mrs) {
      const s = m.status || 'pending';
      b[s] = (b[s] || 0) + 1;
    }
    return b;
  }, [mrs]);

  /* ── IGN derived ─────────────────────────────────────────── */
  const pendingGRNs   = grns.filter(g => g.status === 'pending');
  const inspectedGRNs = grns.filter(g => g.status === 'inspected');
  const awaitingGRNs  = [...pendingGRNs, ...inspectedGRNs];
  const approvedGRNs  = grns.filter(g => g.status === 'approved');

  /* ── Issues derived ─────────────────────────────────────── */
  const thisMonthIssues = issues.filter(i => dayjs(i.issue_date || i.created_at).isSame(now, 'month'));

  /* ── Inventory ─────────────────────────────────────────── */
  const lowStock   = inventory.filter(i => { const c = parseFloat(i.closing_stock ?? i.current_stock ?? 0); const m = parseFloat(i.min_stock ?? i.reorder_level ?? 0); return m > 0 && c <= m; });
  const outOfStock = inventory.filter(i => parseFloat(i.closing_stock ?? i.current_stock ?? 0) <= 0);

  const catCount = useMemo(() => {
    const m = {};
    for (const i of inventory) { const c = i.category || 'Other'; m[c] = (m[c] || 0) + 1; }
    return Object.entries(m).sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [inventory]);
  const CAT_COLORS = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#8b5cf6'];

  /* ── Monthly MRS trend ─────────────────────────────────── */
  const monthlyTrend = useMemo(() => {
    const monthData = {};
    for (const m of mrs) {
      const key = dayjs(m.created_at).format('YYYY-MM');
      monthData[key] = (monthData[key] || 0) + 1;
    }
    return Array.from({ length: 12 }, (_, i) => {
      const d = now.subtract(11 - i, 'month');
      const key = d.format('YYYY-MM');
      return { month: MONTH_LABELS[d.month()], count: monthData[key] || 0 };
    });
  }, [mrs]);

  const sparkMRS  = monthlyTrend.map(m => m.count);
  const sparkIGN  = [grns.length * 0.3, grns.length * 0.4, grns.length * 0.5, grns.length * 0.6, grns.length * 0.7, grns.length * 0.8, grns.length].map(Math.round);
  const sparkIss  = [issues.length * 0.4, issues.length * 0.5, issues.length * 0.6, issues.length * 0.7, issues.length * 0.8, issues.length * 0.9, thisMonthIssues.length].map(Math.round);

  const PAGE_SIZE = 6;
  const [page, setPage] = React.useState(1);
  const totalPages = Math.ceil(recentMRS.length / PAGE_SIZE);
  const pageMRS = recentMRS.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ background: '#f8fafc', minHeight: '100vh' }}>

      <PageHeader
        title="Stores Dashboard"
        subtitle="Inventory, IGN receipts, material requisitions & stock overview."
        breadcrumbs={[{ label: 'Stores' }, { label: 'Dashboard' }]}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={refetch} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <RefreshCw size={13} /> Refresh
            </button>
            <Link to="/stores/ign" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 12, fontWeight: 600, textDecoration: 'none' }}>
              <Truck size={13} /> New IGN
            </Link>
            <Link to="/stores/mrs" style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', borderRadius: 9, background: '#fff', color: Theme.navyDark, fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>
              <Plus size={13} /> New MRS
            </Link>
          </div>
        }
      />

      <div style={{ padding: '20px 24px', maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Project filter banner */}
        {selectedProjectId && (
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '9px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <Building2 size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1d4ed8' }}>Showing data for: {selectedProjectName}</span>
            <span style={{ fontSize: 12, color: '#64748b', marginLeft: 4 }}>— Switch the project from the top bar to view others</span>
          </div>
        )}

        {/* Last updated */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, fontSize: 11, color: '#94a3b8' }}>
          <Clock size={12} /> Last updated: {dayjs().format('hh:mm A, DD MMM YYYY')}
        </div>

        {/* KPI Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 14 }}>
          <KpiSparkCard icon={ClipboardList} label="Open MRS"          value={isLoading ? '—' : openMRS.length}          color="#6366f1" accentBg="#eef2ff" sparkData={sparkMRS} sub={`${mrs.length} total requisitions`} />
          <KpiSparkCard icon={Clock}         label="In Approval"       value={isLoading ? '—' : inApproval.length}       color="#f59e0b" accentBg="#fffbeb" sparkData={sparkMRS.map(v => v * 0.4)} sub="Awaiting sign-off" />
          <KpiSparkCard icon={PackageCheck}  label="Issued"            value={isLoading ? '—' : issuedMRS.length}        color="#22c55e" accentBg="#dcfce7" sparkData={sparkMRS.map(v => v * 0.3)} sub="MRS fulfilled" />
          <KpiSparkCard icon={Truck}         label="IGN Pending"       value={isLoading ? '—' : awaitingGRNs.length}     color="#0891b2" accentBg="#e0f2fe" sparkData={sparkIGN} sub={`${grns.length} total IGNs`} />
          <KpiSparkCard icon={ArrowUpRight}  label="Issues This Month" value={isLoading ? '—' : thisMonthIssues.length}  color="#14b8a6" accentBg="#f0fdfa" sparkData={sparkIss} sub={`${issues.length} total issues`} />
          <KpiSparkCard icon={AlertTriangle} label="Low Stock Alerts"  value={isLoading ? '—' : lowStock.length}         color="#ef4444" accentBg="#fee2e2" sparkData={[lowStock.length, outOfStock.length, lowStock.length, lowStock.length, lowStock.length, lowStock.length, lowStock.length]} sub={`${outOfStock.length} out of stock`} />
        </div>

        {/* Alerts */}
        {(lowStock.length > 0 || awaitingGRNs.length > 0) && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {lowStock.length > 0 && (
              <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <AlertTriangle size={14} style={{ color: '#d97706', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>{lowStock.length} item{lowStock.length > 1 ? 's' : ''} at or below reorder level — restock needed</span>
                <Link to="/stores/ledger" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#d97706', textDecoration: 'none' }}>View Ledger →</Link>
              </div>
            )}
            {awaitingGRNs.length > 0 && (
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={14} style={{ color: '#2563eb', flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1e40af' }}>{awaitingGRNs.length} IGN{awaitingGRNs.length > 1 ? 's' : ''} pending approval</span>
                <Link to="/stores/ign" style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 700, color: '#2563eb', textDecoration: 'none' }}>Review →</Link>
              </div>
            )}
          </div>
        )}

        {/* 3-column analytics */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>

          {/* MRS Status Summary */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>MRS Pipeline</h3>
              <Link to="/stores/mrs" style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textDecoration: 'none' }}>View All</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Pending',     count: pendingMRS.length,  color: '#f59e0b', bg: '#fffbeb' },
                { label: 'In Approval', count: inApproval.length,  color: '#6366f1', bg: '#eef2ff' },
                { label: 'Issued',      count: issuedMRS.length,   color: '#22c55e', bg: '#dcfce7' },
              ].map(({ label, count, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color }}>{count}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            {Object.keys(mrsStatusBuckets).length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>No requisitions</div>
            ) : (
              Object.entries(mrsStatusBuckets).sort((a, b) => b[1] - a[1]).map(([status, count]) => (
                <StatusRow key={status} cfg={MRS_CFG[status]} label={status} count={count} total={mrs.length} />
              ))
            )}
          </div>

          {/* IGN Status */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>IGN Status</h3>
              <Link to="/stores/ign" style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textDecoration: 'none' }}>View All</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Total IGNs',  count: grns.length,          color: '#64748b', bg: '#f8fafc' },
                { label: 'Awaiting',    count: awaitingGRNs.length,   color: '#f59e0b', bg: '#fffbeb' },
                { label: 'Approved',    count: approvedGRNs.length,   color: '#22c55e', bg: '#dcfce7' },
                { label: 'Issues',      count: thisMonthIssues.length, color: '#14b8a6', bg: '#f0fdfa' },
              ].map(({ label, count, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color }}>{count}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            {[
              { status: 'pending',   count: pendingGRNs.length },
              { status: 'inspected', count: inspectedGRNs.length },
              { status: 'approved',  count: approvedGRNs.length },
            ].map(({ status, count }) => (
              <StatusRow key={status} cfg={IGN_CFG[status]} label={status} count={count} total={grns.length} />
            ))}
            {grns.length === 0 && <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>No IGNs</div>}
            {awaitingGRNs.length > 0 && (
              <Link to="/stores/ign" style={{ display: 'block', marginTop: 12, textAlign: 'center', padding: '8px 0', borderRadius: 10, background: '#fffbeb', color: '#d97706', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                Review {awaitingGRNs.length} pending →
              </Link>
            )}
          </div>

          {/* Inventory by Category */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Inventory</h3>
              <Link to="/stores/ledger" style={{ fontSize: 11, fontWeight: 700, color: '#6366f1', textDecoration: 'none' }}>Ledger</Link>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 16 }}>
              {[
                { label: 'Total Items', count: inventory.length,   color: '#64748b', bg: '#f8fafc' },
                { label: 'Low Stock',   count: lowStock.length,    color: lowStock.length > 0 ? '#ef4444' : '#22c55e', bg: lowStock.length > 0 ? '#fee2e2' : '#dcfce7' },
                { label: 'Out of Stock',count: outOfStock.length,  color: outOfStock.length > 0 ? '#dc2626' : '#22c55e', bg: outOfStock.length > 0 ? '#fee2e2' : '#dcfce7' },
              ].map(({ label, count, color, bg }) => (
                <div key={label} style={{ background: bg, borderRadius: 10, padding: '10px 8px', textAlign: 'center' }}>
                  <div style={{ fontSize: 18, fontWeight: 900, color }}>{count}</div>
                  <div style={{ fontSize: 9, fontWeight: 700, color, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{label}</div>
                </div>
              ))}
            </div>
            {catCount.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: 13 }}>No inventory</div>
            ) : catCount.map(([cat, count], i) => (
              <CategoryRankRow key={cat} rank={i + 1} name={cat} count={count} max={catCount[0][1]} color={CAT_COLORS[i]} />
            ))}
            {outOfStock.length > 0 && (
              <Link to="/stores/ledger" style={{ display: 'block', marginTop: 12, textAlign: 'center', padding: '8px 0', borderRadius: 10, background: '#fee2e2', color: '#dc2626', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
                {outOfStock.length} item{outOfStock.length > 1 ? 's' : ''} out of stock →
              </Link>
            )}
          </div>
        </div>

        {/* Recent MRS table */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Recent Material Requisitions</h3>
            <Link to="/stores/mrs" style={{ fontSize: 12, fontWeight: 700, color: '#6366f1', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>
              View All <ChevronRight size={13} />
            </Link>
          </div>
          {isLoading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4,5].map(n => <div key={n} style={{ height: 44, background: '#f1f5f9', borderRadius: 10 }} />)}
            </div>
          ) : (
            <>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      {['MRS No.', 'Project', 'Requested By', 'Items', 'Created', 'Status', 'Action'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pageMRS.map(m => {
                      const cfg = MRS_CFG[m.status] || { label: m.status, color: '#94a3b8', bg: '#f8fafc' };
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #f8fafc' }}>
                          <td style={{ padding: '12px 16px' }}>
                            <Link to="/stores/mrs" style={{ fontSize: 13, fontWeight: 700, color: '#6366f1', textDecoration: 'none', fontFamily: 'monospace' }}>
                              {m.serial_no_formatted || m.mrs_number || m.id?.slice(0, 8)}
                            </Link>
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#374151', fontWeight: 600, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {m.project_name || '—'}
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{m.requested_by || m.created_by || '—'}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{m.items?.length || 0} item{(m.items?.length || 0) !== 1 ? 's' : ''}</td>
                          <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8' }}>{dayjs(m.created_at).format('DD MMM YYYY')}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}22` }}>
                              {cfg.label}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <Link to="/stores/mrs" style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0', background: '#f8fafc', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', textDecoration: 'none' }}>
                              <ChevronRight size={13} />
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                    {recentMRS.length === 0 && (
                      <tr><td colSpan={7} style={{ padding: '40px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                        No requisitions — <Link to="/stores/mrs" style={{ color: '#6366f1', fontWeight: 700, textDecoration: 'none' }}>create one</Link>
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              {recentMRS.length > PAGE_SIZE && (
                <div style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, color: '#64748b' }}>
                    Showing {Math.min((page-1)*PAGE_SIZE+1, recentMRS.length)} to {Math.min(page*PAGE_SIZE, recentMRS.length)} of {recentMRS.length}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => (
                      <button key={i+1} onClick={() => setPage(i+1)}
                        style={{ width: 30, height: 30, borderRadius: 7, border: `1px solid ${page===i+1?'#6366f1':'#e2e8f0'}`, background: page===i+1?'#6366f1':'#fff', color: page===i+1?'#fff':'#64748b', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                        {i+1}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Monthly MRS Trend + Low Stock */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>

          {/* Monthly Trend */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 800, color: '#0f172a', margin: 0 }}>Monthly MRS Activity</h3>
            </div>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrend} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={v => [v, 'MRS Count']} labelStyle={{ fontSize: 12, fontWeight: 700 }} contentStyle={{ border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid #f1f5f9' }}>
              {[
                { label: 'Total MRS', value: mrs.length },
                { label: 'This Month', value: monthlyTrend[11]?.count || 0 },
                { label: 'Last Month', value: monthlyTrend[10]?.count || 0 },
              ].map(({ label, value }) => (
                <div key={label}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 4 }}>{label}</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#0f172a' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Low Stock Table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h3 style={{ fontSize: 14, fontWeight: 800, color: '#0f172a', margin: 0 }}>Low Stock Alerts</h3>
              <Link to="/stores/ledger" style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textDecoration: 'none' }}>View All</Link>
            </div>
            {lowStock.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 180, gap: 10 }}>
                <CheckCircle2 size={32} style={{ color: '#22c55e', opacity: 0.4 }} />
                <span style={{ fontSize: 13, color: '#94a3b8', fontWeight: 500 }}>All items well-stocked</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, overflowY: 'auto', maxHeight: 280 }}>
                {lowStock.slice(0, 10).map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f8fafc', gap: 8 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.material_name || '—'}</div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>{item.category || '—'} · {item.unit || ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#ef4444' }}>
                        {parseFloat(item.closing_stock ?? item.current_stock ?? 0).toFixed(1)}
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8' }}>
                        min: {parseFloat(item.min_stock ?? item.reorder_level ?? 0).toFixed(1)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
