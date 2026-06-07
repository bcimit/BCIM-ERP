import React, { useEffect, useState } from 'react';
import { assetMgmtAPI, assetAPI, vendorAPI } from '../../api/client';
import { Plus, CheckCircle, Search, Wrench } from 'lucide-react';

const WO_TYPES   = ['preventive', 'breakdown', 'corrective', 'emergency'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];
const STATUSES   = ['open', 'in_progress', 'completed', 'cancelled'];

const PRIO_COLOR = {
  low:      'bg-blue-100 text-blue-700',
  medium:   'bg-yellow-100 text-yellow-700',
  high:     'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};
const STATUS_COLOR = {
  open:        'bg-blue-100 text-blue-700',
  in_progress: 'bg-yellow-100 text-yellow-700',
  completed:   'bg-green-100 text-green-700',
  cancelled:   'bg-gray-100 text-gray-500',
};

function CreateModal({ assets, vendors, onSave, onClose }) {
  const [form, setForm] = useState({
    asset_id: '', wo_type: 'preventive', description: '', priority: 'medium',
    scheduled_date: '', vendor_id: '', vendor_name: '', technician: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">Create Work Order</h2>
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
              <label className="block text-xs font-medium text-gray-600 mb-1">WO Type</label>
              <select value={form.wo_type} onChange={e => set('wo_type', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {WO_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {PRIORITIES.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description *</label>
            <textarea value={form.description} onChange={e => set('description', e.target.value)}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Describe the maintenance work required…" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Scheduled Date</label>
            <input type="date" value={form.scheduled_date} onChange={e => set('scheduled_date', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Vendor / Service Center</label>
            <select value={form.vendor_id} onChange={e => {
              const v = vendors.find(x => x.id === e.target.value);
              set('vendor_id', e.target.value);
              set('vendor_name', v?.name || '');
            }} className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select vendor (optional)</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Technician</label>
            <input value={form.technician} onChange={e => set('technician', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Technician name" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => { if (!form.asset_id || !form.description) return alert('Fill required fields'); onSave(form); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Create WO</button>
        </div>
      </div>
    </div>
  );
}

function CompleteModal({ wo, onSave, onClose }) {
  const [form, setForm] = useState({
    work_done: '', labour_cost: '', parts_cost: '', downtime_hours: '',
    spare_parts: '', next_service_date: ''
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">Complete Work Order — {wo.wo_number}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Work Done *</label>
            <textarea value={form.work_done} onChange={e => set('work_done', e.target.value)}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Describe what was done…" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Labour Cost (₹)</label>
              <input type="number" value={form.labour_cost} onChange={e => set('labour_cost', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" min={0} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Parts Cost (₹)</label>
              <input type="number" value={form.parts_cost} onChange={e => set('parts_cost', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" min={0} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Downtime (hrs)</label>
              <input type="number" value={form.downtime_hours} onChange={e => set('downtime_hours', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" min={0} step={0.5} />
            </div>
          </div>
          {(form.labour_cost || form.parts_cost) && (
            <div className="p-3 bg-green-50 rounded-lg text-sm text-green-700">
              Total Cost: <strong>₹{(parseFloat(form.labour_cost||0) + parseFloat(form.parts_cost||0)).toLocaleString()}</strong>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Spare Parts Used</label>
            <input value={form.spare_parts} onChange={e => set('spare_parts', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="e.g. Filters, Belts, Bearings" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Next Service Date</label>
            <input type="date" value={form.next_service_date} onChange={e => set('next_service_date', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => { if (!form.work_done) return alert('Describe work done'); onSave(form); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            <CheckCircle className="w-4 h-4" /> Mark Complete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AssetWorkOrdersPage() {
  const [wos, setWos]         = useState([]);
  const [assets, setAssets]   = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);
  const [search, setSearch]   = useState('');
  const [statusFilter, setStatus] = useState('');
  const [typeFilter, setType]     = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (typeFilter)   params.wo_type = typeFilter;
      const [w, a, v] = await Promise.all([
        assetMgmtAPI.listWorkOrders(params),
        assetAPI.list(),
        vendorAPI.list(),
      ]);
      setWos(w.data?.data || []);
      setAssets(a.data?.data || []);
      setVendors(v.data?.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter, typeFilter]);

  const handleCreate = async (form) => {
    try { await assetMgmtAPI.createWorkOrder(form); setModal(null); load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const handleComplete = async (id, form) => {
    try { await assetMgmtAPI.completeWorkOrder(id, form); setModal(null); load(); }
    catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const filtered = wos.filter(w =>
    [w.wo_number, w.asset_code, w.asset_name, w.description, w.technician, w.vendor_name]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Maintenance Work Orders</h1>
          <p className="text-sm text-gray-500">Preventive, breakdown & corrective maintenance tracking</p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Create WO
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full" placeholder="Search WO, asset, technician…" />
        </div>
        <select value={statusFilter} onChange={e => setStatus(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          {STATUSES.map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setType(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Types</option>
          {WO_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['WO#','Asset','Type','Priority','Description','Scheduled','Technician/Vendor','Cost','Status','Action'].map(h => (
                    <th key={h} className="text-left py-3 px-3 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(wo => (
                  <tr key={wo.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-3 font-mono text-xs text-blue-600 whitespace-nowrap">{wo.wo_number}</td>
                    <td className="py-3 px-3">
                      <div className="text-xs text-blue-500">{wo.asset_code}</div>
                      <div className="text-xs text-gray-700 max-w-[120px] truncate">{wo.asset_name}</div>
                    </td>
                    <td className="py-3 px-3 text-xs capitalize whitespace-nowrap">{wo.wo_type}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${PRIO_COLOR[wo.priority]}`}>
                        {wo.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-xs max-w-[160px] truncate">{wo.description}</td>
                    <td className="py-3 px-3 text-xs whitespace-nowrap">{wo.scheduled_date || '—'}</td>
                    <td className="py-3 px-3 text-xs">
                      <div>{wo.technician || '—'}</div>
                      {wo.vendor_name_resolved && <div className="text-gray-400">{wo.vendor_name_resolved}</div>}
                    </td>
                    <td className="py-3 px-3 text-xs whitespace-nowrap">
                      {wo.total_cost > 0 ? `₹${Number(wo.total_cost).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${STATUS_COLOR[wo.status]}`}>
                        {wo.status.replace('_',' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {(wo.status === 'open' || wo.status === 'in_progress') && (
                        <button onClick={() => setModal({ complete: true, wo })}
                          className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 whitespace-nowrap">
                          <CheckCircle className="w-3 h-3" /> Done
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-8 text-gray-400">
                    <Wrench className="w-8 h-8 mx-auto mb-2 opacity-30" />No work orders found
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'new' && (
        <CreateModal assets={assets} vendors={vendors} onSave={handleCreate} onClose={() => setModal(null)} />
      )}
      {modal?.complete && (
        <CompleteModal wo={modal.wo}
          onSave={(form) => handleComplete(modal.wo.id, form)}
          onClose={() => setModal(null)} />
      )}
    </div>
  );
}
