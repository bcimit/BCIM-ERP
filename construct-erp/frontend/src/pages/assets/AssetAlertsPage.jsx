// Asset Notifications & Alerts — insurance expiry, maintenance due, breakdowns, overdue returns
import React, { useEffect, useState, useMemo } from 'react';
import { assetAPI, assetMgmtAPI } from '../../api/client';
import { AlertTriangle, Bell, CheckCircle, Clock, FileText, Wrench, RefreshCw, Filter } from 'lucide-react';
import dayjs from 'dayjs';

function daysUntil(d) {
  if (!d) return null;
  return dayjs(d).diff(dayjs(), 'day');
}

const ALERT_TYPES = {
  overdue_maintenance: { label: 'Overdue Maintenance',   color: 'bg-red-100 text-red-700 border-red-200',    icon: Wrench,       priority: 1 },
  breakdown:           { label: 'Breakdown',              color: 'bg-red-50 text-red-600 border-red-200',     icon: AlertTriangle, priority: 2 },
  insurance_expiry:    { label: 'Insurance Expiry',       color: 'bg-orange-50 text-orange-700 border-orange-200', icon: FileText, priority: 3 },
  fitness_expiry:      { label: 'Fitness Certificate',    color: 'bg-orange-50 text-orange-700 border-orange-200', icon: FileText, priority: 3 },
  pollution_expiry:    { label: 'Pollution Certificate',  color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: FileText, priority: 4 },
  road_tax_expiry:     { label: 'Road Tax / Reg. Expiry', color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: FileText, priority: 4 },
  warranty_expiry:     { label: 'Warranty Expiry',        color: 'bg-blue-50 text-blue-700 border-blue-200',  icon: FileText,     priority: 5 },
  amc_expiry:          { label: 'AMC Expiry',             color: 'bg-blue-50 text-blue-700 border-blue-200',  icon: FileText,     priority: 5 },
  upcoming_service:    { label: 'Service Due',            color: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: Clock,   priority: 6 },
  overdue_return:      { label: 'Return Overdue',         color: 'bg-purple-50 text-purple-700 border-purple-200', icon: Clock,  priority: 2 },
};

function urgencyLabel(days) {
  if (days === null) return { text: '—', cls: 'text-gray-400' };
  if (days < 0)   return { text: `${Math.abs(days)}d overdue`, cls: 'text-red-600 font-bold' };
  if (days === 0) return { text: 'Today', cls: 'text-red-600 font-bold' };
  if (days <= 7)  return { text: `${days}d`, cls: 'text-orange-500 font-bold' };
  if (days <= 30) return { text: `${days}d`, cls: 'text-yellow-600 font-semibold' };
  return { text: `${days}d`, cls: 'text-gray-500' };
}

function buildAlerts(assets, allocations, openWOs) {
  const alerts = [];
  const today = dayjs();

  assets.filter(a => a.status !== 'disposed').forEach(a => {
    // Breakdown status
    if (a.status === 'breakdown') {
      alerts.push({ type: 'breakdown', asset: a, days: null, message: 'Asset in breakdown/stoppage state' });
    }

    // Overdue maintenance
    if (a.next_service_date) {
      const d = daysUntil(a.next_service_date);
      if (d <= 7) {
        alerts.push({ type: d < 0 ? 'overdue_maintenance' : 'upcoming_service', asset: a, days: d,
          message: `Next service: ${a.next_service_date}` });
      }
    }

    // Document expiry checks (60-day window)
    [
      { field: 'insurance_expiry',  type: 'insurance_expiry'  },
      { field: 'fitness_expiry',    type: 'fitness_expiry'    },
      { field: 'pollution_expiry',  type: 'pollution_expiry'  },
      { field: 'road_tax_expiry',   type: 'road_tax_expiry'   },
      { field: 'warranty_expiry',   type: 'warranty_expiry'   },
      { field: 'amc_expiry',        type: 'amc_expiry'        },
    ].forEach(({ field, type }) => {
      if (a[field]) {
        const d = daysUntil(a[field]);
        if (d !== null && d <= 60) {
          alerts.push({ type, asset: a, days: d, message: `${field.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}: ${a[field]}` });
        }
      }
    });
  });

  // Overdue returns
  (allocations || []).filter(al => al.status === 'active' && al.expected_return_date).forEach(al => {
    const d = daysUntil(al.expected_return_date);
    if (d !== null && d <= 3) {
      const asset = assets.find(a => a.id === al.asset_id) || { asset_code: '?', asset_name: al.asset_name || '?' };
      alerts.push({ type: 'overdue_return', asset, days: d,
        message: `Issued to ${al.employee_name || al.project_name || 'unknown'}. Expected back: ${al.expected_return_date}` });
    }
  });

  return alerts.sort((a, b) => {
    const ta = ALERT_TYPES[a.type]?.priority || 9;
    const tb = ALERT_TYPES[b.type]?.priority || 9;
    if (ta !== tb) return ta - tb;
    return (a.days ?? 999) - (b.days ?? 999);
  });
}

export default function AssetAlertsPage() {
  const [assets, setAssets]         = useState([]);
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [typeFilter, setTypeFilter] = useState('');
  const [acknowledged, setAck]      = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem('asset_ack_alerts') || '[]')); }
    catch { return new Set(); }
  });

  useEffect(() => {
    setLoading(true);
    Promise.all([assetAPI.list(), assetMgmtAPI.listAllocations({ status: 'active' })])
      .then(([a, al]) => { setAssets(a.data?.data || []); setAllocations(al.data?.data || []); })
      .finally(() => setLoading(false));
  }, []);

  const allAlerts = useMemo(() => buildAlerts(assets, allocations, []), [assets, allocations]);
  const alerts    = useMemo(() => allAlerts.filter(al => {
    if (acknowledged.has(`${al.type}-${al.asset.id}`)) return false;
    if (typeFilter && al.type !== typeFilter) return false;
    return true;
  }), [allAlerts, acknowledged, typeFilter]);

  const ackAlert = (al) => {
    const key = `${al.type}-${al.asset.id}`;
    const next = new Set(acknowledged); next.add(key);
    setAck(next);
    localStorage.setItem('asset_ack_alerts', JSON.stringify([...next]));
  };

  const ackAll = () => {
    const next = new Set(acknowledged);
    alerts.forEach(al => next.add(`${al.type}-${al.asset.id}`));
    setAck(next);
    localStorage.setItem('asset_ack_alerts', JSON.stringify([...next]));
  };

  // Counts per type
  const typeCounts = useMemo(() => {
    const m = {};
    allAlerts.forEach(al => { m[al.type] = (m[al.type] || 0) + 1; });
    return m;
  }, [allAlerts]);

  const criticalCount = allAlerts.filter(al =>
    (al.days !== null && al.days <= 0) || al.type === 'breakdown'
  ).length;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" /> Asset Alerts & Notifications
          </h1>
          <p className="text-sm text-gray-500">Expiry reminders, overdue maintenance, breakdowns & returns</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setAck(new Set()); localStorage.removeItem('asset_ack_alerts'); }}
            className="px-3 py-2 bg-white border rounded-lg text-xs text-gray-600 hover:bg-gray-50">
            <RefreshCw className="w-3.5 h-3.5 inline mr-1" />Reset
          </button>
          {alerts.length > 0 && (
            <button onClick={ackAll}
              className="flex items-center gap-1.5 px-3 py-2 bg-white border rounded-lg text-xs text-gray-600 hover:bg-gray-50">
              <CheckCircle className="w-3.5 h-3.5" /> Acknowledge All ({alerts.length})
            </button>
          )}
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {criticalCount > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-100 text-red-700 rounded-full text-xs font-medium border border-red-200">
            <AlertTriangle className="w-3.5 h-3.5" /> {criticalCount} Critical
          </div>
        )}
        {Object.entries(typeCounts).map(([type, count]) => {
          const cfg = ALERT_TYPES[type];
          if (!cfg) return null;
          const Icon = cfg.icon;
          return (
            <button key={type} onClick={() => setTypeFilter(t => t === type ? '' : type)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all
                ${typeFilter === type ? 'ring-2 ring-offset-1 ring-blue-400' : ''} ${cfg.color}`}>
              <Icon className="w-3 h-3" /> {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Loading…</div>
      ) : alerts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <CheckCircle className="w-14 h-14 mx-auto mb-3 text-green-400" />
          <h3 className="text-lg font-semibold text-gray-700">All Clear!</h3>
          <p className="text-sm text-gray-400 mt-1">No active alerts at this time.</p>
          {acknowledged.size > 0 && (
            <button onClick={() => { setAck(new Set()); localStorage.removeItem('asset_ack_alerts'); }}
              className="mt-4 text-xs text-blue-600 underline">
              Show {acknowledged.size} acknowledged alerts
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.map((al, i) => {
            const cfg   = ALERT_TYPES[al.type] || {};
            const Icon  = cfg.icon || Bell;
            const urg   = urgencyLabel(al.days);
            return (
              <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${cfg.color} relative`}>
                <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="text-xs font-semibold">{cfg.label}</span>
                    <span className="font-mono text-xs font-bold">{al.asset.asset_code}</span>
                    <span className="text-xs truncate max-w-[200px]">{al.asset.asset_name}</span>
                  </div>
                  <p className="text-xs opacity-80">{al.message}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`text-sm ${urg.cls}`}>{urg.text}</span>
                  <button onClick={() => ackAlert(al)}
                    className="p-1.5 rounded-lg bg-white/60 hover:bg-white/90 transition-colors"
                    title="Acknowledge">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="mt-6 p-4 bg-gray-50 rounded-xl border text-xs text-gray-500">
        <p className="font-medium text-gray-600 mb-2">Alert Rules:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Insurance, Fitness, Pollution, Road Tax — alerts within <strong>60 days</strong> of expiry</li>
          <li>Warranty, AMC — alerts within <strong>60 days</strong> of expiry</li>
          <li>Maintenance — alerts when service due within <strong>7 days</strong> or overdue</li>
          <li>Asset Return — alerts when expected return within <strong>3 days</strong> or overdue</li>
          <li>Breakdown — immediate alert when asset status is "breakdown"</li>
        </ul>
      </div>
    </div>
  );
}
