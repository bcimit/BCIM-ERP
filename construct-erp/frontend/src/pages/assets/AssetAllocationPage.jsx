import React, { useEffect, useState } from 'react';
import { assetMgmtAPI, assetAPI, projectAPI } from '../../api/client';
import { Plus, CornerDownLeft, Search, Filter } from 'lucide-react';

const COND_OPTS = ['excellent', 'good', 'fair', 'poor'];

function AllocModal({ assets, projects, onSave, onClose }) {
  const [form, setForm] = useState({
    asset_id: '', allocation_type: 'project', project_id: '',
    employee_name: '', department: '',
    issue_date: new Date().toISOString().slice(0,10),
    expected_return_date: '', issued_condition: 'good'
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-800">Allocate / Issue Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Asset *</label>
            <select value={form.asset_id} onChange={e => set('asset_id', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              <option value="">Select asset…</option>
              {assets.filter(a => a.status === 'available').map(a => (
                <option key={a.id} value={a.id}>{a.asset_code} — {a.asset_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Allocation Type</label>
            <select value={form.allocation_type} onChange={e => set('allocation_type', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {['project','site','employee','department','store'].map(t => (
                <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>
              ))}
            </select>
          </div>
          {(form.allocation_type === 'project' || form.allocation_type === 'site') && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Project</label>
              <select value={form.project_id} onChange={e => set('project_id', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Select project…</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}
          {form.allocation_type === 'employee' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Employee Name</label>
              <input value={form.employee_name} onChange={e => set('employee_name', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Full name" />
            </div>
          )}
          {form.allocation_type === 'department' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Department</label>
              <input value={form.department} onChange={e => set('department', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Department name" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Issue Date</label>
              <input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Expected Return</label>
              <input type="date" value={form.expected_return_date} onChange={e => set('expected_return_date', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Condition at Issue</label>
            <select value={form.issued_condition} onChange={e => set('issued_condition', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {COND_OPTS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => { if (!form.asset_id) return alert('Select an asset'); onSave(form); }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">Issue Asset</button>
        </div>
      </div>
    </div>
  );
}

function ReturnModal({ allocation, onSave, onClose }) {
  const [form, setForm] = useState({ return_condition: 'good', return_remarks: '' });
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-semibold text-gray-800">Return Asset</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="p-3 bg-gray-50 rounded-lg text-sm">
            <strong>{allocation.asset_code}</strong> — {allocation.asset_name}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Return Condition</label>
            <select value={form.return_condition}
              onChange={e => setForm(f => ({ ...f, return_condition: e.target.value }))}
              className="w-full border rounded-lg px-3 py-2 text-sm">
              {[...COND_OPTS, 'damaged'].map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Remarks</label>
            <textarea value={form.return_remarks}
              onChange={e => setForm(f => ({ ...f, return_remarks: e.target.value }))}
              rows={3} className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Any damage notes, observations…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
            Confirm Return
          </button>
        </div>
      </div>
    </div>
  );
}

const STATUS_COLOR = {
  active:   'bg-green-100 text-green-700',
  returned: 'bg-gray-100 text-gray-600',
  overdue:  'bg-red-100 text-red-700',
};

export default function AssetAllocationPage() {
  const [allocations, setAllocations] = useState([]);
  const [assets, setAssets]     = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modal, setModal]       = useState(null); // 'new' | { return, allocation }
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter] = useState('active');

  const load = async () => {
    setLoading(true);
    try {
      const [al, ast, pr] = await Promise.all([
        assetMgmtAPI.listAllocations({ status: statusFilter || undefined }),
        assetAPI.list({ status: 'available' }),
        projectAPI.list(),
      ]);
      setAllocations(al.data?.data || []);
      setAssets(ast.data?.data || []);
      setProjects(pr.data?.data || []);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleAllocate = async (form) => {
    try {
      await assetMgmtAPI.allocate(form);
      setModal(null);
      load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const handleReturn = async (id, form) => {
    try {
      await assetMgmtAPI.returnAsset(id, form);
      setModal(null);
      load();
    } catch (e) { alert(e.response?.data?.error || e.message); }
  };

  const filtered = allocations.filter(a =>
    [a.asset_code, a.asset_name, a.project_name, a.employee_name, a.department]
      .some(v => v?.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Asset Allocation</h1>
          <p className="text-sm text-gray-500">Issue assets to projects, employees & departments</p>
        </div>
        <button onClick={() => setModal('new')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Plus className="w-4 h-4" /> Issue Asset
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            className="pl-9 pr-3 py-2 border rounded-lg text-sm w-full" placeholder="Search asset, project, employee…" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="returned">Returned</option>
          <option value="overdue">Overdue</option>
        </select>
      </div>

      {loading ? <div className="text-center py-12 text-gray-400">Loading…</div> : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Asset','Type','Allocated To','Issue Date','Expected Return','Condition','Status','Actions'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-xs font-medium text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(al => (
                  <tr key={al.id} className="border-b last:border-0 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="font-mono text-blue-600 text-xs">{al.asset_code}</div>
                      <div className="text-gray-700">{al.asset_name}</div>
                    </td>
                    <td className="py-3 px-4 text-xs capitalize">{al.allocation_type}</td>
                    <td className="py-3 px-4 text-xs">
                      <div>{al.project_name || al.employee_name || al.department || '—'}</div>
                    </td>
                    <td className="py-3 px-4 text-xs">{al.issue_date}</td>
                    <td className="py-3 px-4 text-xs">{al.expected_return_date || '—'}</td>
                    <td className="py-3 px-4 text-xs capitalize">
                      {al.return_condition || al.issued_condition}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[al.status] || 'bg-gray-100 text-gray-600'}`}>
                        {al.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {al.status === 'active' && (
                        <button onClick={() => setModal({ return: true, allocation: al })}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700">
                          <CornerDownLeft className="w-3 h-3" /> Return
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="text-center py-8 text-gray-400">No allocations found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal === 'new' && (
        <AllocModal assets={assets} projects={projects}
          onSave={handleAllocate} onClose={() => setModal(null)} />
      )}
      {modal?.return && (
        <ReturnModal allocation={modal.allocation}
          onSave={(form) => handleReturn(modal.allocation.id, form)}
          onClose={() => setModal(null)} />
      )}
    </div>
  );
}
