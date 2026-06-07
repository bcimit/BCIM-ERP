// src/pages/hr-admin/LoanPage.jsx — 2026 Premium UI
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Banknote, Plus, Check, X, ChevronRight, TrendingDown, Clock, CheckCircle2 } from 'lucide-react';
import { hrLoansAPI, hrEmployeesAPI } from '../../api/client';
import toast from 'react-hot-toast';

const B = { navy:'#0A1F5C', blue:'#2563EB', yellow:'#F4C430', success:'#10B981', warning:'#F59E0B', danger:'#EF4444' };
const fmt = (v) => `₹${parseFloat(v||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const fade = (d=0) => ({ initial:{opacity:0,y:14}, animate:{opacity:1,y:0}, transition:{duration:0.35,delay:d,ease:[0.16,1,0.3,1]} });

const STATUS_CFG = {
  pending:  { label:'Pending',  bg:'bg-amber-50',   text:'text-amber-700',   dot:'bg-amber-400'  },
  approved: { label:'Approved', bg:'bg-blue-50',    text:'text-blue-700',    dot:'bg-blue-500'   },
  rejected: { label:'Rejected', bg:'bg-red-50',     text:'text-red-700',     dot:'bg-red-500'    },
  closed:   { label:'Closed',   bg:'bg-gray-100',   text:'text-gray-600',    dot:'bg-gray-400'   },
};

const AVATAR_COLORS = [['#6366F1','#4F46E5'],['#0EA5E9','#0284C7'],['#10B981','#059669'],['#F59E0B','#D97706'],['#EF4444','#DC2626'],['#8B5CF6','#7C3AED']];
const avatarGrad = (n) => AVATAR_COLORS[(n?.charCodeAt(0)||0)%AVATAR_COLORS.length];
const initials   = (n) => (n||'U').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();

const inp = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all";
const lbl = "text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5";

export default function LoanPage() {
  const qc = useQueryClient();
  const [modal, setModal]     = useState(false);
  const [typeF, setTypeF]     = useState('');
  const [statusF, setStatusF] = useState('');

  const { data, isLoading } = useQuery({
    queryKey:['hr-loans', typeF, statusF],
    queryFn:()=>hrLoansAPI.list({loan_type:typeF||undefined, status:statusF||undefined}).then(r=>r.data),
  });
  const loans = data?.data || [];

  const approveMut = useMutation({
    mutationFn:({id,data})=>hrLoansAPI.approve(id,data),
    onSuccess:()=>{ toast.success('Approved'); qc.invalidateQueries({queryKey:['hr-loans']}); },
    onError:e=>toast.error(e.response?.data?.error||'Error'),
  });
  const rejectMut = useMutation({
    mutationFn:(id)=>hrLoansAPI.reject(id),
    onSuccess:()=>{ toast.success('Rejected'); qc.invalidateQueries({queryKey:['hr-loans']}); },
    onError:e=>toast.error(e.response?.data?.error||'Error'),
  });

  const totalPending  = loans.filter(l=>l.status==='pending').reduce((s,l)=>s+parseFloat(l.amount||0),0);
  const totalBalance  = loans.filter(l=>l.status==='approved').reduce((s,l)=>s+parseFloat(l.balance_amount||0),0);

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
                <Banknote className="w-4 h-4 text-white"/>
              </div>
              <span className="text-white/60 text-sm font-semibold">HR & Admin</span>
            </div>
            <h1 className="text-2xl font-black text-white">Loans & Advances</h1>
            <p className="text-white/55 text-sm mt-1">Employee loans, salary advances and EMI tracking</p>
          </div>
          <button onClick={()=>setModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black shadow-lg hover:opacity-90 active:scale-95 transition-all self-start"
            style={{background:B.yellow,color:B.navy}}>
            <Plus className="w-4 h-4"/> New Request
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div {...fade(0.08)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          {label:'Total Requests',    value:loans.length,                                    icon:Banknote,    color:B.blue,    bg:'#EFF6FF'},
          {label:'Pending Approval',  value:loans.filter(l=>l.status==='pending').length,    icon:Clock,       color:'#F59E0B', bg:'#FFFBEB'},
          {label:'Pending Amount',    value:fmt(totalPending),                               icon:TrendingDown,color:B.danger,  bg:'#FEF2F2'},
          {label:'Outstanding Balance',value:fmt(totalBalance),                              icon:CheckCircle2,color:B.success, bg:'#ECFDF5'},
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

      {/* Filter Bar */}
      <motion.div {...fade(0.18)} className="bg-white rounded-2xl p-4 border border-gray-100 flex flex-wrap gap-3 items-center"
        style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {['','advance','loan'].map(t=>(
            <button key={t} onClick={()=>setTypeF(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${typeF===t?'bg-white text-blue-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
              {t===''?'All Types':t.charAt(0).toUpperCase()+t.slice(1)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
          {['','pending','approved','rejected','closed'].map(s=>(
            <button key={s} onClick={()=>setStatusF(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${statusF===s?'bg-white text-blue-700 shadow-sm':'text-gray-500 hover:text-gray-700'}`}>
              {s||'All Status'}
            </button>
          ))}
        </div>
        <div className="ml-auto text-xs text-gray-400 font-medium">{loans.length} record{loans.length!==1?'s':''}</div>
      </motion.div>

      {/* Table */}
      <motion.div {...fade(0.22)} className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 rounded-full border-2 border-blue-200 border-t-blue-600 animate-spin"/>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {['Employee','Type','Amount','Reason','EMI','Repaid','Balance','Status','Actions'].map(h=>(
                    <th key={h} className="text-left px-4 py-3 text-xs font-black text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loans.map(l=>{
                  const st = STATUS_CFG[l.status]||STATUS_CFG.pending;
                  const [g1,g2]=avatarGrad(l.employee_name);
                  return (
                    <tr key={l.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-white text-xs font-black"
                            style={{background:`linear-gradient(135deg,${g1},${g2})`}}>
                            {initials(l.employee_name)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{l.employee_name}</p>
                            <p className="text-xs text-gray-400">{l.employee_code}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize text-gray-700 font-medium">{l.loan_type}</td>
                      <td className="px-4 py-3 font-black text-gray-900">{fmt(l.amount)}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[160px] truncate">{l.reason||'—'}</td>
                      <td className="px-4 py-3 text-gray-600">{l.emi_amount?`${fmt(l.emi_amount)}/mo`:'—'}</td>
                      <td className="px-4 py-3 font-bold" style={{color:B.success}}>{fmt(l.repaid_amount)}</td>
                      <td className="px-4 py-3 font-bold" style={{color:B.warning}}>{fmt(l.balance_amount||l.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full ${st.bg} ${st.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {l.status==='pending' && (
                          <div className="flex gap-1.5">
                            <button onClick={()=>approveMut.mutate({id:l.id,data:{}})} title="Approve"
                              className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg transition-colors">
                              <Check className="w-3.5 h-3.5"/>
                            </button>
                            <button onClick={()=>rejectMut.mutate(l.id)} title="Reject"
                              className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors">
                              <X className="w-3.5 h-3.5"/>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {loans.length===0 && (
              <div className="text-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <Banknote className="w-7 h-7 text-gray-300"/>
                </div>
                <p className="text-gray-500 font-bold">No loans or advances found</p>
                <p className="text-gray-400 text-sm mt-1">Click "New Request" to add one</p>
              </div>
            )}
          </div>
        )}
      </motion.div>

      {modal && <LoanModal onClose={()=>setModal(false)} onSuccess={()=>{ setModal(false); qc.invalidateQueries({queryKey:['hr-loans']}); }}/>}
    </div>
  );
}

function LoanModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({user_id:'',loan_type:'advance',amount:'',reason:'',emi_amount:'',emi_months:''});
  const {data:empData}  = useQuery({queryKey:['hr-employees-active'],queryFn:()=>hrEmployeesAPI.list({employment_status:'active'}).then(r=>r.data)});
  const s = (k,v) => setForm(p=>({...p,[k]:v}));

  const createMut = useMutation({
    mutationFn:(d)=>hrLoansAPI.create(d),
    onSuccess:()=>{ toast.success('Loan request submitted'); onSuccess(); },
    onError:e=>toast.error(e.response?.data?.error||'Error'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.4)',backdropFilter:'blur(4px)'}}>
      <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.95,opacity:0,y:20}}
        transition={{duration:0.22}} className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100"
          style={{background:`linear-gradient(135deg,${B.navy},#1e3a8a)`}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white"/>
            </div>
            <p className="font-bold text-white">New Loan / Advance Request</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            <X className="w-4 h-4"/>
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div><label className={lbl}>Employee</label>
            <select className={inp} value={form.user_id} onChange={e=>s('user_id',e.target.value)}>
              <option value="">Select Employee</option>
              {(empData?.data||[]).map(e=><option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
            </select>
          </div>
          <div><label className={lbl}>Type</label>
            <select className={inp} value={form.loan_type} onChange={e=>s('loan_type',e.target.value)}>
              <option value="advance">Salary Advance</option>
              <option value="loan">Loan</option>
            </select>
          </div>
          <div><label className={lbl}>Amount (₹)</label>
            <input className={inp} type="number" value={form.amount} onChange={e=>s('amount',e.target.value)} placeholder="0"/>
          </div>
          <div><label className={lbl}>Reason</label>
            <textarea className={inp} rows={2} value={form.reason} onChange={e=>s('reason',e.target.value)} placeholder="Reason for loan/advance"/>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>EMI Amount (₹)</label>
              <input className={inp} type="number" value={form.emi_amount} onChange={e=>s('emi_amount',e.target.value)} placeholder="Optional"/>
            </div>
            <div><label className={lbl}>EMI Months</label>
              <input className={inp} type="number" value={form.emi_months} onChange={e=>s('emi_months',e.target.value)} placeholder="Optional"/>
            </div>
          </div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold transition-colors">
            Cancel
          </button>
          <button onClick={()=>form.user_id&&form.amount&&createMut.mutate(form)} disabled={!form.user_id||!form.amount||createMut.isPending}
            className="flex-1 py-2.5 text-white rounded-xl text-sm font-black disabled:opacity-50 transition-all hover:opacity-90"
            style={{background:`linear-gradient(135deg,${B.blue},${B.navy})`}}>
            {createMut.isPending?'Submitting…':'Submit Request'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
