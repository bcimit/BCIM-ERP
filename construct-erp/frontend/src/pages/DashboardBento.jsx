// src/pages/DashboardBento.jsx
// Bento-grid executive dashboard — asymmetric tiles, hero portfolio-health score,
// compact Indian currency, live refresh, role-based routing for non-admins.
import React, { Suspense, lazy, useMemo, useState, useEffect, useCallback } from 'react';
import { motion, animate } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ResponsiveContainer, AreaChart, Area,
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
} from 'recharts';
import {
  Building2, IndianRupee, Shield, Receipt, TrendingUp,
  AlertTriangle, RefreshCw, Package, CheckCircle2,
  Clock, Wallet, FileWarning, HardHat, FileText,
  ClipboardList, Zap, ChevronRight, Heart, Sparkles,
  Users, Activity,
} from 'lucide-react';
import { projectAPI, analyticsAPI, tqsBillsAPI } from '../api/client';
import useAuthStore from '../store/authStore';
import dayjs from 'dayjs';

const PMDashboard           = lazy(() => import('./dashboards/PMDashboard'));
const SiteEngineerDashboard = lazy(() => import('./dashboards/SiteEngineerDashboard'));
const QSDashboard           = lazy(() => import('./dashboards/QSDashboard'));
const AccountsDashboard     = lazy(() => import('./dashboards/AccountsDashboard'));
const HRDashboard           = lazy(() => import('./dashboards/HRDashboard'));
const HSEDashboard          = lazy(() => import('./dashboards/HSEDashboard'));
const StoresDashboard       = lazy(() => import('./dashboards/StoresDashboard'));
const ProcurementDashboard  = lazy(() => import('./dashboards/ProcurementDashboard'));

const PIE_COLORS = ['#6366f1', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444'];

// ─── Helpers ───────────────────────────────────────────────────────────────
const inr = (v) => `₹${(parseFloat(v) || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const inrCompact = (v) => {
  const n = Math.abs(parseFloat(v) || 0);
  const sign = (parseFloat(v) || 0) < 0 ? '-' : '';
  if (n >= 1e7)  return `${sign}₹${(n / 1e7).toFixed(n >= 1e8 ? 1 : 2)} Cr`;
  if (n >= 1e5)  return `${sign}₹${(n / 1e5).toFixed(n >= 1e6 ? 1 : 2)} L`;
  if (n >= 1e3)  return `${sign}₹${(n / 1e3).toFixed(1)} K`;
  return `${sign}₹${n.toFixed(0)}`;
};

const relTime = (date) => {
  if (!date) return '—';
  const diff = Math.max(0, (Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 5)    return 'just now';
  if (diff < 60)   return `${Math.floor(diff)}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
  return `${Math.floor(diff / 86400)} d ago`;
};

const toArray = (r) => Array.isArray(r?.data) ? r.data : (Array.isArray(r?.data?.data) ? r.data?.data : []);

const getRangeBounds = (range) => {
  if (range === 'all') return { dateFrom: null, dateTo: null };
  const now = dayjs();
  const map = { '7d': 6, '30d': 29, '90d': 89, '1y': 364 };
  const days = map[range] ?? 29;
  return { dateFrom: now.subtract(days, 'day').format('YYYY-MM-DD'), dateTo: now.format('YYYY-MM-DD') };
};

// Animated counter (no re-renders during anim)
function AnimatedNumber({ target, format }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const c = animate(0, parseFloat(target) || 0, { duration: 1.2, ease: 'easeOut', onUpdate: setVal });
    return c.stop;
  }, [target]);
  return <>{format ? format(val) : Math.round(val)}</>;
}

function DashLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', background: '#f6f8fb' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        style={{ width: 32, height: 32, border: '3px solid rgba(99,102,241,0.2)', borderTopColor: '#6366f1', borderRadius: '50%' }} />
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'rgba(15,23,42,0.94)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontSize: 11, boxShadow: '0 6px 24px rgba(0,0,0,0.25)' }}>
      {label && <p style={{ margin: 0, fontWeight: 700, marginBottom: 4, color: '#cbd5e1' }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ margin: '2px 0', color: p.color }}>
          {p.name}: {typeof p.value === 'number' && Math.abs(p.value) >= 1000 ? inrCompact(p.value) : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Tile primitives ───────────────────────────────────────────────────────
function Tile({ to, className = '', children, span = '', loading = false, hover = true, style }) {
  const cls = `tile ${span} ${className} ${hover ? 'tile-hover' : ''}`.trim();
  if (loading) return <div className={cls} style={style}><div className="tile-skeleton" /></div>;
  const content = <div className={cls} style={style}>{children}</div>;
  return to ? <Link to={to} style={{ textDecoration: 'none', color: 'inherit' }}>{content}</Link> : content;
}

function TileHeader({ title, action, to, icon: Icon }) {
  return (
    <div className="tile-header">
      <div className="tile-title">
        {Icon && <Icon size={13} className="tile-title-icon" />}
        <span>{title}</span>
      </div>
      {action && to && (
        <Link to={to} className="tile-action">
          {action} <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

function StatTile({ to, title, value, sub, icon: Icon, accent = '#6366f1', loading = false, compact = true }) {
  return (
    <Tile to={to} loading={loading}>
      <div className="stat-tile">
        <div className="stat-icon-wrap" style={{ background: `${accent}14`, color: accent }}>
          <Icon size={16} />
        </div>
        <div className="stat-label" title={typeof value === 'number' ? inr(value) : undefined}>{title}</div>
        <div className="stat-value" style={{ color: '#0f172a' }}>
          {typeof value === 'number'
            ? <AnimatedNumber target={value} format={v => compact ? inrCompact(v) : Math.round(v).toLocaleString('en-IN')} />
            : value}
        </div>
        {sub && <div className="stat-sub">{sub}</div>}
      </div>
    </Tile>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

// ─── Main ──────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user } = useAuthStore();
  const role = user?.role || '';
  const dept = (user?.department || '').toLowerCase();

  // ── Role-based routing (non-admins get role dashboard) ──
  if (!['super_admin', 'admin'].includes(role)) {
    let RoleDash = null;
    if (role === 'project_manager')      RoleDash = PMDashboard;
    else if (role === 'site_engineer')   RoleDash = SiteEngineerDashboard;
    else if (role === 'qs_engineer')     RoleDash = QSDashboard;
    else if (role === 'accountant')      RoleDash = AccountsDashboard;
    else if (role === 'hr')              RoleDash = HRDashboard;
    else if (role === 'hse_officer')     RoleDash = HSEDashboard;
    else if (dept.includes('store'))     RoleDash = StoresDashboard;
    else if (dept.includes('procurement') || dept.includes('purchase')) RoleDash = ProcurementDashboard;
    if (RoleDash) return <Suspense fallback={<DashLoader />}><RoleDash /></Suspense>;
  }

  // ── State ──
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [selectedBusinessUnit, setSelectedBusinessUnit] = useState('all');
  const [lastRefreshed, setLastRefreshed] = useState(() => new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [, forceTick] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    setLastRefreshed(new Date());
  }, []);

  useEffect(() => {
    const id = setInterval(() => forceTick(t => t + 1), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(handleRefresh, 120000);
    return () => clearInterval(id);
  }, [autoRefresh, handleRefresh]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') { e.preventDefault(); handleRefresh(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleRefresh]);

  const dateBounds = useMemo(() => getRangeBounds(selectedDateRange), [selectedDateRange]);
  const executiveParams = useMemo(() => ({
    project_id: selectedProjectId !== 'all' ? selectedProjectId : undefined,
    business_unit: selectedBusinessUnit !== 'all' ? selectedBusinessUnit : undefined,
    date_from: dateBounds.dateFrom || undefined,
    date_to: dateBounds.dateTo || undefined,
  }), [selectedProjectId, selectedBusinessUnit, dateBounds.dateFrom, dateBounds.dateTo]);

  const tqsBillsParams = useMemo(() => ({
    project_id: selectedProjectId !== 'all' ? selectedProjectId : undefined,
    from_date:  dateBounds.dateFrom || undefined,
    to_date:    dateBounds.dateTo   || undefined,
    limit:      500,
  }), [selectedProjectId, dateBounds.dateFrom, dateBounds.dateTo]);

  // ── Data ──
  const { data: dashboard, isLoading: dashboardLoading } = useQuery({
    queryKey: ['analytics-executive', refreshKey, executiveParams],
    queryFn: () => analyticsAPI.executive(executiveParams).then(r => r.data?.data || null).catch(() => null),
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  const { data: companyProjects = [] } = useQuery({
    queryKey: ['dashboard-projects-fallback'],
    queryFn: () => projectAPI.list().then(toArray).catch(() => []),
    staleTime: 5 * 60 * 1000,
  });

  const { data: tqsBills = [] } = useQuery({
    queryKey: ['dashboard-tqs-bills', refreshKey, tqsBillsParams],
    queryFn: () => tqsBillsAPI.list(tqsBillsParams).then(r => Array.isArray(r.data) ? r.data : (r.data?.data ?? [])).catch(() => []),
    staleTime: 60 * 1000,
  });

  // ── Derived ──
  const dashboardProjects   = dashboard?.projects || [];
  const filterOptions       = dashboard?.filters?.options || {};
  const projectOptions      = filterOptions.projects?.length ? filterOptions.projects : companyProjects.map(p => ({ id: p.id, name: p.name, project_code: p.project_code, type: p.type }));
  const businessUnitOptions = filterOptions.business_units?.length ? filterOptions.business_units : [...new Set(companyProjects.map(p => p.type).filter(Boolean))].sort();
  const dashboardKpis       = dashboard?.kpis || {};
  const dashboardCharts     = dashboard?.charts || {};
  const dashboardRecent     = dashboard?.recent || {};
  const dashboardWatchlists = dashboard?.watchlists || {};
  const dashboardPulse      = dashboard?.pulse || {};
  const dashboardExceptions = dashboard?.exceptions || [];

  const safeProjects  = Array.isArray(dashboardProjects) ? dashboardProjects : [];
  const safePayments  = Array.isArray(dashboardRecent.payments) ? dashboardRecent.payments : [];
  const safeDocs      = Array.isArray(dashboardRecent.documents) ? dashboardRecent.documents : [];

  const lowStockCount         = dashboardKpis.low_stock_count ?? dashboardPulse?.procurement_stores?.low_stock_materials ?? 0;
  const workforceCount        = dashboardKpis.workforce_count ?? 0;
  const openIncidents         = dashboardKpis.open_incidents ?? 0;
  const expiringPermits       = dashboardKpis.expiring_permits ?? 0;
  const openRFIs              = dashboardKpis.open_rfis ?? 0;
  const openNCRs              = dashboardKpis.open_ncrs ?? 0;
  const safetyScore           = dashboardKpis.safety_score;
  const activeProjects        = dashboardKpis.active_projects ?? 0;
  const delayedProjects       = dashboardKpis.delayed_projects ?? 0;
  const planningProjects      = dashboardKpis.planning_projects ?? 0;
  const totalContractValue    = dashboardKpis.total_contract_value ?? 0;
  const totalCertified        = dashboardKpis.total_certified ?? 0;
  const pendingRABillCount    = dashboardKpis.pending_ra_bills ?? 0;
  const pendingRAValue        = dashboardKpis.pending_ra_value ?? 0;
  const totalCollections      = dashboardKpis.total_collections ?? 0;
  const receivables           = dashboardKpis.receivables ?? (totalCertified - totalCollections);
  const documentsCount        = dashboardKpis.documents_count ?? safeDocs.length;
  const financeTrendData      = dashboardCharts.finance_trend || [];
  const projectStatusData     = dashboardCharts.project_status || [];
  const delayedWatchlist      = [...(dashboardWatchlists.delayed_projects || [])].slice(0, 4);
  const recentPayments        = [...safePayments].slice(0, 4);
  const overduePOCount        = dashboardPulse?.procurement_stores?.pos_requiring_attention ?? 0;
  const pendingVendorBills    = dashboardPulse?.procurement_stores?.pending_vendor_bills ?? 0;
  const pendingVendorBillValue = dashboardPulse?.procurement_stores?.pending_vendor_bill_value ?? 0;
  const collectionRate        = totalCertified > 0 ? Math.round((totalCollections / totalCertified) * 100) : 0;

  // DQS bill stats
  const tqsTotalBills      = tqsBills.length;
  const tqsTotalInvoice    = tqsBills.reduce((s, b) => s + parseFloat(b.total_amount   || 0), 0);
  const tqsTotalCertified  = tqsBills.reduce((s, b) => s + parseFloat(b.certified_net  || 0), 0);
  const tqsTotalPaid       = tqsBills.reduce((s, b) => s + parseFloat(b.paid_amount    || 0), 0);
  const tqsBalance         = tqsTotalCertified - tqsTotalPaid;
  const tqsPaid            = tqsBills.filter(b => b.workflow_status === 'paid').length;
  const tqsPending         = tqsBills.filter(b => b.workflow_status !== 'paid').length;

  // ── Composite Health score 0-100 ──
  const healthScore = useMemo(() => {
    const coll = Math.min(100, Math.max(0, collectionRate));
    const projDelayPct = activeProjects > 0 ? (delayedProjects / activeProjects) * 100 : 0;
    const proj = Math.max(0, 100 - projDelayPct);
    const safe = safetyScore != null ? Math.min(100, Math.max(0, safetyScore)) : 70;
    const qIssues = (openRFIs || 0) + (openNCRs || 0);
    const qual = Math.max(0, 100 - qIssues * 5);
    return Math.round(0.4 * coll + 0.3 * proj + 0.15 * safe + 0.15 * qual);
  }, [collectionRate, activeProjects, delayedProjects, safetyScore, openRFIs, openNCRs]);

  const healthTone  = healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444';
  const healthLabel = healthScore >= 80 ? 'Healthy'  : healthScore >= 60 ? 'Watch'   : 'At risk';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const filtersActive = selectedProjectId !== 'all' || selectedDateRange !== 'all' || selectedBusinessUnit !== 'all';

  // ────────────────────────────────────── RENDER ──
  return (
    <div className="bento-page">

      {/* ════════════════ TOP BAR ════════════════ */}
      <header className="bento-topbar">
        <div className="brand-block">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 12, repeat: Infinity, ease: 'linear' }} className="brand-orb">
            <Sparkles size={16} color="#fff" />
          </motion.div>
          <div className="brand-text">
            <div className="kicker">Executive Command</div>
            <h1>{greeting}, {user?.name?.split(' ')[0] || 'Admin'}</h1>
            <p>{dayjs().format('dddd, D MMMM YYYY')}</p>
          </div>
        </div>
        <div className="top-actions">
          <div className="refresh-meta">
            {dashboardLoading && <span className="mini-spinner" />}
            <span title={lastRefreshed.toLocaleString('en-IN')}>Updated {relTime(lastRefreshed)}</span>
            <button onClick={() => setAutoRefresh(a => !a)}
              title={autoRefresh ? 'Auto-refresh on — click to disable' : 'Click to auto-refresh every 2 min'}
              className={`live-pill ${autoRefresh ? 'on' : ''}`}>
              {autoRefresh ? '● Live' : 'Live'}
            </button>
          </div>
          <Link to="/projects" className="cta-btn">
            <Building2 size={13} /> All Projects
          </Link>
          <button onClick={handleRefresh} className="icon-btn" title="Refresh (R)">
            <RefreshCw size={13} />
          </button>
        </div>
      </header>

      <div className="bento-container">

        {/* ════════════════ FILTERS ════════════════ */}
        <div className="filter-card">
          <div className="filter-grid">
            {[
              { label: 'Project',       value: selectedProjectId,    onChange: setSelectedProjectId,
                options: [{ value: 'all', label: 'All Projects' }, ...projectOptions.map(p => ({ value: p.id, label: p.project_code ? `${p.name} (${p.project_code})` : p.name }))] },
              { label: 'Date Range',    value: selectedDateRange,    onChange: setSelectedDateRange,
                options: [{ value: 'all', label: 'All Time' }, { value: '7d', label: 'Last 7 Days' }, { value: '30d', label: 'Last 30 Days' }, { value: '90d', label: 'Last 90 Days' }, { value: '1y', label: 'Last 1 Year' }] },
              { label: 'Business Unit', value: selectedBusinessUnit, onChange: setSelectedBusinessUnit,
                options: [{ value: 'all', label: 'All Units' }, ...businessUnitOptions.map(u => ({ value: u, label: u }))],
                hidden: businessUnitOptions.length === 0 },
            ].filter(f => !f.hidden).map(f => (
              <label key={f.label} className="filter-field">
                <span className="filter-label">{f.label}</span>
                <select value={f.value} onChange={e => f.onChange(e.target.value)}>
                  {f.options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            ))}
          </div>
        </div>

        {/* Active filter chips */}
        {filtersActive && (
          <div className="chip-row">
            <span className="chip-row-label">Active filters:</span>
            {selectedProjectId !== 'all' && (() => {
              const p = projectOptions.find(x => x.id === selectedProjectId);
              return <button onClick={() => setSelectedProjectId('all')} className="chip chip-blue">Project: {p ? (p.project_code || p.name) : selectedProjectId} ✕</button>;
            })()}
            {selectedDateRange !== 'all' && (
              <button onClick={() => setSelectedDateRange('all')} className="chip chip-amber">
                {({ '7d': 'Last 7 Days', '30d': 'Last 30 Days', '90d': 'Last 90 Days', '1y': 'Last 1 Year' })[selectedDateRange] || selectedDateRange} ✕
              </button>
            )}
            {selectedBusinessUnit !== 'all' && (
              <button onClick={() => setSelectedBusinessUnit('all')} className="chip chip-green">Unit: {selectedBusinessUnit} ✕</button>
            )}
            <button onClick={() => { setSelectedProjectId('all'); setSelectedDateRange('all'); setSelectedBusinessUnit('all'); }} className="chip chip-clear">
              Clear all
            </button>
          </div>
        )}

        {/* ════════════════ BENTO GRID ════════════════ */}
        <div className="bento-grid">

          {/* ━━━━━━━━━━ HERO TILE (2x2) — Portfolio Health ━━━━━━━━━━ */}
          <div className="tile hero-tile tile-hover" style={{ gridColumn: 'span 2', gridRow: 'span 2' }}>
            <div className="hero-bg" />
            <div className="hero-content">
              <div className="hero-top">
                <div>
                  <div className="hero-kicker">Portfolio Health</div>
                  <div className="hero-title">{healthLabel}</div>
                </div>
                <div className="hero-score" style={{ background: `${healthTone}22`, color: healthTone, borderColor: `${healthTone}55` }}>
                  <Heart size={12} fill={healthTone} stroke={healthTone} /> {healthScore}/100
                </div>
              </div>

              <div className="hero-main-value">
                {dashboardLoading
                  ? <span className="big-skeleton" />
                  : <AnimatedNumber target={totalContractValue} format={v => inrCompact(v)} />
                }
              </div>
              <div className="hero-main-label" title={inr(totalContractValue)}>
                Total Portfolio Value · {safeProjects.length} projects
              </div>

              {/* Sparkline */}
              <div className="hero-spark">
                {financeTrendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={60}>
                    <AreaChart data={financeTrendData} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="heroSpark" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#fff" stopOpacity={0.7} />
                          <stop offset="100%" stopColor="#fff" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.2)' }} />
                      <Area type="monotone" dataKey="billed" stroke="#fff" strokeWidth={2} fill="url(#heroSpark)" name="Billed" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="hero-spark-empty">No trend data</div>
                )}
              </div>

              {/* 4-up mini-stats */}
              <div className="hero-mini-grid">
                <div className="hero-mini">
                  <div className="hero-mini-label">Certified</div>
                  <div className="hero-mini-val" title={inr(totalCertified)}>{inrCompact(totalCertified)}</div>
                </div>
                <div className="hero-mini">
                  <div className="hero-mini-label">Collected</div>
                  <div className="hero-mini-val" title={inr(totalCollections)}>{inrCompact(totalCollections)}</div>
                </div>
                <div className="hero-mini">
                  <div className="hero-mini-label">Receivables</div>
                  <div className="hero-mini-val" title={inr(receivables)}>{inrCompact(receivables)}</div>
                </div>
                <div className="hero-mini">
                  <div className="hero-mini-label">Pending RA</div>
                  <div className="hero-mini-val" title={inr(pendingRAValue)}>{inrCompact(pendingRAValue)}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ━━━━━━━━━━ STAT TILE 1x1 — Active Projects ━━━━━━━━━━ */}
          <StatTile to="/projects" title="Active Projects" value={activeProjects} icon={Building2} accent="#4f46e5" compact={false}
            sub={<><span style={{ color: '#ef4444' }}>{delayedProjects} delayed</span> · {planningProjects} planning</>}
            loading={dashboardLoading} />

          {/* ━━━━━━━━━━ STAT TILE 1x1 — Workforce ━━━━━━━━━━ */}
          <StatTile to="/hr/workers" title="Workforce" value={workforceCount} icon={HardHat} accent="#0891b2" compact={false}
            sub={`${documentsCount} documents`} loading={dashboardLoading} />

          {/* ━━━━━━━━━━ STAT TILE 1x1 — DQS Bills ━━━━━━━━━━ */}
          <StatTile to="/tqs/bills" title="DQS Bills" value={tqsTotalBills} icon={FileText} accent="#f59e0b" compact={false}
            sub={`${tqsPaid} paid · ${tqsPending} pending`} />

          {/* ━━━━━━━━━━ STAT TILE 1x1 — Receivables ━━━━━━━━━━ */}
          <StatTile to="/finance/payments" title="Receivables" value={receivables} icon={Wallet} accent={receivables > 0 ? '#dc2626' : '#10b981'}
            sub={receivables < 0 ? 'over-collected' : 'awaiting collection'} loading={dashboardLoading} />

          {/* ━━━━━━━━━━ CHART TILE 2x1 — Billing Trend ━━━━━━━━━━ */}
          <div className="tile" style={{ gridColumn: 'span 2', display: 'flex', flexDirection: 'column' }}>
            <TileHeader title="Billing vs Collections" icon={Activity} />
            {dashboardLoading ? (
              <div className="chart-skeleton">
                {[0.55, 0.7, 0.45, 0.85, 0.6, 0.95, 0.7, 0.5, 0.8].map((h, i) => (
                  <div key={i} className="skeleton-pulse" style={{ flex: 1, height: `${h * 100}%` }} />
                ))}
              </div>
            ) : !financeTrendData.length || financeTrendData.every(i => i.billed === 0 && i.collected === 0) ? (
              <EmptyState text="No billing or collection data for selected range" />
            ) : (
              <>
                <div style={{ flex: 1, minHeight: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={financeTrendData} margin={{ top: 8, right: 6, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gBill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gCollect" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#94a3b8', fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => inrCompact(v).replace('₹','')} />
                      <Tooltip content={<CustomTooltip />} />
                      <Area type="monotone" dataKey="billed" stroke="#6366f1" strokeWidth={2.5} fill="url(#gBill)" name="Billed" />
                      <Area type="monotone" dataKey="collected" stroke="#10b981" strokeWidth={2.5} fill="url(#gCollect)" name="Collected" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                <div className="legend-row">
                  {[['#6366f1', 'Billed'], ['#10b981', 'Collected']].map(([c, l]) => (
                    <span key={l} className="legend-item"><span className="legend-dot" style={{ background: c }} />{l}</span>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* ━━━━━━━━━━ RADIAL TILE 1x1 — Collection Rate ━━━━━━━━━━ */}
          <div className="tile">
            <TileHeader title="Collection Rate" icon={Wallet} />
            <div className="radial-wrap">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart cx="50%" cy="50%" innerRadius="55%" outerRadius="90%"
                  data={[{ name: 'Collected', value: collectionRate, fill: '#10b981' }, { name: 'Target', value: 100, fill: '#e2e8f0' }]}
                  startAngle={180} endAngle={-180}>
                  <RadialBar dataKey="value" cornerRadius={6} animationDuration={1000} />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="radial-center">
                <div className="radial-pct" style={{ color: '#10b981' }}>{collectionRate}%</div>
                <div className="radial-label">of certified</div>
              </div>
            </div>
          </div>

          {/* ━━━━━━━━━━ DONUT TILE 1x1 — Project Status ━━━━━━━━━━ */}
          <Link to="/projects" className="tile tile-hover" style={{ textDecoration: 'none', color: 'inherit' }}>
            <TileHeader title="Project Status" icon={Building2} />
            {dashboardLoading || projectStatusData.length === 0 ? (
              <EmptyState text={dashboardLoading ? 'Loading…' : 'No project data'} />
            ) : (
              <div className="donut-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={projectStatusData} dataKey="value" innerRadius={32} outerRadius={52} paddingAngle={3}>
                      {projectStatusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="none" />)}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-legend">
                  {projectStatusData.slice(0, 3).map((item, i) => (
                    <div key={item.name} className="donut-legend-item">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="donut-legend-name">{item.name}</span>
                      <strong>{item.value}</strong>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Link>

          {/* ━━━━━━━━━━ LIST TILE 2x1 — Delayed Projects ━━━━━━━━━━ */}
          <div className="tile" style={{ gridColumn: 'span 2' }}>
            <TileHeader title="Delayed Projects" icon={AlertTriangle} action="View All" to="/projects" />
            {delayedWatchlist.length === 0 ? <EmptyState text="No delayed projects" /> : (
              <div className="list-body">
                {delayedWatchlist.map((project) => {
                  const progress = Math.max(0, Math.min(100, parseFloat(project.progress_pct || 0)));
                  return (
                    <div key={project.id} className="list-row" style={{ borderColor: '#fde7c7', background: '#fff7ed' }}>
                      <div className="list-row-top">
                        <strong>{project.name}</strong>
                        <span style={{ color: '#f59e0b', fontWeight: 800, fontSize: 11 }}>{progress}%</span>
                      </div>
                      <div className="progress-rail" style={{ background: '#fde7c7' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} transition={{ duration: 1 }}
                          style={{ height: '100%', background: 'linear-gradient(90deg,#f59e0b,#ef4444)' }} />
                      </div>
                      <div className="list-row-sub">{project.city || 'City not set'} · {inrCompact(project.contract_value)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ━━━━━━━━━━ STAT TILE 1x1 — Safety Score ━━━━━━━━━━ */}
          <StatTile to="/hse/incidents" title="Safety Score" value={safetyScore != null ? `${Math.round(safetyScore)}/100` : 'N/A'}
            icon={Shield} accent="#16a34a" sub={`${openIncidents} open incidents`} loading={dashboardLoading} />

          {/* ━━━━━━━━━━ STAT TILE 1x1 — Quality Issues ━━━━━━━━━━ */}
          <StatTile to="/quality" title="Quality Issues" value={openRFIs + openNCRs} icon={FileWarning} accent="#dc2626" compact={false}
            sub={`${openRFIs} RFIs · ${openNCRs} NCRs`} loading={dashboardLoading} />

          {/* ━━━━━━━━━━ LIST TILE 2x1 — Exceptions & Alerts ━━━━━━━━━━ */}
          <div className="tile" style={{ gridColumn: 'span 2' }}>
            <TileHeader title="Exceptions & Alerts" icon={AlertTriangle} />
            <div className="list-body">
              {dashboardExceptions.length === 0 ? <EmptyState text="No exceptions" /> : dashboardExceptions.slice(0, 4).map((card) => (
                <Link key={card.label} to={card.to} className="exception-row" style={{ borderColor: `${card.tone}44`, background: `${card.tone}08` }}>
                  <motion.span animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}
                    style={{ width: 8, height: 8, borderRadius: '50%', background: card.tone, flexShrink: 0 }} />
                  <span className="exception-label">{card.label}</span>
                  <strong style={{ color: '#0f172a' }}>{card.value}</strong>
                </Link>
              ))}
            </div>
          </div>

          {/* ━━━━━━━━━━ LIST TILE 2x1 — Recent Payments ━━━━━━━━━━ */}
          <div className="tile" style={{ gridColumn: 'span 2' }}>
            <TileHeader title="Recent Payments" icon={Wallet} action="View All" to="/finance/payments" />
            {recentPayments.length === 0 ? <EmptyState text="No payments recorded" /> : (
              <div className="list-body">
                {recentPayments.map(payment => (
                  <div key={payment.id} className="list-row" style={{ borderColor: '#d1fae5', background: '#ecfdf5' }}>
                    <div className="list-row-top">
                      <strong className="truncate">{payment.entity_name || payment.project_name || 'Payment'}</strong>
                      <span style={{ fontSize: 11, fontWeight: 800, color: '#0f172a' }} title={inr(payment.net_amount || payment.amount)}>
                        {inrCompact(payment.net_amount || payment.amount)}
                      </span>
                    </div>
                    <div className="list-row-sub">
                      {dayjs(payment.payment_date || payment.created_at).format('DD MMM YYYY')} · <span style={{ color: '#10b981', fontWeight: 700, textTransform: 'uppercase' }}>{payment.payment_type || 'payment'}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ━━━━━━━━━━ LIST TILE 2x1 — Procurement & Stores ━━━━━━━━━━ */}
          <div className="tile" style={{ gridColumn: 'span 2' }}>
            <TileHeader title="Procurement & Stores" icon={Package} action="Inventory" to="/procurement/inventory" />
            <div className="list-body">
              {[
                { Icon: ClipboardList, label: 'POs Needing Attention',  value: overduePOCount,                  sub: 'Overdue or unconfirmed',  color: '#f97316' },
                { Icon: Package,       label: 'Low Stock Materials',    value: lowStockCount,                   sub: 'Below reorder level',     color: '#ef4444' },
                { Icon: Receipt,       label: 'Pending Vendor Bills',   value: pendingVendorBills,              sub: inrCompact(pendingVendorBillValue), color: '#8b5cf6' },
                { Icon: CheckCircle2,  label: 'DQS Balance to Pay',     value: inrCompact(tqsBalance),          sub: 'Awaiting payment',        color: '#0891b2' },
              ].map(p => (
                <div key={p.label} className="pulse-row" style={{ background: `${p.color}08`, borderColor: `${p.color}22` }}>
                  <div className="pulse-icon" style={{ background: `${p.color}18`, color: p.color }}>
                    <p.Icon size={14} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="pulse-label">{p.label}</div>
                    <div className="pulse-sub">{p.sub}</div>
                  </div>
                  <div className="pulse-val" style={{ color: p.color }}>{p.value}</div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ════════════════ STYLES ════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }

        .bento-page { background: #f6f8fb; min-height: 100vh; font-family: 'Inter','Segoe UI',-apple-system,sans-serif; }

        /* ── TOP BAR ── */
        .bento-topbar {
          background: #fff; border-bottom: 1px solid #e5e7eb; padding: 12px 24px;
          display: flex; align-items: center; justify-content: space-between;
          position: sticky; top: 0; z-index: 30;
        }
        .brand-block { display: flex; align-items: center; gap: 12px; }
        .brand-orb {
          width: 36px; height: 36px; border-radius: 10px;
          background: linear-gradient(135deg, #4f46e5, #7c3aed);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 4px 12px rgba(79,70,229,0.3);
        }
        .brand-text .kicker { font-size: 9px; font-weight: 800; color: #64748b; letter-spacing: 0.1em; text-transform: uppercase; }
        .brand-text h1 { font-size: 15px; font-weight: 900; color: #0f172a; margin: 0; }
        .brand-text p { font-size: 10px; color: #94a3b8; margin: 0; }

        .top-actions { display: flex; align-items: center; gap: 10px; }
        .refresh-meta { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #94a3b8; }
        .mini-spinner {
          width: 12px; height: 12px; border: 2px solid rgba(99,102,241,0.3); border-top-color: #6366f1;
          border-radius: 50%; animation: spin 1s linear infinite; display: inline-block;
        }
        .live-pill {
          padding: 2px 8px; border-radius: 999px; border: 1px solid #e5e7eb; background: #fff;
          color: #64748b; font-size: 9px; font-weight: 800; cursor: pointer; letter-spacing: 0.3px; text-transform: uppercase;
        }
        .live-pill.on { border-color: #a7f3d0; background: #dcfce7; color: #15803d; }
        .cta-btn {
          padding: 7px 14px; background: #4f46e5; border: none; border-radius: 8px;
          color: #fff; font-size: 11px; font-weight: 800; cursor: pointer; display: flex; align-items: center; gap: 5px;
          text-decoration: none; transition: transform .12s;
        }
        .cta-btn:hover { transform: translateY(-1px); }
        .icon-btn {
          width: 32px; height: 32px; border-radius: 8px; background: #fff; border: 1px solid #e5e7eb;
          display: flex; align-items: center; justify-content: center; cursor: pointer; color: #64748b;
          transition: all .12s;
        }
        .icon-btn:hover { color: #4f46e5; border-color: #c7d2fe; }

        /* ── CONTAINER ── */
        .bento-container { padding: 18px 24px; max-width: 1800px; margin: 0 auto; }

        /* ── FILTERS ── */
        .filter-card {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 12px;
          padding: 10px 14px; margin-bottom: 14px; box-shadow: 0 1px 3px rgba(15,23,42,.04);
        }
        .filter-grid {
          display: grid; gap: 10px; align-items: end;
          grid-template-columns: minmax(0,1.6fr) minmax(0,0.7fr) minmax(0,0.7fr);
        }
        @media (max-width: 900px) { .filter-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 560px) { .filter-grid { grid-template-columns: 1fr; } }
        .filter-field { display: grid; gap: 4px; min-width: 0; }
        .filter-label { font-size: 9px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.08em; }
        .filter-field select {
          height: 32px; border-radius: 8px; border: 1px solid #dbe3ef; padding: 0 10px;
          background: #f8fafc; color: #0f172a; font-size: 12px; font-weight: 600; outline: none; min-width: 0;
        }
        .filter-field select:focus { border-color: #6366f1; background: #fff; }

        /* ── CHIPS ── */
        .chip-row { display: flex; align-items: center; gap: 6px; margin-bottom: 14px; flex-wrap: wrap; }
        .chip-row-label { font-size: 9px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.5px; }
        .chip {
          padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 700; cursor: pointer;
          border: 1px solid; display: inline-flex; align-items: center; gap: 4px;
        }
        .chip-blue  { border-color: #c7d2fe; background: #eef2ff; color: #4338ca; }
        .chip-amber { border-color: #fed7aa; background: #fff7ed; color: #c2410c; }
        .chip-green { border-color: #bbf7d0; background: #f0fdf4; color: #15803d; }
        .chip-clear { border-color: #e5e7eb; background: #fff; color: #64748b; }

        /* ── BENTO GRID ── */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          grid-auto-rows: 168px;
          gap: 14px;
        }
        @media (max-width: 1280px) {
          .bento-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          .bento-grid > .tile[style*="grid-column: span 2"] { grid-column: span 2 !important; }
        }
        @media (max-width: 900px) {
          .bento-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); grid-auto-rows: 160px; }
          .bento-grid > .tile[style*="grid-column: span 2"] { grid-column: span 2 !important; }
          .bento-grid > .hero-tile { grid-column: span 2 !important; grid-row: span 2 !important; }
        }
        @media (max-width: 560px) {
          .bento-grid { grid-template-columns: 1fr; grid-auto-rows: auto; }
          .bento-grid > .tile,
          .bento-grid > .tile[style*="grid-column: span 2"],
          .bento-grid > .hero-tile { grid-column: span 1 !important; grid-row: auto !important; min-height: 160px; }
        }

        /* ── TILE BASE ── */
        .tile {
          background: #fff; border: 1px solid #e5e7eb; border-radius: 16px;
          padding: 14px 16px; box-shadow: 0 1px 3px rgba(15,23,42,0.04);
          position: relative; overflow: hidden;
          transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .tile-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 28px rgba(15,23,42,0.10);
          border-color: #c7d2fe;
        }
        .tile-skeleton { width: 100%; height: 100%; background: linear-gradient(90deg,#eef2f7 25%,#f8fafc 50%,#eef2f7 75%); background-size: 200% 100%; animation: shimmer 1.6s infinite; border-radius: 8px; }

        /* Tile header */
        .tile-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
        .tile-title { display: flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; color: #0f172a; }
        .tile-title-icon { color: #6366f1; }
        .tile-action { font-size: 10px; color: #6366f1; text-decoration: none; font-weight: 700; display: flex; align-items: center; gap: 2px; }
        .tile-action:hover { color: #4338ca; }

        /* ── HERO TILE ── */
        .hero-tile {
          background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%);
          color: #fff; border: none; padding: 18px 20px;
          box-shadow: 0 8px 24px rgba(67,56,202,0.35);
        }
        .hero-tile:hover { box-shadow: 0 16px 36px rgba(67,56,202,0.45); }
        .hero-bg {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.6;
          background:
            radial-gradient(circle at 80% -10%, rgba(255,255,255,0.18), transparent 40%),
            radial-gradient(circle at -10% 110%, rgba(124,58,237,0.45), transparent 50%);
        }
        .hero-content { position: relative; height: 100%; display: flex; flex-direction: column; }
        .hero-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 6px; }
        .hero-kicker { font-size: 9px; font-weight: 800; letter-spacing: 0.15em; color: rgba(255,255,255,0.6); text-transform: uppercase; }
        .hero-title { font-size: 14px; font-weight: 800; margin-top: 2px; }
        .hero-score {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 4px 10px; border-radius: 999px; border: 1px solid;
          font-size: 11px; font-weight: 800; backdrop-filter: blur(8px);
        }
        .hero-main-value {
          font-size: 38px; font-weight: 900; margin-top: 8px; letter-spacing: -1px;
          background: linear-gradient(180deg, #fff, #c7d2fe);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text; line-height: 1.05;
        }
        .hero-main-label { font-size: 11px; color: rgba(255,255,255,0.65); margin-top: 2px; font-weight: 600; }
        .hero-spark { margin-top: 8px; flex: 1; min-height: 50px; }
        .hero-spark-empty { color: rgba(255,255,255,0.4); font-size: 11px; padding: 10px 0; text-align: center; }
        .hero-mini-grid { display: grid; grid-template-columns: repeat(4, minmax(0,1fr)); gap: 8px; margin-top: 8px; }
        .hero-mini {
          background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px; padding: 7px 9px; backdrop-filter: blur(8px);
        }
        .hero-mini-label { font-size: 8px; font-weight: 800; color: rgba(255,255,255,0.55); text-transform: uppercase; letter-spacing: 0.5px; }
        .hero-mini-val { font-size: 13px; font-weight: 800; color: #fff; margin-top: 2px; }
        .big-skeleton { display: inline-block; width: 180px; height: 38px; background: rgba(255,255,255,0.18); border-radius: 6px; animation: shimmer 1.6s infinite; }

        /* ── STAT TILE ── */
        .stat-tile { display: flex; flex-direction: column; height: 100%; }
        .stat-icon-wrap {
          width: 32px; height: 32px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
        }
        .stat-label { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 10px; }
        .stat-value { font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px; margin-top: 4px; line-height: 1.05; }
        .stat-sub { font-size: 10px; color: #94a3b8; margin-top: auto; padding-top: 6px; line-height: 1.35; }

        /* ── CHART / RADIAL / DONUT ── */
        .legend-row { display: flex; gap: 14px; padding-top: 4px; }
        .legend-item { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #64748b; }
        .legend-dot { width: 16px; height: 2.5px; border-radius: 2px; }
        .radial-wrap { position: relative; height: calc(100% - 26px); display: flex; align-items: center; justify-content: center; }
        .radial-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%,-50%); text-align: center; }
        .radial-pct { font-size: 24px; font-weight: 900; line-height: 1; }
        .radial-label { font-size: 9px; color: #94a3b8; margin-top: 2px; font-weight: 600; }
        .donut-wrap { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; height: calc(100% - 28px); align-items: center; }
        .donut-legend { display: grid; gap: 4px; }
        .donut-legend-item { display: flex; align-items: center; gap: 6px; font-size: 10px; color: #64748b; }
        .donut-legend-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .donut-legend-item strong { color: #0f172a; font-weight: 800; }
        .chart-skeleton { display: flex; align-items: flex-end; gap: 6px; height: calc(100% - 28px); padding-top: 8px; }
        .chart-skeleton > div { background: linear-gradient(180deg,#eef2f7,#f8fafc); border-radius: 4px; }

        /* ── LIST TILE ── */
        .list-body { display: grid; gap: 6px; max-height: calc(100% - 26px); overflow-y: auto; padding-right: 2px; }
        .list-body::-webkit-scrollbar { width: 5px; }
        .list-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 999px; }
        .list-row { border: 1px solid; border-radius: 10px; padding: 7px 10px; }
        .list-row-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; font-size: 11px; }
        .list-row-top strong { color: #0f172a; font-weight: 700; }
        .list-row-sub { font-size: 10px; color: #64748b; }
        .progress-rail { height: 4px; border-radius: 999px; overflow: hidden; margin-bottom: 4px; }
        .truncate { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 65%; }

        .exception-row {
          display: flex; align-items: center; gap: 8px;
          padding: 7px 10px; border: 1px solid; border-radius: 10px;
          text-decoration: none; color: #334155; font-size: 11px;
        }
        .exception-label { flex: 1; font-weight: 600; }
        .exception-row strong { font-size: 14px; font-weight: 800; }

        .pulse-row { display: flex; align-items: center; gap: 9px; padding: 7px 10px; border: 1px solid; border-radius: 10px; }
        .pulse-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .pulse-label { font-size: 11px; font-weight: 700; color: #0f172a; }
        .pulse-sub { font-size: 10px; color: #64748b; margin-top: 1px; }
        .pulse-val { font-size: 16px; font-weight: 900; }

        /* ── EMPTY / ANIMS ── */
        .empty-state { padding: 24px 0; text-align: center; color: #94a3b8; font-size: 11px; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        @keyframes skeleton-pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }
        .skeleton-pulse { animation: skeleton-pulse 1.4s ease-in-out infinite; }

        select option { background: #1e293b; color: #fff; }
      `}</style>
    </div>
  );
}
