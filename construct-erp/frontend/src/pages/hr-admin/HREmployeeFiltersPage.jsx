// Employee Filter — save and manage reusable employee list filter presets
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Filter, Plus, Trash2, ArrowRight, Users, X, Globe, Lock, Search } from 'lucide-react';
import { hrAdvancedAPI, hrEmployeesAPI, hrMastersAPI } from '../../api/client';

const fade = (d=0) => ({ initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, transition:{duration:0.35,delay:d} });

function FilterModal({ onClose, onSave, departments=[], designations=[] }) {
  const [form, setForm] = useState({ name:'', description:'', is_shared:false, filters:{} });
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setF = (k,v) => setForm(f=>({...f, filters:{...f.filters,[k]:v||undefined}}));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(10,31,92,0.4)'}}>
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">Save Filter Preset</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X size={16}/>
          </button>
        </div>
        <div className="px-7 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Filter Name *</label>
            <input value={form.name} onChange={e=>set('name',e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. All Active Engineers"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <input value={form.description} onChange={e=>set('description',e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
          </div>
          <div className="border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-gray-700">Filter Conditions</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Department</label>
                <select value={form.filters.department_id||''} onChange={e=>setF('department_id',e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none">
                  <option value="">Any</option>
                  {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Employment Status</label>
                <select value={form.filters.employment_status||''} onChange={e=>setF('employment_status',e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none">
                  <option value="">Any</option>
                  {['active','on_notice','resigned','terminated'].map(s=><option key={s} value={s} className="capitalize">{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Employment Type</label>
                <select value={form.filters.employment_type||''} onChange={e=>setF('employment_type',e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none">
                  <option value="">Any</option>
                  {['full_time','part_time','contract','intern','consultant'].map(s=><option key={s} value={s} className="capitalize">{s.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-gray-500 mb-1">Work Location</label>
                <input value={form.filters.work_location||''} onChange={e=>setF('work_location',e.target.value)}
                  placeholder="e.g. Yelahanka"
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none"/>
              </div>
            </div>
          </div>
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <div onClick={()=>set('is_shared',!form.is_shared)}
              className={`w-10 h-5 rounded-full transition-colors flex items-center px-0.5 ${form.is_shared?'bg-blue-600':'bg-gray-200'}`}>
              <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${form.is_shared?'translate-x-5':'translate-x-0'}`}/>
            </div>
            <span className="text-sm text-gray-700">Shared with all HR staff</span>
          </label>
        </div>
        <div className="px-7 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button onClick={()=>onSave(form)} disabled={!form.name}
            className="px-5 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50"
            style={{background:'linear-gradient(135deg,#0A1F5C,#2563EB)'}}>
            Save Filter
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function HREmployeeFiltersPage() {
  const navigate  = useNavigate();
  const qc = useQueryClient();
  const [modal, setModal] = useState(false);
  const [search, setSearch] = useState('');

  const { data: filters=[], isLoading } = useQuery({
    queryKey: ['hr-emp-filters'],
    queryFn: () => hrAdvancedAPI.listEmpFilters().then(r => r.data?.data ?? []),
  });

  const { data: departments=[] } = useQuery({
    queryKey: ['hr-departments-seg'],
    queryFn: () => hrMastersAPI.listDepts().then(r => r.data?.data ?? []),
  });

  const createMut = useMutation({
    mutationFn: hrAdvancedAPI.createEmpFilter,
    onSuccess: () => { qc.invalidateQueries(['hr-emp-filters']); setModal(false); },
  });

  const deleteMut = useMutation({
    mutationFn: hrAdvancedAPI.deleteEmpFilter,
    onSuccess: () => qc.invalidateQueries(['hr-emp-filters']),
  });

  const applyFilter = (f) => {
    const params = new URLSearchParams();
    const filt = f.filters || {};
    if (filt.department_id)     params.set('dept', filt.department_id);
    if (filt.employment_status) params.set('status', filt.employment_status);
    if (filt.employment_type)   params.set('type', filt.employment_type);
    if (filt.work_location)     params.set('loc', filt.work_location);
    navigate(`/hr-admin/employees?${params.toString()}`);
  };

  const list = filters.filter(f =>
    !search || f.name?.toLowerCase().includes(search.toLowerCase()) || f.description?.toLowerCase().includes(search.toLowerCase())
  );

  const conditionLabels = (filt={}) =>
    Object.entries(filt).filter(([,v])=>v).map(([k,v]) => `${k.replace(/_id$/,'').replace(/_/g,' ')}: ${v}`);

  return (
    <div className="min-h-screen" style={{background:'#F8FAFC'}}>
      {/* Header */}
      <motion.div {...fade(0)} className="bg-white border-b border-gray-100 px-7 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-3 bg-indigo-50"><Filter size={20} className="text-indigo-600"/></div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Employee Filter</h1>
              <p className="text-xs text-gray-400">Saved filter presets for employee list</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search filters…"
                className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <button onClick={()=>setModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
              style={{background:'linear-gradient(135deg,#0A1F5C,#2563EB)'}}>
              <Plus size={15}/> Save Filter
            </button>
          </div>
        </div>
      </motion.div>

      <div className="px-7 py-6">
        {isLoading && <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>}

        {!isLoading && list.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <Filter size={40} className="text-gray-200"/>
            <p className="text-sm">No saved filters yet. Create a filter preset to quickly access employees by conditions.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {list.map((f, i) => {
            const conds = conditionLabels(f.filters);
            return (
              <motion.div key={f.id} {...fade(i*0.05)}
                className="bg-white rounded-2xl border border-gray-100 overflow-hidden hover:shadow-md transition-all"
                style={{boxShadow:'0 2px 10px rgba(10,31,92,0.06)'}}>
                <div className="px-5 py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-900 text-sm truncate">{f.name}</p>
                        {f.is_shared
                          ? <Globe size={12} className="text-blue-400 flex-shrink-0"/>
                          : <Lock size={12} className="text-gray-400 flex-shrink-0"/>}
                      </div>
                      {f.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{f.description}</p>}
                    </div>
                    <button onClick={()=>{ if(window.confirm('Delete filter?')) deleteMut.mutate(f.id); }}
                      className="p-1.5 rounded-lg text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors ml-2 flex-shrink-0">
                      <Trash2 size={13}/>
                    </button>
                  </div>

                  {conds.length > 0 ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {conds.map((c,j) => (
                        <span key={j} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 capitalize">
                          {c}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-[11px] text-gray-400 mt-2 italic">No conditions — shows all employees</p>
                  )}

                  <button onClick={()=>applyFilter(f)}
                    className="mt-4 w-full flex items-center justify-center gap-2 py-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors">
                    <Users size={13}/> Apply Filter
                    <ArrowRight size={12}/>
                  </button>
                </div>
                <div className="px-5 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] text-gray-400">By {f.created_by_name||'Admin'}</span>
                  <span className="text-[10px] text-gray-400">{f.is_shared ? 'Shared' : 'Private'}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {modal && (
          <FilterModal
            departments={departments}
            onClose={()=>setModal(false)}
            onSave={(form)=>createMut.mutate(form)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
