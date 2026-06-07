import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { scAPI, projectAPI } from '../../api/client';
import { RefreshCw, ShieldCheck, CheckCircle, X, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

const fmt = v=>`₹${Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const STATUS_COLOR={submitted:'bg-blue-100 text-blue-700',under_review:'bg-amber-100 text-amber-700',approved:'bg-emerald-100 text-emerald-700',rejected:'bg-red-100 text-red-700'};
const STAGES=['site_engineer','project_manager','qs_engineer','accounts'];

function BillApprovalCard({ bill }) {
  const qc = useQueryClient();
  const [showAction, setShowAction] = useState(false);
  const [comments, setComments] = useState('');
  const [nextStage, setNextStage] = useState('');

  const approveMut = useMutation({
    mutationFn:()=>scAPI.approveBill(bill.id,{comments,next_stage:nextStage}),
    onSuccess:()=>{ toast.success('Approved'); qc.invalidateQueries({queryKey:['sc-bills-approval']}); setShowAction(false); },
    onError:e=>toast.error(e?.response?.data?.error||'Failed'),
  });
  const rejectMut = useMutation({
    mutationFn:()=>scAPI.rejectBill(bill.id,{comments}),
    onSuccess:()=>{ toast.success('Rejected'); qc.invalidateQueries({queryKey:['sc-bills-approval']}); setShowAction(false); },
    onError:e=>toast.error(e?.response?.data?.error||'Failed'),
  });

  const stageIdx = STAGES.indexOf(bill.current_stage);
  return (
    <div className={`bg-white rounded-2xl border overflow-hidden shadow-sm ${bill.status==='rejected'?'border-red-200':bill.status==='approved'?'border-emerald-200':'border-slate-100'}`}>
      <div className="px-5 py-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-sm font-bold text-purple-600">{bill.bill_number}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold capitalize ${STATUS_COLOR[bill.status]||'bg-slate-100'}`}>{bill.status?.replace('_',' ')}</span>
              <span className="text-xs text-slate-400 capitalize">Stage: {bill.current_stage?.replace('_',' ')}</span>
            </div>
            <div className="text-slate-700 font-semibold">{bill.sc_name}</div>
            <div className="text-xs text-slate-400">{bill.wo_number} · {bill.project_name}</div>
          </div>
          <div className="text-right">
            <div className="text-xl font-bold text-purple-700">{fmt(bill.net_payable)}</div>
            <div className="text-xs text-slate-400">Gross: {fmt(bill.gross_amount)}</div>
          </div>
        </div>
        {/* Stage progress */}
        <div className="flex items-center gap-1 mt-3">
          {STAGES.map((s,i)=>(
            <React.Fragment key={s}>
              <div className={`flex-1 text-center text-[9px] font-semibold px-1 py-1 rounded ${i<=stageIdx?'bg-purple-100 text-purple-700':'bg-slate-100 text-slate-400'}`}>
                {s.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase())}
              </div>
              {i<STAGES.length-1&&<div className={`w-4 h-0.5 ${i<stageIdx?'bg-purple-400':'bg-slate-200'}`}/>}
            </React.Fragment>
          ))}
        </div>
      </div>
      {['submitted','under_review'].includes(bill.status)&&(
        <div className="px-5 py-3 bg-slate-50 flex items-center justify-between">
          {!showAction?(
            <div className="flex gap-2">
              <button onClick={()=>setShowAction(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700">
                <CheckCircle className="w-3.5 h-3.5" />Review & Approve
              </button>
            </div>
          ):(
            <div className="w-full space-y-3">
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Next Stage (for partial approval)</label>
                <select value={nextStage} onChange={e=>setNextStage(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none">
                  <option value="">Final Approval</option>
                  {STAGES.slice(stageIdx+1).map(s=><option key={s} value={s}>{s.replace('_',' ')}</option>)}</select></div>
              <div><label className="block text-xs font-semibold text-slate-500 mb-1">Comments</label>
                <textarea value={comments} onChange={e=>setComments(e.target.value)} rows={2} className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none resize-none" placeholder="Approval / rejection remarks…" /></div>
              <div className="flex gap-2">
                <button onClick={()=>approveMut.mutate()} disabled={approveMut.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50">
                  <CheckCircle className="w-3.5 h-3.5" />{approveMut.isPending?'Approving…':'Approve'}
                </button>
                <button onClick={()=>rejectMut.mutate()} disabled={!comments||rejectMut.isPending} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50">
                  <X className="w-3.5 h-3.5" />{rejectMut.isPending?'Rejecting…':'Reject'}
                </button>
                <button onClick={()=>setShowAction(false)} className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs text-slate-600 hover:bg-slate-100">Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}
      {bill.rejection_remarks&&(
        <div className="px-5 py-3 bg-red-50 border-t border-red-100">
          <p className="text-xs font-semibold text-red-700 mb-0.5">Rejection Reason:</p>
          <p className="text-xs text-red-600">{bill.rejection_remarks}</p>
        </div>
      )}
    </div>
  );
}

export default function SCBillApproval() {
  const [projectFilter,setProject]=useState('');
  const [statusFilter,setStatus]=useState('submitted');
  const { data:projects=[] } = useQuery({ queryKey:['projects'], queryFn:()=>projectAPI.list().then(r=>r.data?.data??[]) });
  const { data:bills=[], isLoading, refetch } = useQuery({
    queryKey:['sc-bills-approval', projectFilter, statusFilter],
    queryFn:()=>scAPI.listBills({project_id:projectFilter||undefined, status:statusFilter||undefined}).then(r=>r.data?.data||[]),
    staleTime:0,
  });
  return (
    <div className="p-6 md:p-8 min-h-screen bg-slate-50">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-blue-600" />Bill Approval Workflow</h1>
          <p className="text-sm text-slate-500 mt-0.5">{bills.length} bills {statusFilter}</p>
        </div>
        <button onClick={()=>refetch()} className="p-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50"><RefreshCw className="w-4 h-4 text-slate-500" /></button>
      </div>
      <div className="flex flex-wrap gap-3 mb-5">
        <select value={projectFilter} onChange={e=>setProject(e.target.value)} className="border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm min-w-48">
          <option value="">All Projects</option>{projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
          {[['submitted','Pending'],['under_review','Under Review'],['approved','Approved'],['rejected','Rejected'],['','All']].map(([v,l])=>(
            <button key={v} onClick={()=>setStatus(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter===v?'bg-white text-blue-700 shadow-sm font-semibold':'text-slate-600 hover:text-slate-800'}`}>
              {l}
            </button>
          ))}
        </div>
      </div>
      {isLoading?(<div className="flex items-center justify-center h-48"><RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />Loading…</div>):(
        <div className="space-y-4">
          {bills.length===0?(<div className="bg-white rounded-2xl border border-slate-100 p-12 text-center"><ShieldCheck className="w-12 h-12 text-slate-200 mx-auto mb-3" /><p className="text-slate-400 font-medium">No bills found for this filter</p></div>)
            :bills.map(b=><BillApprovalCard key={b.id} bill={b} />)}
        </div>
      )}
    </div>
  );
}
