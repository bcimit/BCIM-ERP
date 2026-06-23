// Employee Segment — group employees by criteria (dept, location, type, etc.)
import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layers, Plus, Edit2, Trash2, Users, X, Search } from 'lucide-react';
import { hrAdvancedAPI, hrEmployeesAPI } from '../../api/client';

const COLORS = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#14B8A6','#F97316','#EC4899'];
const CRITERIA_FIELDS = [
  { key: 'department_name', label: 'Department' },
  { key: 'designation_name', label: 'Designation' },
  { key: 'work_location', label: 'Work Location' },
  { key: 'employment_type', label: 'Employment Type' },
  { key: 'grade', label: 'Grade' },
];
const fade = (d=0) => ({ initial:{opacity:0,y:12}, animate:{opacity:1,y:0}, transition:{duration:0.35,delay:d} });

function SegmentModal({ seg, employees, onClose, onSave }) {
  const [form, setForm] = useState(
    seg ? { name: seg.name, description: seg.description||'', color: seg.color||'#2563EB', criteria: seg.criteria||{} }
        : { name:'', description:'', color:'#2563EB', criteria:{} }
  );
  const set = (k,v) => setForm(f=>({...f,[k]:v}));
  const setCriteria = (k,v) => setForm(f=>({...f, criteria:{...f.criteria,[k]:v||undefined}}));

  const matchCount = useMemo(() => {
    return employees.filter(e =>
      Object.entries(form.criteria).every(([k,v]) => !v || String(e[k]||'').toLowerCase().includes(String(v).toLowerCase()))
    ).length;
  }, [employees, form.criteria]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(10,31,92,0.4)'}}>
      <motion.div initial={{opacity:0,scale:0.95}} animate={{opacity:1,scale:1}}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="px-7 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-gray-900 text-lg">{seg ? 'Edit Segment' : 'New Employee Segment'}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400">
            <X size={16}/>
          </button>
        </div>
        <div className="px-7 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Segment Name *</label>
            <input value={form.name} onChange={e=>set('name',e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="e.g. Site Engineers"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <input value={form.description} onChange={e=>set('description',e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              placeholder="Optional description"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Color</label>
            <div className="flex gap-2">
              {COLORS.map(c => (
                <button key={c} onClick={()=>set('color',c)}
                  className="w-7 h-7 rounded-full transition-transform hover:scale-110"
                  style={{background:c, outline: form.color===c ? `3px solid ${c}` : 'none', outlineOffset:2}}/>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Filter Criteria</label>
            <div className="space-y-2">
              {CRITERIA_FIELDS.map(({key,label}) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-32 flex-shrink-0">{label}</span>
                  <input value={form.criteria[key]||''} onChange={e=>setCriteria(key,e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                    placeholder={`Filter by ${label.toLowerCase()}…`}/>
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
            style={{background:`${form.color}12`, border:`1px solid ${form.color}30`}}>
            <Users size={14} style={{color:form.color}}/>
            <span className="text-sm font-bold" style={{color:form.color}}>{matchCount} employee{matchCount!==1?'s':''}</span>
            <span className="text-xs text-gray-500">match current criteria</span>
          </div>
        </div>
        <div className="px-7 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">Cancel</button>
          <button onClick={()=>onSave(form)} disabled={!form.name}
            className="px-5 py-2 text-sm font-bold text-white rounded-xl disabled:opacity-50"
            style={{background:`linear-gradient(135deg,#0A1F5C,${form.color})`}}>
            {seg ? 'Save Changes' : 'Create Segment'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function HRSegmentsPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');

  const { data: segments=[], isLoading } = useQuery({
    queryKey: ['hr-segments'],
    queryFn: () => hrAdvancedAPI.listSegments().then(r => r.data?.data ?? []),
  });

  const { data: employees=[] } = useQuery({
    queryKey: ['hr-employees-all-seg'],
    queryFn: () => hrEmployeesAPI.list({ employment_status:'active' }).then(r => r.data?.data ?? []),
  });

  const createMut = useMutation({
    mutationFn: (data) => modal?.id ? hrAdvancedAPI.updateSegment(modal.id, data) : hrAdvancedAPI.createSegment(data),
    onSuccess: () => { qc.invalidateQueries(['hr-segments']); setModal(null); },
  });

  const deleteMut = useMutation({
    mutationFn: hrAdvancedAPI.deleteSegment,
    onSuccess: () => qc.invalidateQueries(['hr-segments']),
  });

  const getMatchCount = (seg) => {
    const criteria = seg.criteria || {};
    return employees.filter(e =>
      Object.entries(criteria).every(([k,v]) => !v || String(e[k]||'').toLowerCase().includes(String(v).toLowerCase()))
    ).length;
  };

  const filtered = segments.filter(s =>
    !search || s.name?.toLowerCase().includes(search.toLowerCase()) || s.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen" style={{background:'#F8FAFC'}}>
      {/* Header */}
      <motion.div {...fade(0)} className="bg-white border-b border-gray-100 px-7 py-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-3 bg-purple-50"><Layers size={20} className="text-purple-600"/></div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Employee Segment</h1>
              <p className="text-xs text-gray-400">Group employees by criteria for targeted actions</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search segments…"
                className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl w-44 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <button onClick={()=>setModal({})}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-xl"
              style={{background:'linear-gradient(135deg,#0A1F5C,#2563EB)'}}>
              <Plus size={15}/> New Segment
            </button>
          </div>
        </div>
      </motion.div>

      <div className="px-7 py-6">
        {isLoading && <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading…</div>}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 gap-3 text-gray-400">
            <Layers size={40} className="text-gray-200"/>
            <p className="text-sm">No segments yet. Create one to group employees by dept, location, or type.</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((seg, i) => {
            const count = getMatchCount(seg);
            const color = seg.color || '#2563EB';
            const criteria = seg.criteria || {};
            const criteriaKeys = Object.entries(criteria).filter(([,v])=>v);
            return (
              <motion.div key={seg.id} {...fade(i*0.05)}
                className="bg-white rounded-2xl border overflow-hidden"
                style={{borderColor:`${color}25`, boxShadow:`0 2px 12px ${color}12`}}>
                <div className="px-5 py-4" style={{borderLeft:`4px solid ${color}`}}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 text-sm">{seg.name}</p>
                      {seg.description && <p className="text-xs text-gray-500 mt-0.5 truncate">{seg.description}</p>}
                    </div>
                    <div className="flex gap-1.5 ml-2">
                      <button onClick={()=>setModal(seg)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Edit2 size={13}/>
                      </button>
                      <button onClick={()=>{ if(window.confirm('Delete segment?')) deleteMut.mutate(seg.id); }}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>

                  {/* Count */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{background:`${color}12`}}>
                      <Users size={14} style={{color}}/>
                      <span className="font-bold text-sm" style={{color}}>{count}</span>
                      <span className="text-xs" style={{color:`${color}cc`}}>employees</span>
                    </div>
                  </div>

                  {/* Criteria tags */}
                  {criteriaKeys.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {criteriaKeys.map(([k,v]) => {
                        const field = CRITERIA_FIELDS.find(f=>f.key===k);
                        return (
                          <span key={k} className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                            {field?.label||k}: {v}
                          </span>
                        );
                      })}
                    </div>
                  )}
                  {criteriaKeys.length === 0 && (
                    <p className="text-[11px] text-gray-400 mt-2 italic">No criteria — matches all employees</p>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      <AnimatePresence>
        {modal !== null && (
          <SegmentModal
            seg={modal?.id ? modal : null}
            employees={employees}
            onClose={()=>setModal(null)}
            onSave={(form)=>createMut.mutate(form)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
