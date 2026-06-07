// Risk Register — probability/impact matrix, CRUD, mitigation tracking
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle, Plus, Edit2, Trash2, X, Search, Shield,
} from 'lucide-react';
import { planningP6API, projectAPI } from '../../api/client';
import toast from 'react-hot-toast';
import { clsx } from 'clsx';

const CATEGORIES = ['technical','schedule','cost','quality','safety','environmental','legal','stakeholder','other'];
const STRATEGIES = ['avoid','mitigate','transfer','accept'];
const STATUSES   = ['open','mitigated','closed','accepted'];

const LEVEL_CFG = {
  critical: { bg:'bg-red-100 border-red-300 text-red-800', dot:'bg-red-500' },
  high:     { bg:'bg-orange-100 border-orange-300 text-orange-800', dot:'bg-orange-500' },
  medium:   { bg:'bg-yellow-100 border-yellow-300 text-yellow-800', dot:'bg-yellow-500' },
  low:      { bg:'bg-green-100 border-green-300 text-green-800', dot:'bg-green-600' },
};

function RiskScore({ p, i }) {
  const score = p * i;
  const color = score >= 20 ? 'bg-red-500' : score >= 12 ? 'bg-orange-500' : score >= 6 ? 'bg-yellow-500' : 'bg-green-500';
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold ${color}`}>
      {score}
    </div>
  );
}

// 5×5 Risk Matrix visualisation
function RiskMatrix({ risks }) {
  const matrix = Array.from({ length: 5 }, () => Array(5).fill(0));
  risks.filter(r => r.status === 'open' || r.status === 'mitigated').forEach(r => {
    const p = parseInt(r.probability||1) - 1;
    const i = parseInt(r.impact||1) - 1;
    if (p >= 0 && p < 5 && i >= 0 && i < 5) matrix[4-p][i]++;
  });

  const cellColor = (row, col) => {
    const score = (5-row) * (col+1);
    return score >= 20 ? 'bg-red-200 text-red-800' : score >= 12 ? 'bg-orange-200 text-orange-800'
      : score >= 6 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800';
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-700 mb-3">Risk Matrix (Probability × Impact)</h3>
      <div className="relative">
        <div className="text-[10px] text-slate-400 mb-1 ml-10 flex gap-0.5">
          {['1','2','3','4','5'].map(n => <div key={n} className="w-10 text-center">{n}</div>)}
        </div>
        {Array.from({length:5}, (_,row) => (
          <div key={row} className="flex items-center gap-0.5 mb-0.5">
            <div className="w-10 text-[10px] text-slate-400 text-right pr-1">{5-row}</div>
            {Array.from({length:5}, (_,col) => (
              <div key={col} className={`w-10 h-10 rounded flex items-center justify-center text-xs font-bold ${cellColor(row,col)}`}>
                {matrix[row][col] || ''}
              </div>
            ))}
          </div>
        ))}
        <div className="flex justify-between text-[10px] text-slate-400 mt-1 ml-10">
          <span>Impact →</span>
        </div>
        <div className="absolute -left-2 top-1/2 -translate-y-1/2 -translate-x-full text-[10px] text-slate-400 writing-vertical"
          style={{ writingMode:'vertical-rl', transform:'rotate(180deg) translateY(-50%)' }}>
          Probability ↑
        </div>
      </div>
    </div>
  );
}

function RiskModal({ risk, projectId, onClose }) {
  const qc = useQueryClient();
  const isEdit = !!risk;
  const [form, setForm] = useState(risk || {
    risk_title:'', description:'', category:'schedule', probability:3, impact:3,
    response_strategy:'mitigate', mitigation_plan:'', contingency_plan:'',
    owner:'', due_date:'', cost_impact:0, schedule_impact_days:0
  });
  const set = (k,v) => setForm(f => ({ ...f, [k]:v }));

  const score = form.probability * form.impact;
  const level = score >= 20 ? 'Critical' : score >= 12 ? 'High' : score >= 6 ? 'Medium' : 'Low';

  const mut = useMutation({
    mutationFn: d => isEdit ? planningP6API.updateRisk(risk.id, d) : planningP6API.createRisk({ ...d, project_id: projectId }),
    onSuccess: () => { toast.success(isEdit ? 'Risk updated' : 'Risk logged'); qc.invalidateQueries({ queryKey:['planning-risks'] }); onClose(); },
    onError: e => toast.error(e?.response?.data?.error || 'Failed'),
  });

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white">
          <h2 className="font-semibold text-gray-800">{isEdit ? 'Edit Risk' : 'Log New Risk'}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Risk Title *</label>
            <input value={form.risk_title} onChange={e => set('risk_title', e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea value={form.description||''} onChange={e => set('description', e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e => set('category', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Response Strategy</label>
              <select value={form.response_strategy} onChange={e => set('response_strategy', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {STRATEGIES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          {/* Probability / Impact sliders */}
          <div className="grid grid-cols-2 gap-4">
            {[['probability','Probability (1-5)'],['impact','Impact (1-5)']].map(([k, label]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{label}: <strong>{form[k]}</strong></label>
                <input type="range" min={1} max={5} value={form[k]} onChange={e => set(k, parseInt(e.target.value))}
                  className="w-full" />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <RiskScore p={form.probability} i={form.impact} />
            <div>
              <div className="text-sm font-semibold">Risk Score: {score}</div>
              <div className="text-xs text-gray-500">Level: <strong>{level}</strong></div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Mitigation Plan</label>
            <textarea value={form.mitigation_plan||''} onChange={e => set('mitigation_plan', e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Contingency Plan</label>
            <textarea value={form.contingency_plan||''} onChange={e => set('contingency_plan', e.target.value)}
              rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Owner</label>
              <input value={form.owner||''} onChange={e => set('owner', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cost Impact (₹)</label>
              <input type="number" value={form.cost_impact||0} onChange={e => set('cost_impact', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Schedule Impact (days)</label>
              <input type="number" value={form.schedule_impact_days||0} onChange={e => set('schedule_impact_days', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
          </div>
          {isEdit && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
              <select value={form.status||'open'} onChange={e => set('status', e.target.value)}
                className="w-full border rounded-lg px-3 py-2 text-sm">
                {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 p-5 border-t bg-gray-50 rounded-b-xl sticky bottom-0">
          <button onClick={onClose} className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-100">Cancel</button>
          <button onClick={() => mut.mutate(form)} disabled={!form.risk_title || mut.isPending}
            className="px-5 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 disabled:opacity-50">
            {isEdit ? 'Update Risk' : 'Log Risk'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RiskRegisterPage() {
  const [projectId, setProjectId] = useState('');
  const [search, setSearch]       = useState('');
  const [levelFilter, setLevel]   = useState('');
  const [modal, setModal]         = useState(null); // null | 'new' | risk object

  const { data: projects = [] } = useQuery({ queryKey:['projects'], queryFn: () => projectAPI.list().then(r=>r.data?.data??[]) });
  const { data: risks = [] }    = useQuery({
    queryKey: ['planning-risks', projectId],
    queryFn: () => planningP6API.listRisks({ project_id: projectId }).then(r => r.data?.data ?? r.data ?? []).catch(() => []),
    enabled: !!projectId,
  });
  const qc = useQueryClient();

  const deleteMut = useMutation({
    mutationFn: id => planningP6API.deleteRisk(id),
    onSuccess: () => { toast.success('Deleted'); qc.invalidateQueries({ queryKey:['planning-risks'] }); },
    onError: e => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const filtered = useMemo(() => risks.filter(r => {
    if (levelFilter && r.risk_level !== levelFilter) return false;
    if (search) return [r.risk_title, r.category, r.owner, r.risk_code].some(v => v?.toLowerCase().includes(search.toLowerCase()));
    return true;
  }), [risks, levelFilter, search]);

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto min-h-screen bg-[#f4f6f9]">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1"><Shield className="w-3.5 h-3.5" /> Planning</div>
          <h1 className="text-2xl font-semibold text-slate-900">Risk Register</h1>
          <p className="text-sm text-slate-500 mt-0.5">Probability × Impact matrix — identify, assess & mitigate project risks</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={projectId} onChange={e => setProjectId(e.target.value)}
            className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm w-64 shadow-sm">
            <option value="">— Select project —</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {projectId && (
            <button onClick={() => setModal('new')}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 shadow-sm">
              <Plus className="w-4 h-4" /> Log Risk
            </button>
          )}
        </div>
      </div>

      {!projectId ? (
        <div className="bg-white border border-slate-200 rounded-xl p-16 text-center shadow-sm">
          <Shield className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400">Select a project to view its risk register</p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Matrix + summary side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <RiskMatrix risks={risks} />
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-700 mb-3">Summary</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { level:'critical', label:'Critical', count: risks.filter(r=>r.risk_level==='critical').length },
                  { level:'high',     label:'High',     count: risks.filter(r=>r.risk_level==='high').length     },
                  { level:'medium',   label:'Medium',   count: risks.filter(r=>r.risk_level==='medium').length   },
                  { level:'low',      label:'Low',      count: risks.filter(r=>r.risk_level==='low').length      },
                ].map(r => {
                  const cfg = LEVEL_CFG[r.level];
                  return (
                    <button key={r.level} onClick={() => setLevel(v => v===r.level ? '' : r.level)}
                      className={clsx('flex items-center gap-3 p-3 rounded-lg border transition-all',
                        levelFilter===r.level ? `ring-2 ring-offset-1 ring-blue-400 ` : '', cfg.bg)}>
                      <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`} />
                      <div>
                        <div className="text-lg font-bold">{r.count}</div>
                        <div className="text-xs">{r.label}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                <span>Total: {risks.length}</span>
                <span>Open: {risks.filter(r=>r.status==='open').length}</span>
                <span>Mitigated: {risks.filter(r=>r.status==='mitigated').length}</span>
                <span>Closed: {risks.filter(r=>r.status==='closed').length}</span>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 pr-3 py-2 border border-slate-200 bg-white rounded-lg text-sm w-full shadow-sm"
                placeholder="Search risks…" />
            </div>
          </div>

          {/* Risk Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    {['Code','Title','Category','P','I','Score','Level','Strategy','Owner','Status','Actions'].map(h => (
                      <th key={h} className="text-left py-3 px-3 text-xs font-medium text-slate-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map(r => {
                    const cfg = LEVEL_CFG[r.risk_level] || LEVEL_CFG.low;
                    return (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-xs text-indigo-600">{r.risk_code}</td>
                        <td className="py-2 px-3 text-xs max-w-[180px]">
                          <div className="font-medium truncate">{r.risk_title}</div>
                          {r.linked_activity_code && <div className="text-slate-400">→ {r.linked_activity_code}</div>}
                        </td>
                        <td className="py-2 px-3 text-xs capitalize">{r.category}</td>
                        <td className="py-2 px-3 text-xs font-bold">{r.probability}</td>
                        <td className="py-2 px-3 text-xs font-bold">{r.impact}</td>
                        <td className="py-2 px-3"><RiskScore p={r.probability} i={r.impact} /></td>
                        <td className="py-2 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium border capitalize ${cfg.bg}`}>
                            {r.risk_level}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-xs capitalize">{r.response_strategy}</td>
                        <td className="py-2 px-3 text-xs">{r.owner || '—'}</td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600 capitalize">{r.status}</span>
                        </td>
                        <td className="py-2 px-3">
                          <div className="flex gap-1">
                            <button onClick={() => setModal(r)} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => { if (window.confirm('Delete?')) deleteMut.mutate(r.id); }}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr><td colSpan={11} className="text-center py-8 text-slate-400">No risks found</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <RiskModal risk={modal === 'new' ? null : modal}
          projectId={projectId} onClose={() => setModal(null)} />
      )}
    </div>
  );
}
