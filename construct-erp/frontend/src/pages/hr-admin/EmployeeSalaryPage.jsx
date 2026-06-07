// src/pages/hr-admin/EmployeeSalaryPage.jsx — 2026 Premium UI
import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Banknote, Calculator, CheckCircle2, IndianRupee, Plus, Search, ShieldCheck, Users, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { hrEmployeesAPI, hrSalaryAPI } from '../../api/client';

const B = { navy:'#0A1F5C', blue:'#2563EB', yellow:'#F4C430' };
const fade = (d=0) => ({ initial:{opacity:0,y:14}, animate:{opacity:1,y:0}, transition:{duration:0.35,delay:d,ease:[0.16,1,0.3,1]} });
const inp = "w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all";
const lbl = "text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5";

const fmt = (n) => Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2});
const today = () => new Date().toISOString().slice(0,10);

function splitGross(gross) {
  const g = Number(gross||0);
  const basic     = Math.round(g*0.4);
  const hra       = Math.round(basic*0.4);
  const conveyance= g>0?1600:0;
  const medical   = g>0?1250:0;
  const special   = Math.max(0,g-basic-hra-conveyance-medical);
  return { basic, hra, conveyance, medical, special_allowance:special, other_allowance:0 };
}

function SalaryModal({ employees, structures, onClose, onSave, saving }) {
  const [form, setForm] = useState({
    user_id:'', structure_id:structures[0]?.id||'',
    monthly_gross:'', basic:'', hra:'', conveyance:'', medical:'',
    special_allowance:'', other_allowance:'',
    pf_applicable:true, esi_applicable:false, pt_applicable:true,
    effective_from:today(),
  });
  const update = (k,v) => setForm(p=>({...p,[k]:v}));
  const applyGross = () => { const s=splitGross(form.monthly_gross); setForm(p=>({...p,...s})); };

  const grossMonthly = useMemo(()=>(
    Number(form.basic||0)+Number(form.hra||0)+Number(form.conveyance||0)+
    Number(form.medical||0)+Number(form.special_allowance||0)+Number(form.other_allowance||0)
  ),[form.basic,form.hra,form.conveyance,form.medical,form.special_allowance,form.other_allowance]);

  const submit = () => {
    if(!form.user_id) return toast.error('Select employee');
    if(!form.effective_from) return toast.error('Effective date is required');
    if(grossMonthly<=0) return toast.error('Enter salary components');
    onSave({
      user_id:form.user_id, structure_id:form.structure_id||null,
      ctc_annual:grossMonthly*12, basic:Number(form.basic||0), hra:Number(form.hra||0),
      conveyance:Number(form.conveyance||0), medical:Number(form.medical||0),
      special_allowance:Number(form.special_allowance||0), other_allowance:Number(form.other_allowance||0),
      gross_monthly:grossMonthly, pf_applicable:form.pf_applicable,
      esi_applicable:form.esi_applicable, pt_applicable:form.pt_applicable,
      effective_from:form.effective_from,
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
      <motion.div initial={{opacity:0,scale:0.97}} animate={{opacity:1,scale:1}} transition={{duration:0.2}}
        className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">

        {/* Modal Header */}
        <div className="relative px-6 py-5 flex items-center justify-between"
          style={{background:`linear-gradient(135deg,#0A1F5C,#1e3a8a)`}}>
          <div className="absolute top-0 right-0 w-48 h-48 rounded-full opacity-[0.07]"
            style={{background:'radial-gradient(circle,#fff,transparent 70%)',transform:'translate(25%,-25%)'}}/>
          <div className="relative z-10">
            <h2 className="text-lg font-black text-white">Assign Employee Salary</h2>
            <p className="text-white/55 text-sm mt-0.5">Use approved monthly salary. Existing active salary closes automatically.</p>
          </div>
          <button onClick={onClose} className="relative z-10 w-8 h-8 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X className="w-4 h-4 text-white"/>
          </button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto">
          <div>
            <label className={lbl}>Employee</label>
            <select value={form.user_id} onChange={e=>update('user_id',e.target.value)} className={inp}>
              <option value="">Select employee…</option>
              {employees.map(e=><option key={e.id} value={e.id}>{e.name} — {e.employee_code||e.email}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Salary Structure</label>
            <select value={form.structure_id} onChange={e=>update('structure_id',e.target.value)} className={inp}>
              <option value="">No structure</option>
              {structures.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Monthly Gross</label>
            <div className="flex gap-2">
              <input type="number" value={form.monthly_gross} onChange={e=>update('monthly_gross',e.target.value)}
                className={inp} placeholder="e.g. 45000"/>
              <button onClick={applyGross} type="button"
                className="px-4 py-2.5 rounded-xl text-sm font-black text-white whitespace-nowrap"
                style={{background:`linear-gradient(135deg,${B.blue},${B.navy})`}}>
                Auto-Split
              </button>
            </div>
          </div>
          <div>
            <label className={lbl}>Effective From</label>
            <input type="date" value={form.effective_from} onChange={e=>update('effective_from',e.target.value)} className={inp}/>
          </div>
          {[['basic','Basic'],['hra','HRA'],['conveyance','Conveyance'],['medical','Medical'],
            ['special_allowance','Special Allowance'],['other_allowance','Other Allowance']].map(([k,l])=>(
            <div key={k}>
              <label className={lbl}>{l}</label>
              <input type="number" value={form[k]} onChange={e=>update(k,e.target.value)} className={inp}/>
            </div>
          ))}
          <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[['pf_applicable','PF Applicable'],['esi_applicable','ESI Applicable'],['pt_applicable','PT Applicable']].map(([k,l])=>(
              <label key={k} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-bold text-gray-800 cursor-pointer hover:bg-blue-50 transition-colors">
                <input type="checkbox" checked={form[k]} onChange={e=>update(k,e.target.checked)} className="h-4 w-4 accent-blue-600"/>
                {l}
              </label>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <span className="text-gray-500">Gross Monthly: </span>
            <strong className="text-gray-900">₹{fmt(grossMonthly)}</strong>
            <span className="mx-3 text-gray-200">|</span>
            <span className="text-gray-500">Annual CTC: </span>
            <strong className="text-gray-900">₹{fmt(grossMonthly*12)}</strong>
          </div>
          <button onClick={submit} disabled={saving}
            className="px-6 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-50"
            style={{background:`linear-gradient(135deg,${B.blue},${B.navy})`}}>
            {saving?'Saving…':'Save Salary'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export default function EmployeeSalaryPage() {
  const qc = useQueryClient();
  const [search,    setSearch]    = useState('');
  const [showModal, setShowModal] = useState(false);

  const { data:empData,     isLoading:empLoading     } = useQuery({
    queryKey:['hr-employees-active'],
    queryFn:()=>hrEmployeesAPI.list({employment_status:'active'}).then(r=>r.data),
  });
  const { data:structureData } = useQuery({
    queryKey:['hr-salary-structures'],
    queryFn:()=>hrSalaryAPI.listStructures().then(r=>r.data),
  });
  const { data:salaryData,  isLoading:salaryLoading  } = useQuery({
    queryKey:['hr-employee-salaries'],
    queryFn:()=>hrSalaryAPI.listEmpSalaries().then(r=>r.data),
  });

  const employees  = empData?.data     || [];
  const structures = structureData?.data || [];
  const salaryRows = salaryData?.data   || [];

  const latestByUser = useMemo(()=>{
    const map = new Map();
    salaryRows.forEach(row=>{ if(!map.has(row.user_id)) map.set(row.user_id,row); });
    return map;
  },[salaryRows]);

  const filtered = useMemo(()=>{
    const n = search.trim().toLowerCase();
    return employees.filter(e=>{
      if(!n) return true;
      return [e.name,e.employee_code,e.email,e.department_name,e.designation_name]
        .some(v=>String(v||'').toLowerCase().includes(n));
    });
  },[employees,search]);

  const configured  = employees.filter(e=>latestByUser.has(e.id)).length;

  const saveMut = useMutation({
    mutationFn:(payload)=>hrSalaryAPI.assignSalary(payload),
    onSuccess:()=>{ toast.success('Employee salary saved'); setShowModal(false); qc.invalidateQueries({queryKey:['hr-employee-salaries']}); },
    onError:(e)=>toast.error(e.response?.data?.error||'Failed to save salary'),
  });

  const kpis = [
    { label:'Active Employees', value:employees.length,                  icon:Users,        bg:'bg-blue-50',    text:'text-blue-700'    },
    { label:'Salary Configured', value:configured,                        icon:CheckCircle2, bg:'bg-emerald-50', text:'text-emerald-700' },
    { label:'Pending Setup',     value:Math.max(0,employees.length-configured), icon:ShieldCheck, bg:'bg-amber-50',  text:'text-amber-700'  },
  ];

  return (
    <div className="p-6 space-y-6 min-h-screen" style={{background:'#F8FAFC'}}>

      {/* Header */}
      <motion.div {...fade(0)} className="relative overflow-hidden rounded-2xl"
        style={{background:`linear-gradient(135deg,#0A1F5C,#1e3a8a)`,boxShadow:'0 8px 32px rgba(10,31,92,0.2)'}}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-[0.07]"
          style={{background:'radial-gradient(circle,#fff,transparent 70%)',transform:'translate(25%,-25%)'}}/>
        <div className="relative z-10 px-8 py-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-white"/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Employee Salaries</h1>
              <p className="text-white/55 text-sm mt-0.5">Assign real salary packages before generating payroll</p>
            </div>
          </div>
          <button onClick={()=>setShowModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black text-sm"
            style={{background:B.yellow,color:B.navy}}>
            <Plus className="w-4 h-4"/> Assign Salary
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {kpis.map((k,i)=>(
          <motion.div key={k.label} {...fade(0.06+i*0.05)}
            className="bg-white rounded-2xl border border-gray-100 p-5"
            style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black text-gray-500 uppercase tracking-wide">{k.label}</span>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${k.bg}`}>
                <k.icon className={`w-4 h-4 ${k.text}`}/>
              </div>
            </div>
            <div className="text-3xl font-black text-gray-900">{k.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Table Card */}
      <motion.div {...fade(0.18)} className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
        style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>

        {/* Search Bar */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative w-full md:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400"
              placeholder="Search employee, department, designation…"/>
          </div>
          <span className="text-sm font-bold text-gray-500">{filtered.length} employee(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr style={{background:`linear-gradient(135deg,#0A1F5C,#1e3a8a)`}}>
                {['Employee','Department','Structure','Gross Monthly','Annual CTC','Effective From','Status'].map(h=>(
                  <th key={h} className="px-4 py-3 text-left text-xs font-black text-white/80 uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(empLoading||salaryLoading) && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">Loading salary data…</td></tr>
              )}
              {!empLoading && !salaryLoading && filtered.map(emp=>{
                const sal = latestByUser.get(emp.id);
                return (
                  <tr key={emp.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-xs font-black flex-shrink-0"
                          style={{background:`linear-gradient(135deg,${B.blue},${B.navy})`}}>
                          {(emp.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-black text-gray-900">{emp.name}</div>
                          <div className="text-xs text-gray-400">{emp.employee_code||emp.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-bold text-gray-700">{emp.department_name||'—'}</td>
                    <td className="px-4 py-3 font-bold text-gray-700">{sal?.structure_name||'—'}</td>
                    <td className="px-4 py-3 font-black text-gray-900">{sal?`₹${fmt(sal.gross_monthly)}`:'—'}</td>
                    <td className="px-4 py-3 font-black text-gray-900">{sal?`₹${fmt(sal.ctc_annual)}`:'—'}</td>
                    <td className="px-4 py-3 text-gray-600">{sal?.effective_from?new Date(sal.effective_from).toLocaleDateString('en-IN'):'—'}</td>
                    <td className="px-4 py-3">
                      {sal ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-black">
                          <IndianRupee className="w-3 h-3"/> Configured
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-black">
                          <Calculator className="w-3 h-3"/> Pending
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!empLoading && !salaryLoading && filtered.length===0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-400 text-sm">No employees found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </motion.div>

      {showModal && (
        <SalaryModal
          employees={employees}
          structures={structures}
          saving={saveMut.isPending}
          onClose={()=>setShowModal(false)}
          onSave={payload=>saveMut.mutate(payload)}
        />
      )}
    </div>
  );
}
