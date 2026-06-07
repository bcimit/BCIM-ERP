// Asset Depreciation — book value, accumulated depreciation, SLM/WDV schedules
import React, { useEffect, useState, useMemo } from 'react';
import { assetAPI, itAssetAPI } from '../../api/client';
import { TrendingDown, Search, Download, RefreshCw, Info, ChevronDown, ChevronUp } from 'lucide-react';
import dayjs from 'dayjs';

const fmt  = (v) => `₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmtP = (v) => `${Number(v||0).toFixed(1)}%`;

const IT_USEFUL_LIFE_BY_TYPE = {
  laptop: 3,
  desktop: 3,
  printer: 5,
  ups: 5,
  network: 5,
  cctv: 5,
  biometric: 5,
  server: 5,
  other: 5,
};

function normalizeITAsset(asset) {
  const type = String(asset.asset_type || 'other').toLowerCase();
  return {
    ...asset,
    id: `it-${asset.id}`,
    source: 'it',
    source_label: 'IT',
    asset_code: asset.asset_tag,
    asset_name: [asset.brand, asset.model].filter(Boolean).join(' ') || asset.asset_tag,
    asset_type: `IT - ${type.replace(/_/g, ' ')}`,
    purchase_value: asset.purchase_cost || 0,
    useful_life_years: asset.useful_life_years || IT_USEFUL_LIFE_BY_TYPE[type] || 5,
    salvage_value: asset.salvage_value || 0,
    depreciation_method: asset.depreciation_method || 'straight_line',
  };
}

// SLM book value at given year
function slmBookValue(cost, salvage, life, years) {
  const annual = life > 0 ? (cost - salvage) / life : 0;
  const depreciated = annual * Math.min(years, life);
  return Math.max(salvage, cost - depreciated);
}

// WDV book value at given year (15% default rate)
function wdvBookValue(cost, life, years, rate) {
  const r = rate || (life > 0 ? 1 - Math.pow((0.05 * cost) / cost, 1 / life) : 0.15);
  let bv = cost;
  for (let i = 0; i < Math.min(years, life); i++) bv = bv * (1 - r);
  return Math.max(0, bv);
}

function calcDepreciation(asset) {
  const cost       = parseFloat(asset.purchase_value || 0);
  const salvage    = parseFloat(asset.salvage_value  || 0);
  const life       = parseInt(asset.useful_life_years || 5);
  const method     = asset.depreciation_method || 'straight_line';
  const purchaseDate = asset.purchase_date ? dayjs(asset.purchase_date) : null;
  const yearsOwned = purchaseDate ? dayjs().diff(purchaseDate, 'year', true) : 0;

  let bookValue, accumulated, annualDep, depPct;
  if (method === 'straight_line' || method === 'slm') {
    annualDep   = life > 0 ? (cost - salvage) / life : 0;
    bookValue   = slmBookValue(cost, salvage, life, yearsOwned);
    accumulated = cost - bookValue;
    depPct      = cost > 0 ? (accumulated / cost) * 100 : 0;
  } else {
    const rate = life > 0 ? 1 - Math.pow(salvage > 0 ? salvage / cost : 0.05, 1 / life) : 0.15;
    bookValue   = wdvBookValue(cost, life, yearsOwned, rate);
    accumulated = cost - bookValue;
    annualDep   = bookValue * rate;
    depPct      = cost > 0 ? (accumulated / cost) * 100 : 0;
  }

  const remainingLife = Math.max(0, life - yearsOwned);
  return { cost, salvage, life, bookValue, accumulated, annualDep, depPct, yearsOwned, remainingLife, method };
}

function DepreciationBar({ pct }) {
  const c = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-orange-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-green-500';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${c}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className={`text-xs font-medium w-10 text-right
        ${pct >= 90 ? 'text-red-600' : pct >= 70 ? 'text-orange-500' : 'text-gray-600'}`}>
        {fmtP(pct)}
      </span>
    </div>
  );
}

function ScheduleRow({ asset, dep }) {
  const [open, setOpen] = useState(false);
  const cost   = dep.cost;
  const life   = dep.life;
  const salvage = dep.salvage;

  const schedule = useMemo(() => {
    if (!cost || !asset.purchase_date) return [];
    const rows = [];
    let bv = cost;
    const purchaseYear = dayjs(asset.purchase_date).year();
    for (let y = 1; y <= life; y++) {
      const isSlm = dep.method === 'straight_line' || dep.method === 'slm';
      const rate = life > 0 ? 1 - Math.pow(salvage > 0 ? salvage / cost : 0.05, 1 / life) : 0.15;
      const depAmt = isSlm ? (cost - salvage) / life : bv * rate;
      const newBv = Math.max(isSlm ? cost - depAmt * y : bv - depAmt, salvage);
      rows.push({ year: purchaseYear + y, depAmt, bookValue: newBv, accumulated: cost - newBv });
      bv = newBv;
    }
    return rows;
  }, [asset.purchase_date, cost, life, salvage, dep.method]);

  return (
    <>
      <tr className={`border-b hover:bg-gray-50 ${dep.depPct >= 90 ? 'bg-red-50' : ''}`}>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
            <div className="font-mono text-xs text-blue-600 font-medium">{asset.asset_code}</div>
            {asset.source_label && (
              <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-700">
                {asset.source_label}
              </span>
            )}
          </div>
          <div className="text-xs text-gray-700 max-w-[160px] truncate">{asset.asset_name}</div>
        </td>
        <td className="py-3 px-4 text-xs capitalize">{dep.method.replace('_',' ')}</td>
        <td className="py-3 px-4 text-xs text-right font-medium">{fmt(dep.cost)}</td>
        <td className="py-3 px-4 text-xs text-right text-orange-600 font-medium">{fmt(dep.annualDep)}/yr</td>
        <td className="py-3 px-4 text-xs text-right text-green-700 font-bold">{fmt(dep.bookValue)}</td>
        <td className="py-3 px-4 text-xs text-right text-red-600">{fmt(dep.accumulated)}</td>
        <td className="py-3 px-4 min-w-[140px]"><DepreciationBar pct={dep.depPct} /></td>
        <td className="py-3 px-4 text-xs text-center">
          {dep.remainingLife > 0
            ? <span className="text-blue-600">{dep.remainingLife.toFixed(1)}y left</span>
            : <span className="text-red-500 font-medium">Fully depreciated</span>}
        </td>
        <td className="py-3 px-4">
          {schedule.length > 0 && (
            <button onClick={() => setOpen(o => !o)}
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
              {open ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Schedule
            </button>
          )}
        </td>
      </tr>
      {open && schedule.length > 0 && (
        <tr className="bg-blue-50 border-b">
          <td colSpan={9} className="px-8 py-3">
            <div className="overflow-x-auto">
              <table className="text-xs w-full max-w-lg">
                <thead>
                  <tr className="text-gray-500">
                    <th className="text-left py-1 pr-4">Year</th>
                    <th className="text-right py-1 pr-4">Depreciation</th>
                    <th className="text-right py-1 pr-4">Accumulated</th>
                    <th className="text-right py-1">Book Value</th>
                  </tr>
                </thead>
                <tbody>
                  {schedule.map((r, i) => (
                    <tr key={i} className={`border-t ${r.bookValue <= dep.salvage + 1 ? 'text-gray-400' : ''}`}>
                      <td className="py-1 pr-4">{r.year}</td>
                      <td className="py-1 pr-4 text-right">{fmt(r.depAmt)}</td>
                      <td className="py-1 pr-4 text-right">{fmt(r.accumulated)}</td>
                      <td className="py-1 text-right font-medium">{fmt(r.bookValue)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function AssetDepreciationPage() {
  const [assets, setAssets]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [methodFilter, setMethod] = useState('');
  const [sortBy, setSortBy]   = useState('code');

  useEffect(() => {
    setLoading(true);
    Promise.all([
      assetAPI.list().then(r => r.data?.data || []),
      itAssetAPI.list().then(r => (r.data?.data || []).map(normalizeITAsset)).catch(() => []),
    ])
      .then(([physicalAssets, itAssets]) => {
        setAssets([...physicalAssets, ...itAssets]);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const computed = useMemo(() =>
    assets
      .filter(a => a.status !== 'disposed' && parseFloat(a.purchase_value || 0) > 0)
      .map(a => ({ ...a, _dep: calcDepreciation(a) })),
  [assets]);

  const filtered = useMemo(() => computed.filter(a => {
    if (methodFilter && !a.depreciation_method?.includes(methodFilter)) return false;
    if (search) {
      const q = search.toLowerCase();
      return [a.asset_code, a.asset_name, a.asset_type, a.source_label].some(v => v?.toLowerCase().includes(q));
    }
    return true;
  }).sort((a, b) => {
    if (sortBy === 'code')     return a.asset_code.localeCompare(b.asset_code);
    if (sortBy === 'dep_pct')  return b._dep.depPct - a._dep.depPct;
    if (sortBy === 'book_val') return a._dep.bookValue - b._dep.bookValue;
    if (sortBy === 'cost')     return b._dep.cost - a._dep.cost;
    return 0;
  }), [computed, search, methodFilter, sortBy]);

  // Summary
  const totalCost    = computed.reduce((s, a) => s + a._dep.cost, 0);
  const totalBook    = computed.reduce((s, a) => s + a._dep.bookValue, 0);
  const totalAccum   = computed.reduce((s, a) => s + a._dep.accumulated, 0);
  const fullyDep     = computed.filter(a => a._dep.remainingLife <= 0).length;
  const overallDepPct = totalCost > 0 ? (totalAccum / totalCost) * 100 : 0;

  const exportCSV = () => {
    const rows = [
      ['Register','Code','Name','Type','Method','Purchase Value','Annual Dep','Book Value','Accumulated','Dep %','Remaining Life (yrs)'],
      ...filtered.map(a => [
        a.source_label || 'Assets', a.asset_code, a.asset_name, a.asset_type, a._dep.method,
        a._dep.cost, a._dep.annualDep.toFixed(0), a._dep.bookValue.toFixed(0),
        a._dep.accumulated.toFixed(0), a._dep.depPct.toFixed(1), a._dep.remainingLife.toFixed(1)
      ])
    ];
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a'); a.href = url; a.download = 'asset-depreciation.csv'; a.click();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-orange-500" /> Asset Depreciation
          </h1>
          <p className="text-sm text-gray-500">Book values, accumulated depreciation & schedules (SLM / WDV)</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">
          <Download className="w-4 h-4" /> Export CSV
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Gross Asset Value',     value: fmt(totalCost),   color: 'text-blue-700' },
          { label: 'Net Book Value',         value: fmt(totalBook),   color: 'text-green-700' },
          { label: 'Accumulated Dep.',       value: fmt(totalAccum),  color: 'text-red-600' },
          { label: 'Overall Dep. %',         value: fmtP(overallDepPct), color: 'text-orange-600' },
          { label: 'Fully Depreciated',      value: `${fullyDep} assets`, color: 'text-gray-600' },
        ].map(c => (
          <div key={c.label} className="bg-white border rounded-xl p-4">
            <div className="text-xs text-gray-500 mb-1">{c.label}</div>
            <div className={`text-xl font-bold ${c.color}`}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full" placeholder="Search asset…" />
        </div>
        <select value={methodFilter} onChange={e => setMethod(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Methods</option>
          <option value="straight_line">Straight Line (SLM)</option>
          <option value="wdv">Written Down Value (WDV)</option>
        </select>
        <select value={sortBy} onChange={e => setSortBy(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="code">Sort: Asset Code</option>
          <option value="dep_pct">Sort: Most Depreciated</option>
          <option value="book_val">Sort: Lowest Book Value</option>
          <option value="cost">Sort: Highest Cost</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Loading…</div>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Asset','Method','Purchase Value','Annual Dep.','Net Book Value','Accumulated','Dep. %','Status','Schedule'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(a => (
                  <ScheduleRow key={a.id} asset={a} dep={a._dep} />
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={9} className="text-center py-8 text-gray-400">
                    No assets with purchase value found
                  </td></tr>
                )}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="bg-gray-50 border-t-2 border-gray-200">
                  <tr>
                    <td className="py-3 px-4 text-xs font-bold text-gray-700" colSpan={2}>
                      Total ({filtered.length} assets)
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-right">
                      {fmt(filtered.reduce((s,a)=>s+a._dep.cost,0))}
                    </td>
                    <td className="py-3 px-4 text-xs text-right"></td>
                    <td className="py-3 px-4 text-xs font-bold text-right text-green-700">
                      {fmt(filtered.reduce((s,a)=>s+a._dep.bookValue,0))}
                    </td>
                    <td className="py-3 px-4 text-xs font-bold text-right text-red-600">
                      {fmt(filtered.reduce((s,a)=>s+a._dep.accumulated,0))}
                    </td>
                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
