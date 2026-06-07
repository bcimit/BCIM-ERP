import React, { useEffect, useState } from 'react';
import { assetMgmtAPI, assetAPI } from '../../api/client';
import { Plus, FileText, AlertTriangle, Calendar, Search, Trash2 } from 'lucide-react';

const DOC_TYPES = [
  'insurance','warranty','amc','fitness_certificate','pollution_certificate',
  'road_tax','registration','permit','calibration_certificate','other'
];

function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / (1000*60*60*24));
}

function ExpiryBadge({ date }) {
  if (!date) return <span className="text-gray-400 text-xs">—</span>;
  const d = daysUntil(date);
  const cls = d < 0 ? 'bg-red-100 text-red-700' :
              d <= 30 ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700';
  const label = d < 0 ? `Expired ${Math.abs(d)}d ago` : d === 0 ? 'Today' : `${d}d left`;
  return (
    <div>
      <div className="text-xs">{date}</div>
      <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${cls}`}>{label}</span>
    </div>
  );
}

function AddDocModal({ assets, onSave, onClose }) {
  const [form, setForm] = useState({
    asset_id: '', doc_type: 'insurance', doc_name: '', file_url: '',
    issue_date: '', expiry_date: '', issuer: '', notes: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">Add Document / Certificate</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset *</label>
            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select asset…</option>
              {assets.map(a => <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Document Type *</label>
              <select value={form.doc_type} onChange={e => set('doc_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {DOC_TYPES.map(t => (
                  <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Document Name</label>
              <input value={form.doc_name} onChange={e => set('doc_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Policy #12345" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
              <input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expiry Date</label>
              <input type="date" value={form.expiry_date} onChange={e => set('expiry_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Issuer / Provider</label>
            <input value={form.issuer} onChange={e => set('issuer', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Insurance company, govt authority…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">File URL (optional)</label>
            <input value={form.file_url} onChange={e => set('file_url', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="https://…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => { if (!form.asset_id) return alert('Select an asset'); onSave(form); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Add Document</button>
        </div>
      </div>
    </div>
  );
}

export default function AssetDocumentsPage() {
  const [docs, setDocs]         = useState([]);
  const [assets, setAssets]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showExpiring, setShowExpiring] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (typeFilter)    params.doc_type = typeFilter;
      if (showExpiring)  params.expiring_days = 60;
      const [d, a] = await Promise.all([assetMgmtAPI.listDocuments(params), assetAPI.list()]);
      setDocs(d.data?.data || []);
      setAssets(a.data?.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [typeFilter, showExpiring]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document record?')) return;
    try { await assetMgmtAPI.deleteDocument(id); load(); }
    catch (e) { alert(e.message); }
  };

  const filtered = docs.filter(d =>
    [d.asset_code, d.asset_name, d.doc_name, d.issuer]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  const expiringSoon = docs.filter(d => {
    const days = daysUntil(d.expiry_date);
    return days !== null && days <= 30;
  });

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asset Documents</h1>
          <p className="text-sm text-gray-500">Insurance, warranties, permits & certificates</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Add Document
        </button>
      </div>

      {/* Alert banner */}
      {expiringSoon.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
          <div className="text-sm text-yellow-800">
            <strong>{expiringSoon.length} document(s)</strong> expiring within 30 days.{' '}
            <button onClick={() => setShowExpiring(!showExpiring)}
              className="underline hover:no-underline">
              {showExpiring ? 'Show all' : 'Filter expiring'}
            </button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full" placeholder="Search asset, document…" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          {DOC_TYPES.map(t => (
            <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
          ))}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Asset','Doc Type','Document Name','Issue Date','Expiry','Issuer','Action'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => {
                  const days = daysUntil(d.expiry_date);
                  const rowCls = days !== null && days < 0 ? 'bg-red-50' :
                                 days !== null && days <= 30 ? 'bg-yellow-50' : '';
                  return (
                    <tr key={d.id} className={`border-b last:border-0 hover:bg-gray-50 ${rowCls}`}>
                      <td className="py-3 px-4">
                        <div className="font-mono text-xs text-blue-600">{d.asset_code}</div>
                        <div className="text-xs text-gray-700">{d.asset_name}</div>
                      </td>
                      <td className="py-3 px-4 text-xs capitalize">
                        {d.doc_type?.replace(/_/g,' ')}
                      </td>
                      <td className="py-3 px-4 text-xs">
                        {d.file_url ? (
                          <a href={d.file_url} target="_blank" rel="noopener noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1">
                            <FileText className="w-3 h-3" />{d.doc_name || 'View'}
                          </a>
                        ) : (d.doc_name || '—')}
                      </td>
                      <td className="py-3 px-4 text-xs">{d.issue_date || '—'}</td>
                      <td className="py-3 px-4"><ExpiryBadge date={d.expiry_date} /></td>
                      <td className="py-3 px-4 text-xs">{d.issuer || '—'}</td>
                      <td className="py-3 px-4">
                        <button onClick={() => handleDelete(d.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="text-center py-8 text-gray-400">
                    <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />No documents found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showModal && (
        <AddDocModal assets={assets}
          onSave={async (form) => {
            try { await assetMgmtAPI.addDocument(form); setShowModal(false); load(); }
            catch (e) { alert(e.response?.data?.error || e.message); }
          }}
          onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
