// src/pages/sc/SCReports.jsx — Enterprise SC Reports
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { scAPI, projectAPI } from '../../api/client';
import { PageHeader, Theme } from '../../theme';
import { BarChart3, RefreshCw, Download, Search } from 'lucide-react';
import { clsx } from 'clsx';
import dayjs from 'dayjs';
import toast from 'react-hot-toast';

const fmt  = (n) => `₹${Number(n||0).toLocaleString('en-IN',{maximumFractionDigits:0})}`;
const fmt2 = (n) => `₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const num  = (v) => parseFloat(v||0);

const REPORTS = [
  { key:'summary',       label:'Subcontractor Summary',   group:'Billing' },
  { key:'wo_balance',    label:'WO Balance Report',       group:'Billing' },
  { key:'outstanding',   label:'Outstanding Payments',    group:'Billing' },
  { key:'payment_reg',   label:'Payment Register',        group:'Billing' },
  { key:'retention',     label:'Retention Report',        group:'Deductions' },
  { key:'adv_recovery',  label:'Advance Recovery',        group:'Deductions' },
  { key:'labour',        label:'Labour Attendance',       group:'Labour' },
  { key:'boq_actual',    label:'BOQ vs Actual',           group:'BOQ' },
  { key:'ledger',        label:'Contractor Ledger',       group:'Ledger' },
];

function exportCSV(rows, name) {
  if (!rows?.length) return toast.error('No data to export');
  const headers = Object.keys(rows[0]);
  const csv = [headers.join(','), ...rows.map(r => headers.map(h=>`"${String(r[h]??'').replace(/"/g,'""')}"`).join(','))].join('\n');
  const blob = new Blob([csv],{type:'text/csv'});
  const url  = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href=url; a.download=`${name}_${dayjs().format('YYYYMMDD')}.csv`; a.click();
}

// toast is now properly imported above

export default function SCReports() {
  const [activeReport, setReport] = useState('summary');
  const [projectFilter, setProject] = useState('');
  const [scFilter, setSC]           = useState('');
  const [woFilter, setWO]           = useState('');
  const [fromDate, setFrom]         = useState('');
  const [toDate,   setTo]           = useState('');

  const { data: projects=[] } = useQuery({ queryKey:['projects'], queryFn:()=>projectAPI.list().then(r=>r.data?.data??[]) });
  const { data: scList=[]   } = useQuery({ queryKey:['sc-list'],  queryFn:()=>scAPI.listSC().then(r=>r.data?.data||[]) });
  const { data: woList=[]   } = useQuery({ queryKey:['sc-wo-all'],queryFn:()=>scAPI.listWO().then(r=>r.data?.data||[]) });

  const baseP = { project_id: projectFilter||undefined };

  const { data: summary=[],     refetch:r1 } = useQuery({ queryKey:['sc-rpt-summary',projectFilter],      queryFn:()=>scAPI.reportSummary(baseP).then(r=>r.data?.data||[]),       staleTime:0, enabled:activeReport==='summary' });
  const { data: woBalance=[],   refetch:r2 } = useQuery({ queryKey:['sc-rpt-wo',projectFilter,scFilter],  queryFn:()=>scAPI.reportWOBalance({...baseP,sc_id:scFilter||undefined}).then(r=>r.data?.data||[]), staleTime:0, enabled:activeReport==='wo_balance' });
  const { data: outstanding=[], refetch:r3 } = useQuery({ queryKey:['sc-rpt-out',projectFilter],          queryFn:()=>scAPI.reportOutstanding(baseP).then(r=>r.data?.data||[]),   staleTime:0, enabled:activeReport==='outstanding' });
  const { data: payReg=[],      refetch:r4 } = useQuery({ queryKey:['sc-rpt-pay',projectFilter,scFilter,fromDate,toDate], queryFn:()=>scAPI.reportPayReg({...baseP,sc_id:scFilter||undefined,from_date:fromDate||undefined,to_date:toDate||undefined}).then(r=>r.data?.data||[]), staleTime:0, enabled:activeReport==='payment_reg' });
  const { data: retention=[],   refetch:r5 } = useQuery({ queryKey:['sc-rpt-ret'],                        queryFn:()=>scAPI.reportRetention().then(r=>r.data?.data||[]),          staleTime:0, enabled:activeReport==='retention' });
  const { data: advRec=[],      refetch:r6 } = useQuery({ queryKey:['sc-rpt-adv',projectFilter,scFilter], queryFn:()=>scAPI.reportAdvRec({...baseP,sc_id:scFilter||undefined}).then(r=>r.data?.data||[]), staleTime:0, enabled:activeReport==='adv_recovery' });
  const { data: labour=[],      refetch:r7 } = useQuery({ queryKey:['sc-rpt-lab',projectFilter,scFilter,fromDate,toDate], queryFn:()=>scAPI.reportLabour({...baseP,sc_id:scFilter||undefined,from_date:fromDate||undefined,to_date:toDate||undefined}).then(r=>r.data?.data||[]), staleTime:0, enabled:activeReport==='labour' });
  const { data: boqActual=[],   refetch:r8 } = useQuery({ queryKey:['sc-rpt-boq',projectFilter,woFilter], queryFn:()=>scAPI.reportBOQActual({...baseP,wo_id:woFilter||undefined}).then(r=>r.data?.data||[]), staleTime:0, enabled:activeReport==='boq_actual' });
  const { data: ledger=[],      refetch:r9 } = useQuery({ queryKey:['sc-rpt-led',scFilter,fromDate,toDate], queryFn:()=>scAPI.reportLedger({sc_id:scFilter||undefined,from_date:fromDate||undefined,to_date:toDate||undefined}).then(r=>r.data?.data||[]), staleTime:0, enabled:activeReport==='ledger'&&!!scFilter });

  const dataMap  = { summary, wo_balance:woBalance, outstanding, payment_reg:payReg, retention, adv_recovery:advRec, labour, boq_actual:boqActual, ledger };
  const refetchMap={ summary:r1, wo_balance:r2, outstanding:r3, payment_reg:r4, retention:r5, adv_recovery:r6, labour:r7, boq_actual:r8, ledger:r9 };
  const currentData   = dataMap[activeReport]||[];
  const currentRefetch= refetchMap[activeReport];

  const groups = [...new Set(REPORTS.map(r=>r.group))];
  const sel = inp => clsx('border border-slate-200 bg-white rounded-xl px-3 py-2 text-sm shadow-sm focus:outline-none', inp);
  const needsDate = ['payment_reg','labour','ledger'].includes(activeReport);
  const needsSC   = ['wo_balance','payment_reg','adv_recovery','labour','ledger'].includes(activeReport);
  const needsWO   = activeReport==='boq_actual';

  return (
    <div style={{ background: Theme.pageBg, minHeight:'100vh' }}>
      <PageHeader
        title="Reports & Analytics"
        subtitle="Financial, operational and compliance reports for subcontractor management"
        breadcrumbs={[{label:'Subcontractors'},{label:'Reports'}]}
        actions={
          <button onClick={()=>exportCSV(currentData, activeReport)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg shadow-sm"
            style={{background:'#fff', color: Theme.navyDark}}>
            <Download className="w-3.5 h-3.5"/> Export CSV
          </button>
        }
      />

      <div className="p-5 md:p-6 max-w-[1400px] mx-auto space-y-5">

        {/* Report Selector */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          {groups.map(g=>(
            <div key={g}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{g}</p>
              <div className="flex flex-wrap gap-1.5">
                {REPORTS.filter(r=>r.group===g).map(r=>(
                  <button key={r.key} onClick={()=>setReport(r.key)}
                    className={clsx('px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border',
                      activeReport===r.key ? 'text-white border-transparent' : 'text-slate-600 border-slate-200 hover:border-slate-300 bg-white')}
                    style={activeReport===r.key ? {background:`linear-gradient(135deg, ${Theme.navyLight} 0%, ${Theme.navyDark} 100%)`} : {}}>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select value={projectFilter} onChange={e=>setProject(e.target.value)} className={sel('min-w-40')}>
            <option value="">All Projects</option>
            {projects.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          {needsSC && (
            <select value={scFilter} onChange={e=>setSC(e.target.value)} className={sel('min-w-48')}>
              <option value="">{activeReport==='ledger'?'— Select Subcontractor —':'All Subcontractors'}</option>
              {scList.map(s=><option key={s.id} value={s.id}>{s.sc_code} — {s.name}</option>)}
            </select>
          )}
          {needsWO && (
            <select value={woFilter} onChange={e=>setWO(e.target.value)} className={sel('min-w-48')}>
              <option value="">All Work Orders</option>
              {woList.map(w=><option key={w.id} value={w.id}>{w.wo_number} — {w.sc_name}</option>)}
            </select>
          )}
          {needsDate && (
            <>
              <input type="date" value={fromDate} onChange={e=>setFrom(e.target.value)} className={sel('')} placeholder="From"/>
              <input type="date" value={toDate}   onChange={e=>setTo(e.target.value)}   className={sel('')} placeholder="To"/>
            </>
          )}
          <button onClick={currentRefetch} className="p-2 border border-slate-200 bg-white rounded-xl hover:bg-slate-50 shadow-sm">
            <RefreshCw className="w-4 h-4 text-slate-500"/>
          </button>
          <span className="flex items-center text-xs text-slate-400 ml-auto">{currentData.length} records</span>
        </div>

        {/* Ledger requires SC selection */}
        {activeReport==='ledger' && !scFilter && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-5 py-4 text-sm text-blue-700 flex items-center gap-2">
            <Search className="w-4 h-4"/> Select a subcontractor to view their full ledger.
          </div>
        )}

        {/* Report Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">

            {/* ── Summary ── */}
            {activeReport==='summary' && (
              <table className="w-full text-sm">
                <thead><tr style={{background:`linear-gradient(90deg, ${Theme.navy} 0%, ${Theme.navyDark} 100%)`}}>
                  {['SC Code','Name','Trade','WOs','Contract Value','Total Billed','Approved','Paid','Retention'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/80 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>{summary.length===0?<tr><td colSpan={9} className="py-10 text-center text-slate-400 text-xs">No data</td></tr>
                  :summary.map((r,i)=><tr key={i} className={clsx('border-b border-slate-50',i%2===0?'bg-white':'bg-slate-50/30')}>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-indigo-600">{r.sc_code}</td>
                    <td className="px-4 py-2.5 font-semibold text-sm">{r.sc_name}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.trade_type||'—'}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-indigo-600">{r.wo_count}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold">{fmt(r.contract_value)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-indigo-600">{fmt(r.total_billed)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-blue-600">{fmt(r.approved_amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">{fmt(r.total_paid)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-orange-600">{fmt(r.retention_held)}</td>
                  </tr>)}
                </tbody>
              </table>
            )}

            {/* ── WO Balance ── */}
            {activeReport==='wo_balance' && (
              <table className="w-full text-sm">
                <thead><tr style={{background:`linear-gradient(90deg, ${Theme.navy} 0%, ${Theme.navyDark} 100%)`}}>
                  {['WO Number','Subject','Subcontractor','Project','Contract Amt','Billed','Balance','Status'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/80 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>{woBalance.length===0?<tr><td colSpan={8} className="py-10 text-center text-slate-400 text-xs">No data</td></tr>
                  :woBalance.map((r,i)=><tr key={i} className={clsx('border-b border-slate-50',i%2===0?'bg-white':'bg-slate-50/30')}>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-emerald-600">{r.wo_number}</td>
                    <td className="px-4 py-2.5 text-xs max-w-[160px] truncate">{r.subject}</td>
                    <td className="px-4 py-2.5 text-xs">{r.sc_name}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.project_name}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold">{fmt(r.contract_amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-indigo-600">{fmt(r.total_billed)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-blue-600">{fmt(r.balance)}</td>
                    <td className="px-4 py-2.5"><span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize',r.status==='active'?'bg-emerald-100 text-emerald-700':r.status==='completed'?'bg-teal-100 text-teal-700':'bg-slate-100 text-slate-600')}>{r.status}</span></td>
                  </tr>)}
                </tbody>
              </table>
            )}

            {/* ── Outstanding ── */}
            {activeReport==='outstanding' && (
              <table className="w-full text-sm">
                <thead><tr style={{background:`linear-gradient(90deg, ${Theme.navy} 0%, ${Theme.navyDark} 100%)`}}>
                  {['Bill No.','Date','Subcontractor','WO Number','Net Payable','Paid','Outstanding','Status'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/80 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>{outstanding.length===0?<tr><td colSpan={8} className="py-10 text-center text-slate-400 text-xs">No outstanding bills</td></tr>
                  :outstanding.map((r,i)=><tr key={i} className={clsx('border-b border-slate-50',i%2===0?'bg-white':'bg-slate-50/30')}>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-purple-600">{r.bill_number}</td>
                    <td className="px-4 py-2.5 text-xs">{dayjs(r.bill_date).format('DD MMM YY')}</td>
                    <td className="px-4 py-2.5 text-xs">{r.sc_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.wo_number}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold">{fmt(r.net_payable)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">{fmt(r.paid_amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-red-600">{fmt(num(r.net_payable)-num(r.paid_amount))}</td>
                    <td className="px-4 py-2.5"><span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-semibold',r.status==='paid'?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700')}>{r.status}</span></td>
                  </tr>)}
                </tbody>
              </table>
            )}

            {/* ── Payment Register ── */}
            {activeReport==='payment_reg' && (
              <table className="w-full text-sm">
                <thead><tr style={{background:`linear-gradient(90deg, ${Theme.navy} 0%, ${Theme.navyDark} 100%)`}}>
                  {['Date','Voucher No.','Bill No.','Subcontractor','Project','Amount','Mode','UTR/Ref','By'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/80 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>{payReg.length===0?<tr><td colSpan={9} className="py-10 text-center text-slate-400 text-xs">No payments</td></tr>
                  :payReg.map((r,i)=><tr key={i} className={clsx('border-b border-slate-50',i%2===0?'bg-white':'bg-slate-50/30')}>
                    <td className="px-4 py-2.5 text-xs">{dayjs(r.payment_date).format('DD MMM YY')}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.voucher_number||'—'}</td>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-indigo-600">{r.bill_number}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold">{r.sc_name}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.project_name}</td>
                    <td className="px-4 py-2.5 text-right text-sm font-bold text-emerald-700">{fmt2(r.amount)}</td>
                    <td className="px-4 py-2.5 text-xs capitalize">{r.payment_mode?.replace('_',' ')}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.utr_number||r.reference_no||'—'}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.created_by_name||'—'}</td>
                  </tr>)}
                </tbody>
              </table>
            )}

            {/* ── Retention ── */}
            {activeReport==='retention' && (
              <table className="w-full text-sm">
                <thead><tr style={{background:`linear-gradient(90deg, ${Theme.navy} 0%, ${Theme.navyDark} 100%)`}}>
                  {['Subcontractor','Total Retention','Released','Net Held'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/80">{h}</th>)}
                </tr></thead>
                <tbody>{retention.length===0?<tr><td colSpan={4} className="py-10 text-center text-slate-400 text-xs">No retention data</td></tr>
                  :retention.map((r,i)=><tr key={i} className={clsx('border-b border-slate-50',i%2===0?'bg-white':'bg-slate-50/30')}>
                    <td className="px-4 py-2.5 font-semibold">{r.sc_name}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{fmt(r.total_retention)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">{fmt(r.released)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-amber-600">{fmt(num(r.total_retention)-num(r.released))}</td>
                  </tr>)}
                </tbody>
              </table>
            )}

            {/* ── Advance Recovery ── */}
            {activeReport==='adv_recovery' && (
              <table className="w-full text-sm">
                <thead><tr style={{background:`linear-gradient(90deg, ${Theme.navy} 0%, ${Theme.navyDark} 100%)`}}>
                  {['Advance No.','Date','WO','Subcontractor','Project','Amount','Recovery %','Recovered','Balance','Status'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/80 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>{advRec.length===0?<tr><td colSpan={10} className="py-10 text-center text-slate-400 text-xs">No advance data</td></tr>
                  :advRec.map((r,i)=><tr key={i} className={clsx('border-b border-slate-50',i%2===0?'bg-white':'bg-slate-50/30')}>
                    <td className="px-4 py-2.5 font-mono text-xs font-bold text-indigo-600">{r.advance_number}</td>
                    <td className="px-4 py-2.5 text-xs">{dayjs(r.advance_date).format('DD MMM YY')}</td>
                    <td className="px-4 py-2.5 font-mono text-xs">{r.wo_number}</td>
                    <td className="px-4 py-2.5 text-xs">{r.sc_name}</td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">{r.project_name}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold">{fmt(r.amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs">{r.recovery_pct}%</td>
                    <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">{fmt(r.recovered_amount)}</td>
                    <td className="px-4 py-2.5 text-right text-xs font-bold text-amber-600">{fmt(r.balance_amount)}</td>
                    <td className="px-4 py-2.5"><span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-bold',r.status==='fully_recovered'?'bg-emerald-100 text-emerald-700':'bg-blue-100 text-blue-700')}>{r.status==='fully_recovered'?'Recovered':'Active'}</span></td>
                  </tr>)}
                </tbody>
              </table>
            )}

            {/* ── Labour Attendance ── */}
            {activeReport==='labour' && (
              <table className="w-full text-sm">
                <thead><tr style={{background:`linear-gradient(90deg, ${Theme.navy} 0%, ${Theme.navyDark} 100%)`}}>
                  {['Date','Subcontractor','Present','Absent','Half Day','Total Wages'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/80">{h}</th>)}
                </tr></thead>
                <tbody>{labour.length===0?<tr><td colSpan={6} className="py-10 text-center text-slate-400 text-xs">No attendance data</td></tr>
                  :labour.map((r,i)=><tr key={i} className={clsx('border-b border-slate-50',i%2===0?'bg-white':'bg-slate-50/30')}>
                    <td className="px-4 py-2.5 text-xs">{dayjs(r.date).format('DD MMM YY')}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold">{r.sc_name||'—'}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-emerald-600">{r.present}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-red-500">{r.absent}</td>
                    <td className="px-4 py-2.5 text-center font-bold text-amber-600">{r.half_day}</td>
                    <td className="px-4 py-2.5 text-right font-bold">{fmt(r.total_wages)}</td>
                  </tr>)}
                </tbody>
              </table>
            )}

            {/* ── BOQ vs Actual ── */}
            {activeReport==='boq_actual' && (
              <table className="w-full text-sm">
                <thead><tr style={{background:`linear-gradient(90deg, ${Theme.navy} 0%, ${Theme.navyDark} 100%)`}}>
                  {['Code','Description','Unit','WO Qty','WO Amount','MB Qty','Billed Qty','Balance Amt','WO No.'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/80 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>{boqActual.length===0?<tr><td colSpan={9} className="py-10 text-center text-slate-400 text-xs">No data — select a project or work order</td></tr>
                  :boqActual.map((r,i)=>{
                    const billedPct = num(r.wo_qty)>0 ? Math.round((num(r.billed_qty)/num(r.wo_qty))*100):0;
                    return <tr key={i} className={clsx('border-b border-slate-50',i%2===0?'bg-white':'bg-slate-50/30')}>
                      <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{r.item_code||'—'}</td>
                      <td className="px-4 py-2.5 text-xs max-w-[200px] truncate font-medium">{r.description}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500">{r.unit}</td>
                      <td className="px-4 py-2.5 text-right text-xs">{r.wo_qty}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold">{fmt(r.wo_amount)}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-emerald-600">{r.mb_qty}</td>
                      <td className="px-4 py-2.5 text-right text-xs">
                        <span className="font-bold text-indigo-600">{r.billed_qty}</span>
                        <span className="text-slate-400 ml-1">({billedPct}%)</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-amber-600">{fmt(r.balance_amount)}</td>
                      <td className="px-4 py-2.5 font-mono text-xs">{r.wo_number}</td>
                    </tr>;
                  })}
                </tbody>
              </table>
            )}

            {/* ── Contractor Ledger ── */}
            {activeReport==='ledger' && scFilter && (
              <table className="w-full text-sm">
                <thead><tr style={{background:`linear-gradient(90deg, ${Theme.navy} 0%, ${Theme.navyDark} 100%)`}}>
                  {['Date','Type','Reference No.','Debit (Bill/Adv)','Credit (Payment)','Running Balance','Status'].map(h=><th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-white/80 whitespace-nowrap">{h}</th>)}
                </tr></thead>
                <tbody>
                  {ledger.length===0?<tr><td colSpan={7} className="py-10 text-center text-slate-400 text-xs">No transactions found for this period</td></tr>
                  :ledger.map((r,i)=>(
                    <tr key={i} className={clsx('border-b border-slate-50',i%2===0?'bg-white':'bg-slate-50/30')}>
                      <td className="px-4 py-2.5 text-xs">{dayjs(r.txn_date).format('DD MMM YY')}</td>
                      <td className="px-4 py-2.5"><span className={clsx('text-[10px] px-2 py-0.5 rounded-full font-bold',r.txn_type==='Bill'?'bg-indigo-100 text-indigo-700':r.txn_type==='Payment'?'bg-emerald-100 text-emerald-700':'bg-amber-100 text-amber-700')}>{r.txn_type}</span></td>
                      <td className="px-4 py-2.5 font-mono text-xs">{r.ref_no||'—'}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-red-600">{num(r.debit)>0?fmt2(r.debit):'—'}</td>
                      <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600">{num(r.credit)>0?fmt2(r.credit):'—'}</td>
                      <td className="px-4 py-2.5 text-right text-sm font-bold" style={{color:num(r.running_balance)>0?Theme.navy:'#059669'}}>{fmt2(Math.abs(num(r.running_balance)))}</td>
                      <td className="px-4 py-2.5 text-xs text-slate-500 capitalize">{r.status}</td>
                    </tr>
                  ))}
                  {ledger.length>0 && (
                    <tr className="border-t-2 border-slate-300 bg-slate-50 font-bold">
                      <td colSpan={3} className="px-4 py-3 text-xs uppercase tracking-wider text-slate-600">Closing Balance</td>
                      <td className="px-4 py-3 text-right text-xs text-red-600">{fmt2(ledger.reduce((s,r)=>s+num(r.debit),0))}</td>
                      <td className="px-4 py-3 text-right text-xs text-emerald-600">{fmt2(ledger.reduce((s,r)=>s+num(r.credit),0))}</td>
                      <td className="px-4 py-3 text-right text-sm" style={{color:Theme.navy}}>{fmt2(ledger[ledger.length-1]?.running_balance||0)}</td>
                      <td></td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
