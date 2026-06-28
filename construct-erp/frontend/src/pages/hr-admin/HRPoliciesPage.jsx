// Company Policies & Forms
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FileText, Plus, Search, ChevronDown, ChevronRight,
  Trash2, Edit2, CheckCircle2, Clock, Users, X,
} from 'lucide-react';
import { hrAdvancedAPI } from '../../api/client';
import toast from 'react-hot-toast';

const CATEGORIES = ['HR', 'Finance', 'IT', 'Operations', 'Compliance', 'Safety', 'Other'];
const STATUS_COLORS = { published: '#10B981', draft: '#F59E0B', archived: '#6B7280' };
const fade = (d=0) => ({ initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, transition:{duration:0.35,delay:d} });

function PolicyModal({ policy, onClose, onSave }) {
  const [form, setForm] = useState(
    policy || { title:'', policy_code:'', category:'HR', version:'1.0', effective_date: new Date().toISOString().slice(0,10), body:'', status:'published' }
  );
  const set = (k, v) => setForm(f => ({...f,[k]:v}));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(10,31,92,0.4)'}}>
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">{policy ? 'Edit Policy' : 'New Policy / Form'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X size={16}/>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-7 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Title *</label>
              <input value={form.title} onChange={e=>set('title',e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Policy Code</label>
              <input value={form.policy_code||''} onChange={e=>set('policy_code',e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="e.g. HR-001"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
              <select value={form.category} onChange={e=>set('category',e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                {CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Version</label>
              <input value={form.version} onChange={e=>set('version',e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                placeholder="1.0"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Effective Date</label>
              <input type="date" value={form.effective_date} onChange={e=>set('effective_date',e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
              <select value={form.status} onChange={e=>set('status',e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none bg-white">
                {['published','draft','archived'].map(s=><option key={s} value={s} className="capitalize">{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Content / Body *</label>
            <textarea value={form.body} onChange={e=>set('body',e.target.value)} rows={8}
              placeholder="Enter the policy content, rules, or form instructions..."
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-y"/>
          </div>
        </div>
        <div className="px-7 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button onClick={()=>onSave(form)} disabled={!form.title||!form.body}
            className="px-5 py-2 text-sm font-bold text-white rounded-xl transition-colors disabled:opacity-50"
            style={{background:'linear-gradient(135deg,#0A1F5C,#2563EB)'}}>
            {policy ? 'Save Changes' : 'Create Policy'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function HRPoliciesPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [modalData, setModalData] = useState(null); // null=closed, false=new, obj=edit
  const [expanded, setExpanded] = useState({});

  const { data: policies=[], isLoading } = useQuery({
    queryKey: ['hr-policies'],
    queryFn: () => hrAdvancedAPI.listPolicies().then(r => r.data?.data ?? []),
  });

  const createMut = useMutation({
    mutationFn: hrAdvancedAPI.createPolicy,
    onSuccess: () => { qc.invalidateQueries(['hr-policies']); setModalData(null); toast.success('Policy created'); },
    onError: e => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, ...data }) => hrAdvancedAPI.updatePolicy(id, data),
    onSuccess: () => { qc.invalidateQueries(['hr-policies']); setModalData(null); toast.success('Policy updated'); },
    onError: e => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const deleteMut = useMutation({
    mutationFn: id => hrAdvancedAPI.deletePolicy(id),
    onSuccess: () => { qc.invalidateQueries(['hr-policies']); toast.success('Deleted'); },
    onError: e => toast.error(e?.response?.data?.error || 'Failed'),
  });

  const handleSave = (form) => {
    if (form.id) updateMut.mutate(form);
    else createMut.mutate(form);
  };

  const list = policies.filter(p => {
    const q = search.toLowerCase();
    return (!q || p.title?.toLowerCase().includes(q) || p.policy_code?.toLowerCase().includes(q))
      && (!catFilter || p.category === catFilter);
  });

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = list.filter(p => p.category === cat);
    if (items.length) acc[cat] = items;
    return acc;
  }, {});

  const toggleExpand = (cat) => setExpanded(e => ({...e,[cat]:!e[cat]}));

  return (
    <div className="min-h-screen" style={{background:'#F8FAFC'}}>
      {/* Header */}
      <motion.div {...fade(0)} className="bg-white border-b border-gray-100 px-7 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-3 bg-blue-50"><FileText size={20} className="text-blue-600"/></div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Company Policies &amp; Forms</h1>
              <p className="text-xs text-gray-400">{policies.length} documents</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search policies…"
                className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl w-48 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <select value={catFilter} onChange={e=>setCatFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none">
              <option value="">All Categories</option>
              {CATEGORIES.map(c=><option key={c}>{c}</option>)}
            </select>
            <button onClick={()=>setModalData(false)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
              style={{background:'linear-gradient(135deg,#0A1F5C,#2563EB)'}}>
              <Plus size={15}/> New Policy
            </button>
          </div>
        </div>
      </motion.div>

      <div className="px-7 py-6 space-y-4">
        {isLoading && <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <FileText size={40} className="text-gray-200"/>
            <p className="text-sm">No policies yet. Click <strong>New Policy</strong> to create one.</p>
          </div>
        )}

        {!catFilter ? Object.entries(grouped).map(([cat, items], gi) => (
          <motion.div key={cat} {...fade(gi*0.05)} className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{boxShadow:'0 2px 10px rgba(10,31,92,0.06)'}}>
            <button onClick={()=>toggleExpand(cat)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-2.5">
                <span className="text-sm font-bold text-gray-800">{cat}</span>
                <span className="text-xs bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-full">{items.length}</span>
              </div>
              {expanded[cat] ? <ChevronDown size={15} className="text-gray-400"/> : <ChevronRight size={15} className="text-gray-400"/>}
            </button>
            {!expanded[cat] && (
              <div className="divide-y divide-gray-50">
                {items.map(p => <PolicyRow key={p.id} p={p} onEdit={()=>setModalData(p)} onDelete={id=>deleteMut.mutate(id)}/>)}
              </div>
            )}
          </motion.div>
        )) : (
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{boxShadow:'0 2px 10px rgba(10,31,92,0.06)'}}>
            <div className="divide-y divide-gray-50">
              {list.map(p => <PolicyRow key={p.id} p={p} onEdit={()=>setModalData(p)} onDelete={id=>deleteMut.mutate(id)}/>)}
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {modalData !== null && (
          <PolicyModal
            policy={modalData || null}
            onClose={()=>setModalData(null)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PolicyRow({ p, onEdit, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const color = STATUS_COLORS[p.status] || '#6B7280';
  return (
    <div>
      <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
          <FileText size={15} className="text-blue-600"/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900 text-sm truncate">{p.title}</p>
            {p.policy_code && <span className="text-[10px] font-mono text-gray-400">#{p.policy_code}</span>}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span className="text-[11px] text-gray-400">v{p.version}</span>
            <span className="text-[11px] text-gray-400">Effective: {p.effective_date ? new Date(p.effective_date).toLocaleDateString('en-IN') : '—'}</span>
            {p.acknowledged_count > 0 && (
              <span className="text-[11px] flex items-center gap-1 text-green-600">
                <CheckCircle2 size={10}/>{p.acknowledged_count} ack
              </span>
            )}
          </div>
        </div>
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full capitalize"
          style={{color, background:`${color}18`}}>{p.status}</span>
        <button onClick={()=>setExpanded(e=>!e)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
          {expanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
        </button>
        <button onClick={onEdit} className="text-gray-400 hover:text-blue-600 p-1 rounded-lg hover:bg-blue-50 transition-colors">
          <Edit2 size={14}/>
        </button>
        <button onClick={()=>{ if(window.confirm('Delete this policy?')) onDelete(p.id); }} className="text-gray-400 hover:text-red-600 p-1 rounded-lg hover:bg-red-50 transition-colors">
          <Trash2 size={14}/>
        </button>
      </div>
      {expanded && p.body && (
        <div className="px-5 pb-4 ml-12">
          <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans bg-gray-50 rounded-xl p-4 leading-relaxed max-h-60 overflow-y-auto">
            {p.body}
          </pre>
        </div>
      )}
    </div>
  );
}
