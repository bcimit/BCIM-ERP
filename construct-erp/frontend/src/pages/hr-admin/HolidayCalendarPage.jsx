// src/pages/hr-admin/HolidayCalendarPage.jsx — 2026 Premium UI
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Plus, Trash2, Calendar, X, Flag } from 'lucide-react';
import { hrMastersAPI } from '../../api/client';
import toast from 'react-hot-toast';

const B = { navy:'#0A1F5C', blue:'#2563EB', yellow:'#F4C430' };
const fade = (d=0) => ({ initial:{opacity:0,y:14}, animate:{opacity:1,y:0}, transition:{duration:0.35,delay:d,ease:[0.16,1,0.3,1]} });

const TYPE_CFG = {
  national: { bg:'bg-red-50',    text:'text-red-700',    dot:'bg-red-500',    label:'National'  },
  festival: { bg:'bg-amber-50',  text:'text-amber-700',  dot:'bg-amber-500',  label:'Festival'  },
  optional: { bg:'bg-blue-50',   text:'text-blue-700',   dot:'bg-blue-500',   label:'Optional'  },
};

const INDIAN_HOLIDAYS_2026 = [
  { name:'Republic Day',     date:'2026-01-26', type:'national' },
  { name:'Holi',             date:'2026-03-03', type:'festival' },
  { name:'Good Friday',      date:'2026-04-03', type:'national' },
  { name:'Ram Navami',       date:'2026-04-08', type:'festival' },
  { name:'Eid ul-Fitr',      date:'2026-03-31', type:'festival' },
  { name:'Maharashtra Day',  date:'2026-05-01', type:'national' },
  { name:'Independence Day', date:'2026-08-15', type:'national' },
  { name:'Onam',             date:'2026-09-07', type:'festival' },
  { name:'Gandhi Jayanti',   date:'2026-10-02', type:'national' },
  { name:'Dussehra',         date:'2026-10-20', type:'festival' },
  { name:'Diwali',           date:'2026-11-08', type:'festival' },
  { name:'Christmas',        date:'2026-12-25', type:'national' },
];

const MONTHS_FULL = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const inp = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all";
const lbl = "text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5";

export default function HolidayCalendarPage() {
  const qc = useQueryClient();
  const [year,  setYear]  = useState(new Date().getFullYear());
  const [modal, setModal] = useState(false);
  const [form,  setForm]  = useState({ holiday_date:'', name:'', holiday_type:'national' });
  const s = (k,v) => setForm(p=>({...p,[k]:v}));

  const { data, isLoading } = useQuery({
    queryKey:['hr-holidays', year],
    queryFn:()=>hrMastersAPI.listHolidays({ year }).then(r=>r.data),
  });
  const holidays = data?.data || [];

  const createMut = useMutation({
    mutationFn:(d)=>hrMastersAPI.createHoliday(d),
    onSuccess:()=>{ toast.success('Holiday added'); qc.invalidateQueries({ queryKey:['hr-holidays'] }); setModal(false); setForm({ holiday_date:'',name:'',holiday_type:'national' }); },
    onError:e=>toast.error(e.response?.data?.error||'Error'),
  });
  const deleteMut = useMutation({
    mutationFn:(id)=>hrMastersAPI.deleteHoliday(id),
    onSuccess:()=>{ toast.success('Removed'); qc.invalidateQueries({ queryKey:['hr-holidays'] }); },
    onError:e=>toast.error(e.response?.data?.error||'Error'),
  });

  const bulkImport = async () => {
    for (const h of INDIAN_HOLIDAYS_2026) {
      try { await hrMastersAPI.createHoliday({ holiday_date:h.date, name:h.name, holiday_type:h.type }); } catch {}
    }
    toast.success('Imported default holidays');
    qc.invalidateQueries({ queryKey:['hr-holidays'] });
  };

  const byMonth = Array.from({ length:12 }, (_,i) => ({
    month:i+1,
    holidays:holidays.filter(h=>new Date(h.holiday_date).getMonth()===i),
  })).filter(m=>m.holidays.length>0);

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
            <h1 className="text-2xl font-black text-white">Holiday Calendar</h1>
            <p className="text-white/55 text-sm mt-1">Company holidays &amp; non-working days</p>
          </div>
          <div className="flex items-center gap-2 self-start flex-wrap">
            <select value={year} onChange={e=>setYear(parseInt(e.target.value))}
              className="px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none">
              {[2024,2025,2026,2027].map(y=><option key={y} value={y} className="text-gray-900">{y}</option>)}
            </select>
            {holidays.length===0 && (
              <button onClick={bulkImport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold hover:opacity-90"
                style={{background:'rgba(255,255,255,0.15)',color:'#fff',border:'1px solid rgba(255,255,255,0.2)'}}>
                <Calendar className="w-4 h-4"/> Import Defaults
              </button>
            )}
            <button onClick={()=>setModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black shadow-lg hover:opacity-90"
              style={{background:B.yellow,color:B.navy}}>
              <Plus className="w-4 h-4"/> Add Holiday
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div {...fade(0.08)} className="grid grid-cols-3 gap-4">
        {['national','festival','optional'].map((type,i)=>{
          const cfg = TYPE_CFG[type];
          const count = holidays.filter(h=>h.holiday_type===type).length;
          return (
            <motion.div key={type} {...fade(0.08+i*0.04)} className="bg-white rounded-2xl p-5 border border-gray-100"
              style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`}/>
                <p className={`text-xs font-bold uppercase tracking-wide ${cfg.text}`}>{cfg.label}</p>
              </div>
              <p className="text-3xl font-black text-gray-900">{count}</p>
              <p className="text-xs text-gray-400 mt-1">holiday{count!==1?'s':''}</p>
            </motion.div>
          );
        })}
      </motion.div>

      {/* Calendar List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"/>
        </div>
      ) : byMonth.length===0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 text-center py-16"
          style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
          <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <Star className="w-7 h-7 text-gray-300"/>
          </div>
          <p className="text-gray-500 font-bold">No holidays for {year}</p>
          <button onClick={bulkImport} className="mt-3 text-blue-600 hover:text-blue-800 text-sm font-bold underline">
            Import default Indian holidays
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {byMonth.map(({ month, holidays:mh })=>(
            <motion.div key={month} {...fade(0.12)} className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
              style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                <span className="font-black text-gray-900">{MONTHS_FULL[month-1]} {year}</span>
                <span className="text-xs text-gray-400 font-medium">{mh.length} holiday{mh.length!==1?'s':''}</span>
              </div>
              <div className="divide-y divide-gray-50">
                {mh.sort((a,b)=>new Date(a.holiday_date)-new Date(b.holiday_date)).map(h=>{
                  const cfg = TYPE_CFG[h.holiday_type]||TYPE_CFG.national;
                  const dt  = new Date(h.holiday_date);
                  return (
                    <div key={h.id} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="text-center w-12 flex-shrink-0">
                          <div className="text-2xl font-black text-gray-900">{dt.getDate()}</div>
                          <div className="text-xs text-gray-400 font-medium">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][dt.getDay()]}</div>
                        </div>
                        <div>
                          <div className="font-bold text-gray-900">{h.name}</div>
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full mt-0.5 capitalize ${cfg.bg} ${cfg.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`}/>{cfg.label}
                          </span>
                        </div>
                      </div>
                      <button onClick={()=>window.confirm('Remove holiday?')&&deleteMut.mutate(h.id)}
                        className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Add Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)'}}>
          <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
            transition={{duration:0.22}} className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100"
              style={{background:`linear-gradient(135deg,${B.navy},#1e3a8a)`}}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
                  <Flag className="w-5 h-5 text-white"/>
                </div>
                <p className="font-bold text-white">Add Holiday</p>
              </div>
              <button onClick={()=>setModal(false)} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X className="w-4 h-4"/></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div><label className={lbl}>Date</label>
                <input type="date" className={inp} value={form.holiday_date} onChange={e=>s('holiday_date',e.target.value)}/>
              </div>
              <div><label className={lbl}>Holiday Name</label>
                <input className={inp} value={form.name} onChange={e=>s('name',e.target.value)} placeholder="e.g. Diwali"/>
              </div>
              <div><label className={lbl}>Type</label>
                <select className={inp} value={form.holiday_type} onChange={e=>s('holiday_type',e.target.value)}>
                  <option value="national">National</option>
                  <option value="festival">Festival</option>
                  <option value="optional">Optional</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={()=>setModal(false)} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold">Cancel</button>
              <button onClick={()=>form.holiday_date&&form.name&&createMut.mutate(form)} disabled={createMut.isPending||!form.holiday_date||!form.name}
                className="flex-1 py-2.5 text-white rounded-xl text-sm font-black disabled:opacity-50"
                style={{background:`linear-gradient(135deg,${B.blue},${B.navy})`}}>
                {createMut.isPending?'Saving…':'Add Holiday'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
