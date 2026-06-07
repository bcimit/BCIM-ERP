// src/pages/hr-admin/AppraisalPage.jsx — 2026 Premium UI
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Plus, X, TrendingUp, Users, Award, ChevronRight } from 'lucide-react';
import { hrAppraisalsAPI, hrEmployeesAPI } from '../../api/client';
import toast from 'react-hot-toast';

const B = { navy:'#0A1F5C', blue:'#2563EB', yellow:'#F4C430', success:'#10B981', warning:'#F59E0B', danger:'#EF4444' };
const fade = (d=0) => ({ initial:{opacity:0,y:14}, animate:{opacity:1,y:0}, transition:{duration:0.35,delay:d,ease:[0.16,1,0.3,1]} });
const AVATAR_COLORS = [['#6366F1','#4F46E5'],['#0EA5E9','#0284C7'],['#10B981','#059669'],['#F59E0B','#D97706'],['#EF4444','#DC2626'],['#8B5CF6','#7C3AED']];
const avatarGrad = (n) => AVATAR_COLORS[(n?.charCodeAt(0)||0)%AVATAR_COLORS.length];
const initials   = (n) => (n||'U').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();

const RATING_CFG = {
  outstanding: { bg:'bg-emerald-50', text:'text-emerald-700', bar:'bg-emerald-500' },
  exceeds:     { bg:'bg-blue-50',    text:'text-blue-700',    bar:'bg-blue-500'    },
  meets:       { bg:'bg-indigo-50',  text:'text-indigo-700',  bar:'bg-indigo-500'  },
  below:       { bg:'bg-amber-50',   text:'text-amber-700',   bar:'bg-amber-500'   },
  poor:        { bg:'bg-red-50',     text:'text-red-700',     bar:'bg-red-500'     },
};

const STATUS_CFG = {
  pending:   { label:'Pending',   bg:'bg-amber-50',  text:'text-amber-700',  dot:'bg-amber-400'  },
  completed: { label:'Completed', bg:'bg-blue-50',   text:'text-blue-700',   dot:'bg-blue-500'   },
  approved:  { label:'Approved',  bg:'bg-emerald-50',text:'text-emerald-700',dot:'bg-emerald-500' },
};

const SCORE_PCT = { outstanding:100, exceeds:80, meets:60, below:40, poor:20 };
const inp = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all";
const lbl = "text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5";

export default function AppraisalPage() {
  const [modal, setModal]   = useState(false);
  const [detail, setDetail] = useState(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['hr-appraisals'],
    queryFn:  () => hrAppraisalsAPI.list().then(r => r.data),
  });
  const appraisals = data?.data || [];

  const outstanding  = appraisals.filter(a=>a.rating==='outstanding').length;
  const withInc      = appraisals.filter(a=>a.increment_percentage);
  const avgIncrement = withInc.length
    ? (withInc.reduce((s,a)=>s+parseFloat(a.increment_percentage||0),0)/withInc.length).toFixed(1)
    : '—';

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{background:'#F8FAFC'}}>

      {/* Header */}
      <motion.div {...fade(0)} className="relative overflow-hidden rounded-2xl"
        style={{background:`linear-gradient(135deg,${B.navy},#1e3a8a)`,boxShadow:'0 8px 32px rgba(10,31,92,0.2)'}}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.07]"
          style={{background:'radial-gradient(circle,#fff,transparent 70%)',transform:'translate(25%,-25%)'}}/>
        <div className="relative z-10 px-8 py-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-xl bg-white/15 flex items-center justify-center">
                <Star className="w-4 h-4 text-white"/>
              </div>
              <span className="text-white/60 text-sm font-semibold">HR & Admin</span>
            </div>
            <h1 className="text-2xl font-black text-white">Performance Appraisals</h1>
            <p className="text-white/55 text-sm mt-1">Yearly employee performance reviews</p>
          </div>
          <button onClick={()=>setModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black shadow-lg hover:opacity-90 self-start"
            style={{background:B.yellow,color:B.navy}}>
            <Plus className="w-4 h-4"/> New Appraisal
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div {...fade(0.08)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Appraisals', value:appraisals.length,                              icon:Users,     color:B.blue,    bg:'#EFF6FF' },
          { label:'Outstanding',      value:outstanding,                                    icon:Award,     color:B.success, bg:'#ECFDF5' },
          { label:'Avg Increment',    value:`${avgIncrement}%`,                             icon:TrendingUp,color:B.warning, bg:'#FFFBEB' },
          { label:'Pending',          value:appraisals.filter(a=>a.status==='pending').length, icon:Star,   color:'#6366F1', bg:'#EEF2FF' },
        ].map((c,i)=>(
          <motion.div key={c.label} {...fade(0.08+i*0.04)} className="bg-white rounded-2xl p-5 border border-gray-100"
            style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{c.label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:c.bg}}>
                <c.icon className="w-4 h-4" style={{color:c.color}}/>
              </div>
            </div>
            <p className="text-2xl font-black text-gray-900">{c.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Cards Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"/>
        </div>
      ) : appraisals.length===0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16"
          style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Star className="w-7 h-7 text-gray-300"/>
          </div>
          <p className="text-gray-500 font-bold">No appraisals yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "New Appraisal" to get started</p>
        </div>
      ) : (
        <motion.div {...fade(0.16)} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {appraisals.map((a,i)=>{
            const rt = RATING_CFG[a.rating]||RATING_CFG.meets;
            const st = STATUS_CFG[a.status]||STATUS_CFG.pending;
            const pct = SCORE_PCT[a.rating]||60;
            const [g1,g2] = avatarGrad(a.employee_name);
            return (
              <motion.div key={a.id} {...fade(0.16+i*0.03)}
                className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg transition-all cursor-pointer"
                style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}
                onClick={()=>setDetail(a)}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-black flex-shrink-0"
                      style={{background:`linear-gradient(135deg,${g1},${g2})`}}>
                      {initials(a.employee_name)}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{a.employee_name}</p>
                      <p className="text-xs text-gray-400">{a.designation||a.department}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${st.bg} ${st.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{st.label}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium">Performance Score</span>
                    <span className={`font-bold px-2 py-0.5 rounded-full capitalize ${rt.bg} ${rt.text}`}>{a.rating||'—'}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${rt.bar}`} style={{width:`${pct}%`}}/>
                  </div>
                </div>

                {a.kra_scores && typeof a.kra_scores==='object' && Object.keys(a.kra_scores).length>0 && (
                  <div className="space-y-1.5 mb-4 border-t border-gray-50 pt-3">
                    {Object.entries(a.kra_scores).slice(0,3).map(([k,v])=>(
                      <div key={k} className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 truncate max-w-[120px]">{k}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-400 rounded-full" style={{width:`${(v/10)*100}%`}}/>
                          </div>
                          <span className="text-xs font-bold text-gray-700 w-8 text-right">{v}/10</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="text-xs text-gray-400">
                    {a.appraisal_year && <span>FY {a.appraisal_year}</span>}
                    {a.increment_percentage && <span className="ml-2 font-bold text-emerald-600">+{a.increment_percentage}% increment</span>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300"/>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {modal  && <AppraisalModal onClose={()=>setModal(false)} onSuccess={()=>{ setModal(false); refetch(); }}/>}
      {detail && <DetailModal appraisal={detail} onClose={()=>setDetail(null)}/>}
    </div>
  );
}

function AppraisalModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ user_id:'', appraisal_year:new Date().getFullYear(), rating:'meets', comments:'', increment_percentage:'' });
  const {data:empData} = useQuery({queryKey:['hr-employees-active'],queryFn:()=>hrEmployeesAPI.list({employment_status:'active'}).then(r=>r.data)});
  const s = (k,v) => setForm(p=>({...p,[k]:v}));

  const [kras, setKras] = useState([{key:'Quality of Work',value:8},{key:'Productivity',value:7},{key:'Team Collaboration',value:8}]);
  const addKra = () => setKras(p=>[...p,{key:'',value:5}]);
  const updKra = (i,f,v) => setKras(p=>p.map((r,j)=>j===i?{...r,[f]:v}:r));

  const createMut = useMutation({
    mutationFn:(d)=>hrAppraisalsAPI.create(d),
    onSuccess:()=>{ toast.success('Appraisal saved'); onSuccess(); },
    onError:e=>toast.error(e.response?.data?.error||'Error'),
  });

  const handleSubmit = () => {
    if (!form.user_id) return toast.error('Select employee');
    const kraObj = {};
    kras.forEach(r=>{ if(r.key) kraObj[r.key]=Number(r.value); });
    createMut.mutate({ ...form, kra_scores:kraObj });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)'}}>
      <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
        transition={{duration:0.22}} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 flex-shrink-0"
          style={{background:`linear-gradient(135deg,${B.navy},#1e3a8a)`}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-white"/>
            </div>
            <p className="font-bold text-white">New Performance Appraisal</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X className="w-4 h-4"/></button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div><label className={lbl}>Employee</label>
            <select className={inp} value={form.user_id} onChange={e=>s('user_id',e.target.value)}>
              <option value="">Select Employee</option>
              {(empData?.data||[]).map(e=><option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Appraisal Year</label>
              <input className={inp} type="number" value={form.appraisal_year} onChange={e=>s('appraisal_year',e.target.value)}/>
            </div>
            <div><label className={lbl}>Overall Rating</label>
              <select className={inp} value={form.rating} onChange={e=>s('rating',e.target.value)}>
                {Object.keys(RATING_CFG).map(r=><option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={lbl}>KRA Scores</label>
              <button onClick={addKra} className="text-xs font-bold text-blue-600 hover:text-blue-800">+ Add KRA</button>
            </div>
            <div className="space-y-2">
              {kras.map((r,i)=>(
                <div key={i} className="flex gap-2">
                  <input className={`${inp} flex-1`} placeholder="KRA Name" value={r.key} onChange={e=>updKra(i,'key',e.target.value)}/>
                  <input className={`${inp} w-20`} type="number" min="0" max="10" value={r.value} onChange={e=>updKra(i,'value',e.target.value)}/>
                  <button onClick={()=>setKras(p=>p.filter((_,j)=>j!==i))} className="p-2 text-red-400 hover:text-red-600"><X className="w-4 h-4"/></button>
                </div>
              ))}
            </div>
          </div>
          <div><label className={lbl}>Increment % (optional)</label>
            <input className={inp} type="number" placeholder="e.g. 10" value={form.increment_percentage} onChange={e=>s('increment_percentage',e.target.value)}/>
          </div>
          <div><label className={lbl}>Comments</label>
            <textarea className={inp} rows={3} placeholder="Performance comments…" value={form.comments} onChange={e=>s('comments',e.target.value)}/>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6 flex-shrink-0">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold">Cancel</button>
          <button onClick={handleSubmit} disabled={createMut.isPending}
            className="flex-1 py-2.5 text-white rounded-xl text-sm font-black disabled:opacity-50"
            style={{background:`linear-gradient(135deg,${B.blue},${B.navy})`}}>
            {createMut.isPending?'Saving…':'Save Appraisal'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DetailModal({ appraisal:a, onClose }) {
  const rt = RATING_CFG[a.rating]||RATING_CFG.meets;
  const st = STATUS_CFG[a.status]||STATUS_CFG.pending;
  const pct = SCORE_PCT[a.rating]||60;
  const [g1,g2] = avatarGrad(a.employee_name);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)'}}>
      <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
        transition={{duration:0.22}} className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100"
          style={{background:`linear-gradient(135deg,${B.navy},#1e3a8a)`}}>
          <p className="font-bold text-white">Appraisal Detail</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X className="w-4 h-4"/></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black"
              style={{background:`linear-gradient(135deg,${g1},${g2})`}}>
              {initials(a.employee_name)}
            </div>
            <div>
              <p className="font-black text-gray-900 text-lg">{a.employee_name}</p>
              <p className="text-sm text-gray-500">{a.designation} · FY {a.appraisal_year}</p>
            </div>
            <div className="ml-auto">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${st.bg} ${st.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{st.label}
              </span>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold text-gray-700">Overall Rating</span>
              <span className={`text-sm font-black capitalize px-3 py-1 rounded-full ${rt.bg} ${rt.text}`}>{a.rating}</span>
            </div>
            <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${rt.bar}`} style={{width:`${pct}%`}}/>
            </div>
          </div>

          {a.kra_scores && typeof a.kra_scores==='object' && Object.keys(a.kra_scores).length>0 && (
            <div>
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-3">KRA Breakdown</p>
              <div className="space-y-2.5">
                {Object.entries(a.kra_scores).map(([k,v])=>(
                  <div key={k}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 font-medium">{k}</span>
                      <span className="font-black text-gray-900">{v}/10</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-400 rounded-full" style={{width:`${(v/10)*100}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {a.increment_percentage && (
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-emerald-600 uppercase tracking-wide">Increment</p>
                <p className="text-2xl font-black text-emerald-700">{a.increment_percentage}%</p>
              </div>
            )}
            {a.comments && (
              <div className={`bg-gray-50 rounded-xl p-3 ${!a.increment_percentage?'col-span-2':''}`}>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Comments</p>
                <p className="text-sm text-gray-700">{a.comments}</p>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
