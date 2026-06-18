// RecruitmentPage.jsx — ATS: Job Postings, Applicants, Interviews
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Pencil, Users, Briefcase } from 'lucide-react';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';
import { hrRecruitmentAPI } from '../../api/client';
import { PageHeader } from '../../theme';
import { FIELD_HL } from '../../constants/fieldStyles';

const INP = `w-full h-9 rounded-lg px-3 text-xs font-medium outline-none transition-all border ${FIELD_HL}`;
const TABS = ['Jobs', 'Applicants'];

const JOB_STATUS_C  = { open:'green', closed:'slate', on_hold:'yellow', cancelled:'red' };
const APP_STATUS_C  = { applied:'slate', screening:'blue', interview:'yellow', offered:'green', rejected:'red', withdrawn:'slate', hired:'emerald' };
const APP_STATUSES  = ['applied','screening','interview','offered','rejected','withdrawn','hired'];

function JobForm({ job, onClose, onSaved }) {
  const isEdit = !!job;
  const [f, setF] = useState(job || { title:'', department:'', location:'', job_type:'full_time', min_experience_years:0, max_experience_years:'', min_salary:0, max_salary:'', description:'', requirements:'', status:'open', openings:1, closing_date:'' });
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const mut = useMutation({
    mutationFn: d => isEdit ? hrRecruitmentAPI.updateJob(job.id, d) : hrRecruitmentAPI.createJob(d),
    onSuccess: () => { toast.success(isEdit?'Updated':'Job posted'); onSaved(); onClose(); },
    onError: e => toast.error(e?.response?.data?.error||'Failed'),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">{isEdit?'Edit Job':'Post Job'}</h3>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          <div><label className="block text-[11px] text-slate-500 mb-1">Job Title *</label>
            <input value={f.title} onChange={e=>set('title',e.target.value)} placeholder="Site Engineer, QS Manager…" className={INP} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] text-slate-500 mb-1">Department</label>
              <input value={f.department||''} onChange={e=>set('department',e.target.value)} className={INP} /></div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Location</label>
              <input value={f.location||''} onChange={e=>set('location',e.target.value)} placeholder="Bangalore / Remote" className={INP} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-[11px] text-slate-500 mb-1">Type</label>
              <select value={f.job_type} onChange={e=>set('job_type',e.target.value)} className={INP}>
                {['full_time','part_time','contract','intern'].map(t=><option key={t} value={t} className="capitalize">{t.replace(/_/g,' ')}</option>)}
              </select>
            </div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Openings</label>
              <input type="number" value={f.openings} onChange={e=>set('openings',e.target.value)} className={INP} /></div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Status</label>
              <select value={f.status} onChange={e=>set('status',e.target.value)} className={INP}>
                {['open','closed','on_hold','cancelled'].map(s=><option key={s} value={s} className="capitalize">{s.replace(/_/g,' ')}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] text-slate-500 mb-1">Min Experience (yrs)</label>
              <input type="number" value={f.min_experience_years} onChange={e=>set('min_experience_years',e.target.value)} className={INP} /></div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Max Experience (yrs)</label>
              <input type="number" value={f.max_experience_years||''} onChange={e=>set('max_experience_years',e.target.value)} className={INP} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] text-slate-500 mb-1">Min Salary (₹ LPA)</label>
              <input type="number" value={f.min_salary} onChange={e=>set('min_salary',e.target.value)} className={INP} /></div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Max Salary (₹ LPA)</label>
              <input type="number" value={f.max_salary||''} onChange={e=>set('max_salary',e.target.value)} className={INP} /></div>
          </div>
          <div><label className="block text-[11px] text-slate-500 mb-1">Closing Date</label>
            <input type="date" value={f.closing_date||''} onChange={e=>set('closing_date',e.target.value)} className={INP} /></div>
          <div><label className="block text-[11px] text-slate-500 mb-1">Description</label>
            <textarea value={f.description||''} onChange={e=>set('description',e.target.value)} rows={3} className={`w-full rounded-lg px-3 py-2 text-xs outline-none transition-all border ${FIELD_HL} resize-none`} /></div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border text-xs">Cancel</button>
          <button onClick={()=>mut.mutate(f)} disabled={mut.isPending||!f.title} className="h-9 px-5 rounded-xl bg-blue-600 text-white text-xs font-semibold disabled:opacity-50">
            {mut.isPending?'Saving…':isEdit?'Update':'Post Job'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicantForm({ jobId, jobs=[], onClose, onSaved }) {
  const [f, setF] = useState({ job_id: jobId||'', full_name:'', email:'', phone:'', current_company:'', current_designation:'', experience_years:0, current_ctc:'', expected_ctc:'', notice_period_days:0, source:'direct', applied_on:dayjs().format('YYYY-MM-DD'), resume_url:'', notes:'' });
  const set = (k,v) => setF(p=>({...p,[k]:v}));
  const mut = useMutation({
    mutationFn: d => hrRecruitmentAPI.createApplicant(d),
    onSuccess: () => { toast.success('Applicant added'); onSaved(); onClose(); },
    onError: e => toast.error(e?.response?.data?.error||'Failed'),
  });
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="text-sm font-semibold">Add Applicant</h3>
          <button onClick={onClose}><X size={16}/></button>
        </div>
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {!jobId && <div><label className="block text-[11px] text-slate-500 mb-1">Job *</label>
            <select value={f.job_id} onChange={e=>set('job_id',e.target.value)} className={INP}>
              <option value="">Select job…</option>
              {jobs.map(j=><option key={j.id} value={j.id}>{j.title} ({j.department||'—'})</option>)}
            </select>
          </div>}
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] text-slate-500 mb-1">Full Name *</label>
              <input value={f.full_name} onChange={e=>set('full_name',e.target.value)} className={INP} /></div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Phone</label>
              <input value={f.phone||''} onChange={e=>set('phone',e.target.value)} className={INP} /></div>
          </div>
          <div><label className="block text-[11px] text-slate-500 mb-1">Email</label>
            <input type="email" value={f.email||''} onChange={e=>set('email',e.target.value)} className={INP} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] text-slate-500 mb-1">Current Company</label>
              <input value={f.current_company||''} onChange={e=>set('current_company',e.target.value)} className={INP} /></div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Current Designation</label>
              <input value={f.current_designation||''} onChange={e=>set('current_designation',e.target.value)} className={INP} /></div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div><label className="block text-[11px] text-slate-500 mb-1">Experience (yrs)</label>
              <input type="number" value={f.experience_years} onChange={e=>set('experience_years',e.target.value)} className={INP} /></div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Current CTC</label>
              <input value={f.current_ctc||''} onChange={e=>set('current_ctc',e.target.value)} placeholder="e.g. 8 LPA" className={INP} /></div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Expected CTC</label>
              <input value={f.expected_ctc||''} onChange={e=>set('expected_ctc',e.target.value)} className={INP} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[11px] text-slate-500 mb-1">Notice Period (days)</label>
              <input type="number" value={f.notice_period_days} onChange={e=>set('notice_period_days',e.target.value)} className={INP} /></div>
            <div><label className="block text-[11px] text-slate-500 mb-1">Source</label>
              <select value={f.source} onChange={e=>set('source',e.target.value)} className={INP}>
                {['direct','referral','naukri','linkedin','agency','campus','other'].map(s=><option key={s} value={s} className="capitalize">{s}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-[11px] text-slate-500 mb-1">Notes</label>
            <input value={f.notes||''} onChange={e=>set('notes',e.target.value)} className={INP} /></div>
        </div>
        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button onClick={onClose} className="h-9 px-4 rounded-xl border text-xs">Cancel</button>
          <button onClick={()=>mut.mutate(f)} disabled={mut.isPending||!f.full_name||!f.job_id} className="h-9 px-5 rounded-xl bg-blue-600 text-white text-xs font-semibold disabled:opacity-50">
            {mut.isPending?'Saving…':'Add Applicant'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ApplicantCard({ app, onStatusChange }) {
  const color = APP_STATUS_C[app.status]||'slate';
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3 hover:shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-sm text-slate-800 truncate">{app.full_name}</div>
          <div className="text-[11px] text-slate-500 truncate">{app.current_designation||'—'} · {app.current_company||'—'}</div>
          <div className="flex gap-3 mt-1 text-[10px] text-slate-400 flex-wrap">
            {app.experience_years>0 && <span>{app.experience_years}y exp</span>}
            {app.expected_ctc && <span>Exp: {app.expected_ctc}</span>}
            {app.notice_period_days>0 && <span>NP: {app.notice_period_days}d</span>}
          </div>
        </div>
        <div className="flex-shrink-0">
          <select value={app.status} onChange={e=>onStatusChange(app.id, e.target.value)}
            className={`h-7 rounded-lg px-1.5 text-[10px] font-semibold border-0 outline-none bg-${color}-100 text-${color}-700 cursor-pointer`}>
            {APP_STATUSES.map(s=><option key={s} value={s} className="capitalize bg-white text-slate-700">{s}</option>)}
          </select>
        </div>
      </div>
      <div className="text-[10px] text-slate-400 mt-2">{app.job_title} · Applied {dayjs(app.applied_on).format('DD-MM-YYYY')}</div>
    </div>
  );
}

export default function RecruitmentPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState('Jobs');
  const [showJobForm, setShowJobForm] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [showAppForm, setShowAppForm] = useState(false);
  const [filterJobId, setFilterJobId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const { data: jobs=[] } = useQuery({ queryKey:['hr-jobs'], queryFn:()=>hrRecruitmentAPI.jobs().then(r=>r.data?.data||[]) });
  const { data: applicants=[] } = useQuery({ queryKey:['hr-applicants',filterJobId,filterStatus],
    queryFn:()=>hrRecruitmentAPI.applicants({job_id:filterJobId||undefined, status:filterStatus||undefined}).then(r=>r.data?.data||[]) });

  const updateStatus = useMutation({
    mutationFn: ({id,status}) => hrRecruitmentAPI.updateApplicantStatus(id,{status}),
    onSuccess: () => qc.invalidateQueries({queryKey:['hr-applicants']}),
    onError: e => toast.error(e?.response?.data?.error||'Failed'),
  });

  const refresh = () => { qc.invalidateQueries({queryKey:['hr-jobs']}); qc.invalidateQueries({queryKey:['hr-applicants']}); };

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#f5f6fa]">
      <PageHeader title="Recruitment" subtitle="Job postings, applicant pipeline, interview scheduling"
        breadcrumbs={[{label:'HR & Admin'},{label:'Recruitment'}]}
        actions={
          <div className="flex gap-2">
            <button onClick={()=>setShowAppForm(true)} className="h-9 px-3 rounded-xl border border-slate-300 bg-white text-xs font-medium flex items-center gap-2"><Users size={13}/> Add Applicant</button>
            <button onClick={()=>{setEditJob(null);setShowJobForm(true);}} className="h-9 px-4 rounded-xl bg-blue-600 text-white text-xs font-semibold flex items-center gap-2"><Plus size={14}/> Post Job</button>
          </div>
        }
      />

      <div className="flex gap-1 px-5 pt-3 bg-white border-b flex-shrink-0">
        {TABS.map(t=>(
          <button key={t} onClick={()=>setTab(t)}
            className={clsx('px-4 py-2 text-xs font-medium rounded-t-lg border-b-2 -mb-px',
              tab===t?'border-blue-600 text-blue-700':'border-transparent text-slate-500')}>
            {t}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto p-5">
        {tab==='Jobs' && (
          <div className="grid grid-cols-1 gap-3 max-w-4xl">
            {jobs.map(j=>{
              const color = JOB_STATUS_C[j.status]||'slate';
              return (
                <div key={j.id} className="bg-white rounded-xl border border-slate-200 px-5 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-slate-800">{j.title}</div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold bg-${color}-100 text-${color}-700 capitalize`}>{j.status.replace(/_/g,' ')}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">{j.department||'—'} · {j.location||'—'} · {j.job_type?.replace(/_/g,' ')} · {j.openings} opening{j.openings!==1?'s':''}</div>
                      <div className="flex gap-4 mt-2 text-[10px] text-slate-400 flex-wrap">
                        {(j.min_experience_years||0)>0 && <span>{j.min_experience_years}{j.max_experience_years?`–${j.max_experience_years}`:'+'}y exp</span>}
                        {j.min_salary>0 && <span>₹{j.min_salary}{j.max_salary?`–${j.max_salary}`:''} LPA</span>}
                        {j.closing_date && <span>Closes {dayjs(j.closing_date).format('DD-MM-YYYY')}</span>}
                        <span className="font-medium text-blue-600">{j.applicant_count||0} applicants</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={()=>{setFilterJobId(j.id);setTab('Applicants');}} className="h-7 px-2.5 rounded-lg bg-slate-100 text-[11px] font-medium text-slate-600 hover:bg-slate-200 flex items-center gap-1">
                        <Users size={11}/> View
                      </button>
                      <button onClick={()=>{setEditJob(j);setShowJobForm(true);}} className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                        <Pencil size={12} className="text-slate-500"/>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
            {jobs.length===0 && <div className="text-center py-16 text-slate-400 text-sm">No job postings yet</div>}
          </div>
        )}

        {tab==='Applicants' && (
          <div className="max-w-5xl">
            <div className="flex gap-2 mb-4 flex-wrap">
              <select value={filterJobId} onChange={e=>setFilterJobId(e.target.value)} className="h-8 rounded-lg border border-slate-200 bg-white text-xs px-2">
                <option value="">All Jobs</option>
                {jobs.map(j=><option key={j.id} value={j.id}>{j.title}</option>)}
              </select>
              {APP_STATUSES.map(s=>(
                <button key={s} onClick={()=>setFilterStatus(s===filterStatus?'':s)}
                  className={clsx('h-8 px-3 rounded-lg text-xs font-medium capitalize', filterStatus===s?'bg-blue-600 text-white':'bg-white border border-slate-200 text-slate-600')}>
                  {s}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {applicants.map(a=>(
                <ApplicantCard key={a.id} app={a} onStatusChange={(id,status)=>updateStatus.mutate({id,status})} />
              ))}
              {applicants.length===0 && <div className="col-span-3 text-center py-16 text-slate-400 text-sm">No applicants found</div>}
            </div>
          </div>
        )}
      </div>

      {showJobForm && <JobForm job={editJob} onClose={()=>{setShowJobForm(false);setEditJob(null);}} onSaved={refresh} />}
      {showAppForm && <ApplicantForm jobs={jobs} onClose={()=>setShowAppForm(false)} onSaved={refresh} />}
    </div>
  );
}
