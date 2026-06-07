// src/pages/hr-admin/DepartmentPage.jsx — 2026 Premium UI
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, Plus, Edit2, Trash2, Award, Search, X, Layers } from 'lucide-react';
import { hrMastersAPI } from '../../api/client';
import toast from 'react-hot-toast';

const B = { navy:'#0A1F5C', blue:'#2563EB', yellow:'#F4C430' };
const fade = (d=0) => ({ initial:{opacity:0,y:14}, animate:{opacity:1,y:0}, transition:{duration:0.35,delay:d,ease:[0.16,1,0.3,1]} });
const inp = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all';
const lbl = 'text-xs font-black text-gray-600 uppercase tracking-wide block mb-1.5';

const ACCENT_COLORS = [
  { bg:'bg-blue-500',    light:'bg-blue-50',    text:'text-blue-700',    border:'border-blue-200',    dot:'#3b82f6' },
  { bg:'bg-violet-500',  light:'bg-violet-50',  text:'text-violet-700',  border:'border-violet-200',  dot:'#8b5cf6' },
  { bg:'bg-emerald-500', light:'bg-emerald-50', text:'text-emerald-700', border:'border-emerald-200', dot:'#10b981' },
  { bg:'bg-amber-500',   light:'bg-amber-50',   text:'text-amber-700',   border:'border-amber-200',   dot:'#f59e0b' },
  { bg:'bg-rose-500',    light:'bg-rose-50',    text:'text-rose-700',    border:'border-rose-200',    dot:'#f43f5e' },
  { bg:'bg-cyan-500',    light:'bg-cyan-50',    text:'text-cyan-700',    border:'border-cyan-200',    dot:'#06b6d4' },
  { bg:'bg-pink-500',    light:'bg-pink-50',    text:'text-pink-700',    border:'border-pink-200',    dot:'#ec4899' },
  { bg:'bg-teal-500',    light:'bg-teal-50',    text:'text-teal-700',    border:'border-teal-200',    dot:'#14b8a6' },
  { bg:'bg-orange-500',  light:'bg-orange-50',  text:'text-orange-700',  border:'border-orange-200',  dot:'#f97316' },
  { bg:'bg-indigo-500',  light:'bg-indigo-50',  text:'text-indigo-700',  border:'border-indigo-200',  dot:'#6366f1' },
];
const accent = (name) => ACCENT_COLORS[(name?.charCodeAt(0)||0) % ACCENT_COLORS.length];
const initials = (name) => name?.split(/\s+/).map(w=>w[0]).join('').toUpperCase().slice(0,2)||'?';

/* ── Modal ──────────────────────────────────────────────────────────── */
function Modal({ title, icon:Icon, onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{duration:0.2}}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        <div className="relative px-6 py-4 flex items-center justify-between"
          style={{background:`linear-gradient(135deg,#0A1F5C,#1e3a8a)`}}>
          <div className="absolute inset-0 opacity-[0.07]"
            style={{background:'radial-gradient(circle at 80% 50%,#fff,transparent 70%)'}}/>
          <div className="relative z-10 flex items-center gap-2.5">
            {Icon && <Icon className="w-4 h-4 text-white/80"/>}
            <h2 className="text-sm font-black text-white">{title}</h2>
          </div>
          <button onClick={onClose} className="relative z-10 p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-lg transition">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </motion.div>
    </div>
  );
}

/* ── DeptModal ──────────────────────────────────────────────────────── */
function DeptModal({ dept, onClose, onSave, loading }) {
  const [name, setName] = useState(dept?.name||'');
  return (
    <Modal title={dept?'Edit Department':'New Department'} icon={Building2} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={lbl}>Department Name</label>
          <input className={inp} value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g. Finance & Accounts" autoFocus/>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose}
          className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition">
          Cancel
        </button>
        <button onClick={()=>name.trim()&&onSave({name:name.trim()})}
          disabled={!name.trim()||loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition"
          style={{background:`linear-gradient(135deg,${B.blue},${B.navy})`}}>
          {loading?'Saving…':'Save'}
        </button>
      </div>
    </Modal>
  );
}

/* ── DesigModal ─────────────────────────────────────────────────────── */
function DesigModal({ desig, departments, onClose, onSave, loading }) {
  const [name,   setName]   = useState(desig?.name||'');
  const [deptId, setDeptId] = useState(desig?.department_id||'');
  const [grade,  setGrade]  = useState(desig?.grade||'');
  return (
    <Modal title={desig?.id?'Edit Designation':'New Designation'} icon={Award} onClose={onClose}>
      <div className="space-y-4">
        <div>
          <label className={lbl}>Designation Title</label>
          <input className={inp} value={name} onChange={e=>setName(e.target.value)}
            placeholder="e.g. Project Manager" autoFocus/>
        </div>
        <div>
          <label className={lbl}>Department</label>
          <select className={inp} value={deptId} onChange={e=>setDeptId(e.target.value)}>
            <option value="">— Unassigned —</option>
            {departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div>
          <label className={lbl}>Grade / Level (optional)</label>
          <input className={inp} value={grade} onChange={e=>setGrade(e.target.value)}
            placeholder="e.g. L1, Senior, M2"/>
        </div>
      </div>
      <div className="flex gap-3 mt-6">
        <button onClick={onClose}
          className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition">
          Cancel
        </button>
        <button onClick={()=>name.trim()&&onSave({name:name.trim(),department_id:deptId||null,grade})}
          disabled={!name.trim()||loading}
          className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition"
          style={{background:`linear-gradient(135deg,#7c3aed,#6d28d9)`}}>
          {loading?'Saving…':'Save'}
        </button>
      </div>
    </Modal>
  );
}

/* ── Department card ─────────────────────────────────────────────────── */
function DeptCard({ dept, desigs, isActive, onClick, onEdit, onDelete, onAddDesig }) {
  const c = accent(dept.name);
  return (
    <div onClick={onClick}
      className={`group relative rounded-2xl border-2 cursor-pointer transition-all duration-200 bg-white ${
        isActive ? `${c.border} shadow-lg` : 'border-gray-100 hover:border-gray-200 hover:shadow-md'
      }`}
      style={{boxShadow:isActive?`0 4px 20px ${c.dot}20`:undefined}}>

      {/* Left accent bar */}
      <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full ${c.bg} transition-all duration-200 ${isActive?'opacity-100':'opacity-30 group-hover:opacity-60'}`}/>

      <div className="pl-5 pr-4 py-3.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-xl ${c.light} border ${c.border} flex items-center justify-center shrink-0`}>
              <span className={`text-xs font-black ${c.text}`}>{initials(dept.name)}</span>
            </div>
            <div className="min-w-0">
              <p className={`font-black text-sm truncate ${isActive?'text-gray-900':'text-gray-800'}`}>{dept.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">{desigs.length} designation{desigs.length!==1?'s':''}</p>
            </div>
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e=>e.stopPropagation()}>
            <button onClick={()=>onAddDesig(dept.id)} title="Add designation"
              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
              <Plus className="w-3.5 h-3.5"/>
            </button>
            <button onClick={()=>onEdit(dept)} title="Edit"
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
              <Edit2 className="w-3.5 h-3.5"/>
            </button>
            <button onClick={()=>window.confirm(`Delete "${dept.name}"?`)&&onDelete(dept.id)} title="Delete"
              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
              <Trash2 className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>

        {/* Designation pills */}
        {desigs.length>0 && (
          <div className="flex flex-wrap gap-1.5 mt-2.5 pl-[52px]">
            {desigs.slice(0,4).map(d=>(
              <span key={d.id} className={`text-[10px] font-bold ${c.light} ${c.text} px-2 py-0.5 rounded-full border ${c.border} truncate max-w-[130px]`}>
                {d.name}
              </span>
            ))}
            {desigs.length>4 && (
              <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                +{desigs.length-4}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Designation tile ────────────────────────────────────────────────── */
function DesigTile({ d, deptName, onEdit, onDelete }) {
  const c = accent(deptName||d.name);
  return (
    <div className="flex items-center justify-between px-4 py-3 rounded-xl hover:bg-gray-50 border border-transparent hover:border-gray-100 transition-all group">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-8 h-8 rounded-lg ${c.light} border ${c.border} flex items-center justify-center shrink-0`}>
          <span className={`text-[10px] font-black ${c.text}`}>{initials(d.name)}</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-black text-gray-900 truncate">{d.name}</p>
          {d.grade && <p className="text-[10px] text-gray-400 mt-0.5">Grade: {d.grade}</p>}
        </div>
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {d.grade && (
          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full mr-1">{d.grade}</span>
        )}
        <button onClick={()=>onEdit(d)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition">
          <Edit2 className="w-3 h-3"/>
        </button>
        <button onClick={()=>window.confirm(`Delete "${d.name}"?`)&&onDelete(d.id)}
          className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition">
          <Trash2 className="w-3 h-3"/>
        </button>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────────────── */
export default function DepartmentPage() {
  const qc = useQueryClient();
  const [deptModal,    setDeptModal]    = useState(null);
  const [desigModal,   setDesigModal]   = useState(null);
  const [activeDeptId, setActiveDeptId] = useState(null);
  const [search,       setSearch]       = useState('');

  const { data:deptData  } = useQuery({ queryKey:['hr-departments'],  queryFn:()=>hrMastersAPI.listDepts().then(r=>r.data)  });
  const { data:desigData } = useQuery({ queryKey:['hr-designations'], queryFn:()=>hrMastersAPI.listDesigs().then(r=>r.data) });

  const departments  = deptData?.data  || [];
  const designations = desigData?.data || [];
  const inv = () => { qc.invalidateQueries({queryKey:['hr-departments']}); qc.invalidateQueries({queryKey:['hr-designations']}); };

  const saveDeptMut  = useMutation({ mutationFn:d=>deptModal?.id?hrMastersAPI.updateDept(deptModal.id,d):hrMastersAPI.createDept(d),       onSuccess:()=>{toast.success('Saved');inv();setDeptModal(null);},  onError:e=>toast.error(e.response?.data?.error||'Error') });
  const delDeptMut   = useMutation({ mutationFn:id=>hrMastersAPI.deleteDept(id),  onSuccess:()=>{toast.success('Deleted');inv();if(activeDeptId===arguments[0])setActiveDeptId(null);}, onError:e=>toast.error(e.response?.data?.error||'Error') });
  const saveDesigMut = useMutation({ mutationFn:d=>desigModal?.id?hrMastersAPI.updateDesig(desigModal.id,d):hrMastersAPI.createDesig(d),   onSuccess:()=>{toast.success('Saved');inv();setDesigModal(null);}, onError:e=>toast.error(e.response?.data?.error||'Error') });
  const delDesigMut  = useMutation({ mutationFn:id=>hrMastersAPI.deleteDesig(id), onSuccess:()=>{toast.success('Deleted');inv();},          onError:e=>toast.error(e.response?.data?.error||'Error') });

  const filteredDepts = departments.filter(d=>d.name.toLowerCase().includes(search.toLowerCase()));
  const activeDept    = departments.find(d=>d.id===activeDeptId);
  const panelDesigs   = activeDeptId ? designations.filter(d=>d.department_id===activeDeptId) : designations;
  const unassigned    = designations.filter(d=>!d.department_id);

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{background:'#F8FAFC'}}>

      {/* Header */}
      <motion.div {...fade(0)} className="relative overflow-hidden rounded-2xl"
        style={{background:`linear-gradient(135deg,#0A1F5C,#1e3a8a)`,boxShadow:'0 8px 32px rgba(10,31,92,0.2)'}}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.07]"
          style={{background:'radial-gradient(circle,#fff,transparent 70%)',transform:'translate(25%,-25%)'}}/>
        <div className="relative z-10 px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Layers className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Departments & Designations</h1>
              <p className="text-white/55 text-sm mt-0.5">Manage your organisation structure</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
              <Building2 className="w-4 h-4 text-white/70"/>
              <span className="text-lg font-black text-white leading-none">{departments.length}</span>
              <span className="text-xs text-white/50 font-bold">Depts</span>
            </div>
            <div className="flex items-center gap-2.5 bg-white/10 border border-white/20 rounded-xl px-4 py-2.5">
              <Award className="w-4 h-4 text-white/70"/>
              <span className="text-lg font-black text-white leading-none">{designations.length}</span>
              <span className="text-xs text-white/50 font-bold">Desigs</span>
            </div>
            <button onClick={()=>setDesigModal({department_id:activeDeptId||''})}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-sm font-bold transition">
              <Plus className="w-4 h-4"/> Designation
            </button>
            <button onClick={()=>setDeptModal('new')}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black transition"
              style={{background:B.yellow,color:B.navy}}>
              <Plus className="w-4 h-4"/> Department
            </button>
          </div>
        </div>
      </motion.div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5" style={{minHeight:560}}>

        {/* LEFT — Department list */}
        <motion.div {...fade(0.08)} className="lg:col-span-2 flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search departments…"
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all"
              style={{boxShadow:'0 1px 4px rgba(10,31,92,0.06)'}}/>
            {search && (
              <button onClick={()=>setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4"/>
              </button>
            )}
          </div>

          <div className="space-y-2 overflow-y-auto" style={{maxHeight:520}}>
            {filteredDepts.map(dept=>(
              <DeptCard
                key={dept.id} dept={dept}
                desigs={designations.filter(d=>d.department_id===dept.id)}
                isActive={activeDeptId===dept.id}
                onClick={()=>setActiveDeptId(activeDeptId===dept.id?null:dept.id)}
                onEdit={d=>setDeptModal(d)}
                onDelete={id=>delDeptMut.mutate(id)}
                onAddDesig={deptId=>setDesigModal({department_id:deptId})}
              />
            ))}
            {filteredDepts.length===0 && (
              <div className="text-center py-16 text-gray-400">
                <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20"/>
                <p className="text-sm">{search?'No departments match':'No departments yet'}</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* RIGHT — Designations panel */}
        <motion.div {...fade(0.12)} className="lg:col-span-3 bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col"
          style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0">
            {activeDept ? (
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${accent(activeDept.name).light} border ${accent(activeDept.name).border} flex items-center justify-center`}>
                  <span className={`text-xs font-black ${accent(activeDept.name).text}`}>{initials(activeDept.name)}</span>
                </div>
                <div>
                  <p className="font-black text-gray-900 text-sm">{activeDept.name}</p>
                  <p className="text-xs text-gray-400">{panelDesigs.length} designation{panelDesigs.length!==1?'s':''}</p>
                </div>
                <button onClick={()=>setActiveDeptId(null)} className="ml-2 p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                  <X className="w-3.5 h-3.5"/>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-violet-500"/>
                <span className="text-sm font-black text-gray-900">All Designations</span>
                <span className="text-xs font-black bg-violet-50 text-violet-700 border border-violet-200 px-2 py-0.5 rounded-full">{designations.length}</span>
              </div>
            )}
            <button onClick={()=>setDesigModal({department_id:activeDeptId||''})}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition">
              <Plus className="w-3.5 h-3.5"/> Add
            </button>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5">
            {panelDesigs.length>0
              ? panelDesigs.map(d=>(
                  <DesigTile key={d.id} d={d}
                    deptName={departments.find(dept=>dept.id===d.department_id)?.name}
                    onEdit={d=>setDesigModal(d)}
                    onDelete={id=>delDesigMut.mutate(id)}
                  />
                ))
              : (
                <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                  <Award className="w-12 h-12 mb-3 opacity-20"/>
                  <p className="text-sm">{activeDeptId?'No designations in this department':'No designations yet'}</p>
                  <button onClick={()=>setDesigModal({department_id:activeDeptId||''})}
                    className="mt-4 px-4 py-2 text-xs font-black text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 rounded-xl transition">
                    + Add Designation
                  </button>
                </div>
              )
            }
            {/* Unassigned section */}
            {!activeDeptId && unassigned.length>0 && (
              <div className="pt-3 mt-2 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-4 mb-2">Unassigned</p>
                {unassigned.map(d=>(
                  <DesigTile key={d.id} d={d} deptName={null}
                    onEdit={d=>setDesigModal(d)}
                    onDelete={id=>delDesigMut.mutate(id)}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Modals */}
      {deptModal && (
        <DeptModal dept={deptModal==='new'?null:deptModal} loading={saveDeptMut.isPending}
          onClose={()=>setDeptModal(null)} onSave={d=>saveDeptMut.mutate(d)}/>
      )}
      {desigModal && (
        <DesigModal
          desig={desigModal==='new'?null:(typeof desigModal==='object'&&desigModal.name?desigModal:{department_id:desigModal?.department_id||''})}
          departments={departments} loading={saveDesigMut.isPending}
          onClose={()=>setDesigModal(null)} onSave={d=>saveDesigMut.mutate(d)}/>
      )}
    </div>
  );
}
