// Asset Tracking — current location of every asset + full movement/transfer history
import React, { useEffect, useState, useMemo } from 'react';
import { assetAPI, assetMgmtAPI, projectAPI } from '../../api/client';
import {
  MapPin, ArrowRightLeft, Search, RefreshCw, Filter,
  Plus, CheckCircle, XCircle, Clock, ChevronRight, Eye
} from 'lucide-react';

const STATUS_COLOR = {
  available:   'bg-green-100 text-green-700',
  assigned:    'bg-blue-100 text-blue-700',
  maintenance: 'bg-yellow-100 text-yellow-700',
  breakdown:   'bg-red-100 text-red-700',
  disposed:    'bg-gray-100 text-gray-500',
  transferred: 'bg-purple-100 text-purple-700',
};

const TRANSFER_STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

function TransferModal({ assets, projects, onSave, onClose }) {
  const [form, setForm] = useState({
    asset_id: '', from_project_id: '', to_project_id: '',
    from_location: '', to_location: '',
    transfer_date: new Date().toISOString().slice(0, 10),
    reason: '', condition_out: 'good'
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2">
            <ArrowRightLeft className="w-4 h-4 text-blue-500" /> Initiate Asset Transfer
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset *</label>
            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select asset to transfer…</option>
              {assets.filter(a => a.status !== 'disposed').map(a => (
                <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name} ({a.status})</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">From Site / Project</label>
              <select value={form.from_project_id} onChange={e => set('from_project_id', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Central Yard / Store</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">To Site / Project *</label>
              <select value={form.to_project_id} onChange={e => set('to_project_id', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Central Yard / Store</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Transfer Date</label>
            <input type="date" value={form.transfer_date} onChange={e => set('transfer_date', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason for Transfer</label>
            <textarea value={form.reason} onChange={e => set('reason', e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Why is this asset being transferred?" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Condition at Dispatch</label>
            <select value={form.condition_out} onChange={e => set('condition_out', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {['excellent','good','fair','poor'].map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => { if (!form.asset_id) return alert('Select an asset'); onSave(form); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <ArrowRightLeft className="w-4 h-4" /> Create Transfer
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetTrackingPage() {
  const [assets, setAssets]       = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [projects, setProjects]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [tab, setTab]             = useState('current'); // 'current' | 'transfers'
  const [search, setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');
  const [showTransferModal, setShowTransferModal] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [a, t, p] = await Promise.all([
        assetAPI.list(),
        assetMgmtAPI.listTransfers(),
        projectAPI.list(),
      ]);
      setAssets(a.data?.data || []);
      setTransfers(t.data?.data || []);
      setProjects(p.data?.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleTransfer = async (form) => {
    try {
      await assetMgmtAPI.createTransfer(form);
      setShowTransferModal(false);
      load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const handleApprove = async (id) => {
    try { await assetMgmtAPI.approveTransfer(id); load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this transfer?')) return;
    try { await assetMgmtAPI.rejectTransfer(id); load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const filteredAssets = useMemo(() => assets.filter(a => {
    if (statusFilter && a.status !== statusFilter) return false;
    if (projectFilter && a.current_location !== projectFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return [a.asset_code, a.asset_name, a.asset_type, a.current_project_name]
        .some(v => v?.toLowerCase().includes(q));
    }
    return true;
  }), [assets, statusFilter, projectFilter, search]);

  const filteredTransfers = useMemo(() => transfers.filter(t => {
    if (search) {
      const q = search.toLowerCase();
      return [t.asset_code, t.asset_name, t.from_project_name, t.to_project_name, t.reason]
        .some(v => v?.toLowerCase().includes(q));
    }
    return true;
  }), [transfers, search]);

  // Location summary: count assets per project
  const locationSummary = useMemo(() => {
    const map = {};
    assets.filter(a => a.status !== 'disposed').forEach(a => {
      const loc = a.current_project_name || 'Central Yard';
      map[loc] = (map[loc] || 0) + 1;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [assets]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asset Tracking</h1>
          <p className="text-sm text-gray-500">Real-time location of all assets & site-to-site transfer management</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="flex items-center gap-2 px-3 py-2 bg-white border rounded-lg text-sm hover:bg-gray-50">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
          <button onClick={() => setShowTransferModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
            <Plus className="w-4 h-4" /> New Transfer
          </button>
        </div>
      </div>

      {/* Location Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 mb-6">
        {locationSummary.slice(0, 6).map(([loc, count]) => (
          <div key={loc} className="bg-white border rounded-xl p-3 cursor-pointer hover:border-blue-300"
            onClick={() => {
              const proj = projects.find(p => p.name === loc);
              setProjectFilter(proj?.id || '');
              setTab('current');
            }}>
            <div className="flex items-center gap-1.5 text-blue-600 mb-1">
              <MapPin className="w-3.5 h-3.5" />
              <span className="text-xs font-medium truncate">{loc}</span>
            </div>
            <div className="text-2xl font-bold text-gray-800">{count}</div>
            <div className="text-xs text-gray-400">assets</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit mb-4">
        {[
          { key: 'current',   label: `Current Location (${assets.filter(a=>a.status!=='disposed').length})` },
          { key: 'transfers', label: `Transfers (${transfers.length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors
              ${tab === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full"
            placeholder={tab === 'current' ? 'Search asset, location…' : 'Search asset, site, reason…'} />
        </div>
        {tab === 'current' && (<>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Status</option>
            {['available','assigned','maintenance','breakdown','disposed'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
            ))}
          </select>
          <select value={projectFilter} onChange={e => setProjectFilter(e.target.value)}
            className="border rounded-lg px-3 py-2 text-sm">
            <option value="">All Locations</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </>)}
      </div>

      {loading ? <div className="text-center py-12 text-gray-400"><RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />Loading…</div> : (

        tab === 'current' ? (
          /* ── Current Location Table ── */
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Asset Code','Asset Name','Type','Current Location','Status','Last Movement','Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map(a => (
                    <tr key={a.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs text-blue-600 font-medium">{a.asset_code}</td>
                      <td className="py-3 px-4 text-xs">
                        <div className="font-medium text-gray-800">{a.asset_name}</div>
                        {a.brand && <div className="text-gray-400">{a.brand} {a.model}</div>}
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-600">{a.asset_type}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 text-xs">
                          <MapPin className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                          <span className="text-gray-700">{a.current_project_name || 'Central Yard'}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[a.status] || 'bg-gray-100 text-gray-600'}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-xs text-gray-400">—</td>
                      <td className="py-3 px-4">
                        <button onClick={() => setShowTransferModal(true)}
                          className="flex items-center gap-1 px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded border border-blue-200">
                          <ArrowRightLeft className="w-3 h-3" /> Transfer
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredAssets.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">No assets found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* ── Transfers Table ── */
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Asset','From','To','Date','Reason','Status','Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredTransfers.map(t => (
                    <tr key={t.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs text-blue-600">{t.asset_code}</div>
                        <div className="text-xs text-gray-700">{t.asset_name}</div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-3 h-3 text-gray-400" />
                          {t.from_project_name || 'Central Yard'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">
                        <div className="flex items-center gap-1 text-gray-600">
                          <MapPin className="w-3 h-3 text-blue-400" />
                          {t.to_project_name || 'Central Yard'}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-xs">{t.transfer_date}</td>
                      <td className="py-3 px-4 text-xs max-w-[160px] truncate">{t.reason || '—'}</td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TRANSFER_STATUS_COLOR[t.status] || 'bg-gray-100 text-gray-600'}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {t.status === 'pending' && (
                          <div className="flex gap-1">
                            <button onClick={() => handleApprove(t.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                              <CheckCircle className="w-3 h-3" /> Approve
                            </button>
                            <button onClick={() => handleReject(t.id)}
                              className="flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs hover:bg-red-200">
                              <XCircle className="w-3 h-3" /> Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredTransfers.length === 0 && (
                    <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                      <ArrowRightLeft className="w-8 h-8 mx-auto mb-2 opacity-30" />No transfers found
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {showTransferModal && (
        <TransferModal assets={assets} projects={projects}
          onSave={handleTransfer} onClose={() => setShowTransferModal(false)} />
      )}
    </div>
  );
}
