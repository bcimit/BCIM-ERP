import React, { useEffect, useState } from 'react';
import { assetMgmtAPI, assetAPI } from '../../api/client';
import { Plus, CheckCircle, Trash2, Search } from 'lucide-react';

const DISPOSAL_TYPES = ['sold', 'scrapped', 'lost', 'damaged', 'donated'];

function DisposalModal({ assets, onSave, onClose }) {
  const [form, setForm] = useState({
    asset_id: '', disposal_type: 'scrapped', disposal_date: new Date().toISOString().slice(0,10),
    book_value: '', sale_value: '', scrap_value: '', buyer_name: '', reason: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">Initiate Asset Disposal</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset *</label>
            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select asset…</option>
              {assets.filter(a => a.status !== 'disposed').map(a => (
                <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Disposal Type *</label>
              <select value={form.disposal_type} onChange={e => set('disposal_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {DISPOSAL_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Disposal Date</label>
              <input type="date" value={form.disposal_date} onChange={e => set('disposal_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Book Value (₹)</label>
              <input type="number" value={form.book_value} onChange={e => set('book_value', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" min={0} />
            </div>
            {form.disposal_type === 'sold' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Sale Value (₹)</label>
                <input type="number" value={form.sale_value} onChange={e => set('sale_value', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" min={0} />
              </div>
            )}
            {(form.disposal_type === 'scrapped' || form.disposal_type === 'damaged') && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Scrap Value (₹)</label>
                <input type="number" value={form.scrap_value} onChange={e => set('scrap_value', e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm" min={0} />
              </div>
            )}
          </div>
          {form.disposal_type === 'sold' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Buyer Name</label>
              <input value={form.buyer_name} onChange={e => set('buyer_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Buyer's name / company" />
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Reason / Remarks</label>
            <textarea value={form.reason} onChange={e => set('reason', e.target.value)}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Reason for disposal…" />
          </div>
          <div className="p-3 bg-yellow-50 rounded-lg text-xs text-yellow-800">
            ⚠️ This will initiate a disposal request. Admin approval required before the asset is marked disposed.
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => { if (!form.asset_id) return alert('Select an asset'); onSave(form); }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
            <Trash2 className="w-4 h-4" /> Submit Disposal
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLOR = {
  pending:   'bg-yellow-100 text-yellow-700',
  approved:  'bg-green-100 text-green-700',
  completed: 'bg-blue-100 text-blue-700',
  rejected:  'bg-red-100 text-red-700',
};

export default function AssetDisposalPage() {
  const [disposals, setDisposals] = useState([]);
  const [assets, setAssets]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]       = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const [d, a] = await Promise.all([assetMgmtAPI.listDisposals(), assetAPI.list()]);
      setDisposals(d.data?.data || []);
      setAssets(a.data?.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (form) => {
    try { await assetMgmtAPI.createDisposal(form); setShowModal(false); load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const handleApprove = async (id) => {
    if (!window.confirm('Approve this disposal? Asset will be marked disposed.')) return;
    try { await assetMgmtAPI.approveDisposal(id); load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const filtered = disposals.filter(d =>
    [d.asset_code, d.asset_name, d.disposal_type, d.buyer_name]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asset Disposal</h1>
          <p className="text-sm text-gray-500">Manage asset disposals — sold, scrapped, lost, donated</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
          <Plus className="w-4 h-4" /> New Disposal
        </button>
      </div>

      <div className="relative mb-4 max-w-sm">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full" placeholder="Search disposals…" />
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Asset','Type','Disposal Date','Book Value','Sale/Scrap Value','Buyer','Status','Action'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-mono text-xs text-blue-600">{d.asset_code}</div>
                      <div className="text-xs text-gray-700">{d.asset_name}</div>
                    </td>
                    <td className="py-3 px-4 text-xs capitalize">{d.disposal_type}</td>
                    <td className="py-3 px-4 text-xs">{d.disposal_date}</td>
                    <td className="py-3 px-4 text-xs">
                      {d.book_value ? `₹${Number(d.book_value).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      {d.sale_value > 0 ? `₹${Number(d.sale_value).toLocaleString()}` :
                       d.scrap_value > 0 ? `₹${Number(d.scrap_value).toLocaleString()} (scrap)` : '—'}
                    </td>
                    <td className="py-3 px-4 text-xs">{d.buyer_name || '—'}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[d.status]}`}>
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {d.status === 'pending' && (
                        <button onClick={() => handleApprove(d.id)}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                          <CheckCircle className="w-3 h-3" /> Approve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No disposals found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <DisposalModal assets={assets} onSave={handleCreate} onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
