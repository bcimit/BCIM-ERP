// src/pages/hr-admin/AppraisalPage.jsx
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Plus, X, TrendingUp, Users, Award, ChevronRight, CheckCircle } from 'lucide-react';
import { hrAppraisalsAPI, hrEmployeesAPI } from '../../api/client';
import toast from 'react-hot-toast';

const B = { navy:'#0A1F5C', blue:'#2563EB', yellow:'#F4C430', success:'#10B981', warning:'#F59E0B', danger:'#EF4444' };
const fade = (d=0) => ({ initial:{opacity:0,y:14}, animate:{opacity:1,y:0}, transition:{duration:0.35,delay:d,ease:[0.16,1,0.3,1]} });
const AVATAR_COLORS = [['#6366F1','#4F46E5'],['#0EA5E9','#0284C7'],['#10B981','#059669'],['#F59E0B','#D97706'],['#EF4444','#DC2626'],['#8B5CF6','#7C3AED']];
const avatarGrad = (n) => AVATAR_COLORS[(n?.charCodeAt(0)||0)%AVATAR_COLORS.length];
const initials   = (n) => (n||'U').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();

// BCIM fixed performance parameters
const PARAMS = [
  { key: 'punctuality',  label: 'Punctuality',                    weightage: 10 },
  { key: 'discipline',   label: 'Discipline',                     weightage: 15 },
  { key: 'safety',       label: 'Safety / HSE',                   weightage: 20 },
  { key: 'housekeeping', label: 'Housekeeping',                   weightage: 15 },
  { key: 'quality',      label: 'Quality Assurance / Zero Rework',weightage: 20 },
  { key: 'target',       label: 'On-Time Target / Goal Achievement', weightage: 20 },
];

const CRITERIA = {
  punctuality: [
    'Reports to duty at the scheduled reporting time every working day',
    'Attends the morning toolbox meeting without delay',
    'Maintains regular attendance throughout the review period',
    'Avoids habitual late coming',
    'Completes biometric attendance within the prescribed time',
    'Returns from tea and lunch breaks on time',
    'Does not leave the workplace without prior approval',
    'Follows approved shift timings without deviation',
    'Maintains discipline in reporting after weekly offs and holidays',
    'Reports for overtime duties at the scheduled time',
    'Responds promptly to emergency work requirements',
    'Ensures work starts immediately after attendance without unnecessary delay',
    'Completes assigned daily tasks within the planned time',
    'Meets daily productivity targets without repeated reminders',
    'Adheres to project schedules and milestone timelines',
    'Coordinates with supervisors to avoid work delays',
    'Hands over work to the next shift on time (where applicable)',
    'Submits daily reports and work updates within the stipulated time',
    'Attends all scheduled meetings and training sessions punctually',
    'Responds promptly to instructions from supervisors',
    'Maintains readiness of tools, PPE, and materials before the start of work',
    'Plans work efficiently to minimize idle time',
    'Avoids unnecessary absenteeism affecting project progress',
    'Informs the reporting manager well in advance in case of absence or late reporting',
    'Maintains a positive attitude towards time discipline',
    'Sets an example of punctuality for fellow employees',
    'Supports timely completion of project activities',
    'Demonstrates commitment to organizational time management standards',
    'Consistently follows company attendance and punctuality policies',
    'Contributes to improving overall project efficiency through disciplined time management',
  ],
  discipline: [
    'Follows all company rules, regulations, and site policies',
    'Maintains professional behaviour at the workplace',
    'Complies with instructions issued by the reporting manager and management',
    'Demonstrates respect towards supervisors, co-workers, clients, consultants, and subcontractors',
    'Maintains courteous and professional communication with all stakeholders',
    'Adheres to the company\'s Code of Conduct at all times',
    'Maintains proper grooming and wears the prescribed uniform/ID card',
    'Uses Personal Protective Equipment (PPE) as per safety requirements',
    'Avoids unauthorized absence from the work location',
    'Does not leave the worksite without prior approval',
    'Refrains from mobile phone usage during working hours except for official purposes',
    'Avoids smoking, tobacco consumption, alcohol, or any prohibited substances at the workplace',
    'Maintains honesty and integrity in all work-related activities',
    'Protects company property, tools, equipment, and materials from misuse or damage',
    'Does not engage in arguments, abusive language, or disruptive behaviour',
    'Cooperates effectively with team members to maintain a healthy work environment',
    'Maintains confidentiality of company information and project documents',
    'Follows security procedures for entry, exit, and visitor management',
    'Reports misconduct, unsafe practices, or policy violations promptly',
    'Demonstrates accountability for assigned responsibilities',
    'Accepts constructive feedback positively and implements corrective actions',
    'Avoids repeated violations of company rules or disciplinary procedures',
    'Maintains proper workplace etiquette and professional conduct',
    'Supports a culture of discipline and teamwork on the project',
    'Complies with all statutory requirements and client-specific site regulations',
    'Follows housekeeping standards in the work area',
    'Completes assigned responsibilities without constant supervision',
    'Demonstrates commitment to organizational values and ethics',
    'Maintains discipline during meetings, training sessions, and toolbox talks',
    'Acts as a role model by promoting discipline among fellow employees',
  ],
  housekeeping: [
    'Maintains a clean and organized work area throughout the shift',
    'Keeps the workplace free from unnecessary materials, scrap, and debris',
    'Segregates waste materials as per the project waste management plan',
    'Disposes of construction waste only at designated locations',
    'Ensures tools, equipment, and materials are stored properly after use',
    'Maintains clear access to walkways, staircases, emergency exits, and work zones',
    'Keeps scaffolding, platforms, and working areas clean and obstruction-free',
    'Prevents accumulation of waste that may create safety hazards',
    'Stacks construction materials safely and neatly as per approved procedures',
    'Maintains proper identification and labeling of stored materials',
    'Ensures cables, hoses, and electrical cords are arranged neatly to prevent tripping hazards',
    'Keeps storage areas clean, orderly, and easily accessible',
    'Returns unused materials to the designated storage location',
    'Uses material economically to minimize wastage',
    'Reports housekeeping deficiencies immediately to the supervisor',
    'Maintains cleanliness of common facilities such as site offices, rest areas, and welfare facilities',
    'Ensures drinking water and pantry areas are kept clean and hygienic',
    'Maintains cleanliness around machinery, equipment, and plant areas',
    'Ensures firefighting equipment and electrical panels remain easily accessible',
    'Removes oil spills, water leakage, and other slippery substances immediately or reports them',
    'Maintains proper housekeeping during and after completion of assigned work',
    'Keeps workstations organized to improve productivity and efficiency',
    'Follows the project\'s housekeeping standards and client requirements',
    'Participates actively in housekeeping drives and site cleanliness campaigns',
    'Ensures waste bins are used correctly and not overloaded',
    'Maintains good housekeeping during material loading and unloading activities',
    'Avoids leaving tools, materials, or waste unattended in working areas',
    'Supports the implementation of 5S principles (Sort, Set in Order, Shine, Standardize, Sustain)',
    'Demonstrates ownership and responsibility for maintaining a clean work environment',
    'Encourages fellow employees to maintain high housekeeping standards',
  ],
  safety: [
    'Strictly follows all company HSE policies, procedures, and client safety requirements',
    'Consistently wears the required Personal Protective Equipment (PPE) correctly',
    'Attends daily Toolbox Talks (TBT) and actively participates',
    'Performs work only after obtaining the required Permit to Work (PTW), where applicable',
    'Complies with Job Safety Analysis (JSA) / Risk Assessment before commencing work',
    'Identifies and reports unsafe acts and unsafe conditions immediately',
    'Takes prompt corrective action to eliminate or control safety hazards',
    'Maintains a safe work environment for self and fellow employees',
    'Uses tools, equipment, and machinery safely and only for their intended purpose',
    'Conducts pre-use inspection of tools, equipment, and lifting accessories',
    'Follows safe lifting, rigging, and material handling practices',
    'Adheres to work-at-height safety requirements, including proper use of full-body harnesses',
    'Ensures scaffolding, ladders, and access platforms are used safely',
    'Follows electrical safety procedures and lockout/tagout (LOTO) requirements',
    'Maintains barricading, warning signs, and exclusion zones during work activities',
    'Ensures emergency exits, fire extinguishers, and safety equipment remain accessible',
    'Reports near misses, incidents, accidents, and dangerous occurrences without delay',
    'Cooperates during incident investigations and implements corrective actions',
    'Maintains excellent housekeeping to eliminate safety hazards',
    'Handles hazardous materials safely and follows MSDS/SDS instructions',
    'Prevents environmental pollution by proper disposal of waste, oil, chemicals, and debris',
    'Conserves water, electricity, fuel, and other natural resources',
    'Demonstrates safe behaviour while operating vehicles, equipment, or machinery',
    'Complies with speed limits and traffic management rules within the project',
    'Participates actively in safety training, emergency drills, and awareness programs',
    'Follows all instructions issued by the Safety Department and Site Management',
    'Does not engage in unsafe shortcuts that may endanger people or property',
    'Immediately stops and reports unsafe work practices when observed',
    'Encourages co-workers to follow safe work practices and promotes a positive safety culture',
    'Demonstrates commitment to achieving Zero Accident and Zero Harm objectives',
  ],
  quality: [
    'Understands and follows the company\'s Quality Management System (QMS) and ISO 9001 procedures',
    'Executes work strictly as per approved drawings, specifications, method statements, and client requirements',
    'Ensures "Right First Time" execution to eliminate defects and rework',
    'Delivers quality workmanship meeting project and contractual standards',
    'Verifies the latest approved drawings and revisions before commencing work',
    'Complies with Inspection & Test Plans (ITP), Method Statements, and Quality Control Checklists',
    'Raises Inspection Requests (IR) only after completing self-inspection',
    'Performs self-checks before offering work for QA/QC or Client/Consultant inspection',
    'Maintains dimensional accuracy, levels, alignment, line, plumb, and finishing quality',
    'Promptly identifies and reports quality deviations or non-conformities',
    'Implements corrective and preventive actions (CAPA) for quality issues',
    'Ensures Non-Conformance Reports (NCRs) are minimized and closed within stipulated time',
    'Completes all punch list/snag list items within the agreed timeline',
    'Maintains proper quality documentation, records, registers, and inspection reports',
    'Ensures all measuring instruments and equipment used are calibrated',
    'Follows approved material handling, storage, preservation, and identification procedures',
    'Prevents damage to completed works through proper protection and housekeeping',
    'Minimizes wastage of cement, steel, concrete, sand, aggregates, and other materials',
    'Uses construction materials efficiently as per approved consumption norms',
    'Avoids damage, breakage, theft, misuse, or unnecessary loss of company materials',
    'Plans work effectively to avoid dismantling and reconstruction',
    'Coordinates with Engineering, QA/QC, Planning, Stores, and Execution teams',
    'Complies with approved construction sequences and work methodologies',
    'Ensures all work complies with relevant IS Codes, project specifications, and statutory requirements',
    'Actively participates in quality awareness programs and toolbox meetings related to quality',
    'Demonstrates attention to detail in every activity',
    'Suggests innovative ideas to improve quality and reduce material wastage',
    'Supports continuous improvement initiatives under the ISO Quality Management System',
    'Maintains customer-focused work practices to achieve consultant and client satisfaction',
    'Ensures zero customer complaints due to poor workmanship',
  ],
  target: [
    'Consistently achieves daily, weekly, and monthly assigned targets',
    'Completes assigned work within the planned schedule',
    'Meets project milestones without unnecessary delays',
    'Demonstrates effective planning and prioritization of work',
    'Utilizes working hours efficiently with minimum idle time',
    'Maintains high productivity throughout the review period',
    'Completes work within the approved budget',
    'Ensures optimum utilization of manpower, materials, machinery, and equipment',
    'Minimizes material wastage and unnecessary consumption',
    'Prevents rework by ensuring "Right First Time" execution',
    'Identifies opportunities to reduce project costs without compromising quality or safety',
    'Contributes to achieving monthly billing and revenue targets',
    'Supports timely completion of project activities to avoid delay penalties',
    'Demonstrates accountability for achieving individual and team goals',
    'Coordinates effectively with Engineering, Planning, QA/QC, Safety, Stores, Procurement, and subcontractors',
    'Resolves site issues promptly to prevent work stoppages',
    'Takes ownership of assigned responsibilities until successful completion',
    'Meets client and consultant expectations regarding delivery timelines',
    'Follows approved work schedules and construction sequences',
    'Proactively monitors work progress and initiates corrective actions where required',
    'Ensures maximum utilization of available resources',
    'Avoids overtime through proper planning and execution',
    'Reduces equipment idle time and improves operational efficiency',
    'Maintains proper documentation to facilitate timely billing and project closure',
    'Demonstrates innovation in improving productivity and reducing costs',
    'Suggests process improvements that increase efficiency and profitability',
    'Completes pending activities within committed timelines',
    'Supports achievement of departmental and organizational KPIs',
    'Demonstrates commitment to customer satisfaction through timely project delivery',
    'Maintains focus on achieving project objectives without compromising Safety, Quality, or Compliance',
  ],
};

const RATING_LABELS = { 5:'Outstanding', 4:'Exceeds Expectations', 3:'Meets Expectations', 2:'Needs Improvement', 1:'Unsatisfactory' };

// Weighted score = (rating/5) × weightage → total max 100
function calcTotal(scores) {
  return PARAMS.reduce((sum, p) => {
    const r = Number(scores?.[p.key] || 0);
    return sum + (r / 5) * p.weightage;
  }, 0);
}

function gradeFromTotal(total) {
  if (total >= 90) return { label: 'Outstanding',        color: 'text-emerald-700', bg: 'bg-emerald-50', bar: 'bg-emerald-500' };
  if (total >= 80) return { label: 'Very Good',          color: 'text-blue-700',    bg: 'bg-blue-50',    bar: 'bg-blue-500'    };
  if (total >= 70) return { label: 'Good',               color: 'text-indigo-700',  bg: 'bg-indigo-50',  bar: 'bg-indigo-500'  };
  if (total >= 60) return { label: 'Satisfactory',       color: 'text-amber-700',   bg: 'bg-amber-50',   bar: 'bg-amber-500'   };
  return              { label: 'Needs Improvement',   color: 'text-red-700',     bg: 'bg-red-50',     bar: 'bg-red-500'     };
}

const STATUS_CFG = {
  pending:   { label:'Pending',   bg:'bg-amber-50',  text:'text-amber-700',  dot:'bg-amber-400'  },
  draft:     { label:'Draft',     bg:'bg-gray-100',  text:'text-gray-600',   dot:'bg-gray-400'   },
  completed: { label:'Completed', bg:'bg-blue-50',   text:'text-blue-700',   dot:'bg-blue-500'   },
  approved:  { label:'Approved',  bg:'bg-emerald-50',text:'text-emerald-700',dot:'bg-emerald-500' },
};

const inp = "w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 transition-all";
const lbl = "text-xs font-bold text-gray-600 uppercase tracking-wide block mb-1.5";

export default function AppraisalPage() {
  const [modal, setModal]   = useState(false);
  const [detail, setDetail] = useState(null);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['hr-appraisals'],
    queryFn:  () => hrAppraisalsAPI.list().then(r => r.data),
  });
  const appraisals = data?.data || [];

  const outstanding = appraisals.filter(a => {
    const t = calcTotal(a.kra_scores || {});
    return t >= 90;
  }).length;

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
            <h1 className="text-2xl font-black text-white">Employee Performance Review</h1>
            <p className="text-white/55 text-sm mt-1">Monthly / Quarterly appraisals — BCIM Engineering Pvt Ltd</p>
          </div>
          <button onClick={()=>setModal(true)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black shadow-lg hover:opacity-90 self-start"
            style={{background:B.yellow,color:B.navy}}>
            <Plus className="w-4 h-4"/> New Review
          </button>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div {...fade(0.08)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label:'Total Reviews',  value:appraisals.length,                                        icon:Users,     color:B.blue,    bg:'#EFF6FF' },
          { label:'Outstanding',    value:outstanding,                                              icon:Award,     color:B.success, bg:'#ECFDF5' },
          { label:'Avg Score',      value: appraisals.length ? (appraisals.reduce((s,a)=>s+calcTotal(a.kra_scores||{}),0)/appraisals.length).toFixed(1)+'/100' : '—', icon:TrendingUp,color:B.warning,bg:'#FFFBEB' },
          { label:'Pending',        value:appraisals.filter(a=>a.status==='pending'||a.status==='draft').length, icon:Star, color:'#6366F1', bg:'#EEF2FF' },
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
          <p className="text-gray-500 font-bold">No reviews yet</p>
          <p className="text-gray-400 text-sm mt-1">Click "New Review" to get started</p>
        </div>
      ) : (
        <motion.div {...fade(0.16)} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {appraisals.map((a,i)=>{
            const total  = calcTotal(a.kra_scores || {});
            const grade  = gradeFromTotal(total);
            const st     = STATUS_CFG[a.status] || STATUS_CFG.draft;
            const [g1,g2]= avatarGrad(a.employee_name);
            const pct    = Math.round(total);
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
                      <p className="text-xs text-gray-400">{a.employee_code} · {a.department_name}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${st.bg} ${st.text}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{st.label}
                  </span>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span className="font-medium">Total Score</span>
                    <span className={`font-black px-2 py-0.5 rounded-full ${grade.bg} ${grade.color}`}>
                      {pct}/100 · {grade.label}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${grade.bar}`} style={{width:`${pct}%`}}/>
                  </div>
                </div>

                {a.kra_scores && (
                  <div className="space-y-1 mb-3 border-t border-gray-50 pt-3">
                    {PARAMS.slice(0,3).map(p=>{
                      const r = Number(a.kra_scores?.[p.key]||0);
                      const ws = ((r/5)*p.weightage).toFixed(1);
                      return (
                        <div key={p.key} className="flex items-center justify-between text-xs text-gray-500">
                          <span className="truncate max-w-[140px]">{p.label}</span>
                          <span className="font-bold text-gray-700 ml-2">{ws}/{p.weightage}</span>
                        </div>
                      );
                    })}
                    <p className="text-xs text-gray-400 italic">+3 more parameters</p>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                  <div className="text-xs text-gray-400">
                    <span className="capitalize">{a.review_period_type || 'monthly'}</span>
                    {a.appraisal_year && <span className="ml-2">· {a.appraisal_year}</span>}
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-300"/>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {modal  && <ReviewModal onClose={()=>setModal(false)} onSuccess={()=>{ setModal(false); qc.invalidateQueries({queryKey:['hr-appraisals']}); }}/>}
      {detail && <DetailModal appraisal={detail} onClose={()=>setDetail(null)}/>}
    </div>
  );
}

function ReviewModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({
    user_id: '', appraisal_year: new Date().getFullYear(),
    review_period_type: 'monthly', review_date: '',
    comments: '', strengths: '', improvements: '', training_required: '',
    increment_percentage: '',
  });
  const [scores, setScores] = useState({ punctuality:3, discipline:3, safety:3, housekeeping:3, quality:3, target:3 });
  const [openCriteria, setOpenCriteria] = useState(null);
  const toggleCriteria = (key) => setOpenCriteria(p => p === key ? null : key);

  const { data:empData } = useQuery({ queryKey:['hr-employees-active'], queryFn:()=>hrEmployeesAPI.list({employment_status:'active'}).then(r=>r.data) });

  const total = useMemo(() => calcTotal(scores), [scores]);
  const grade = useMemo(() => gradeFromTotal(total), [total]);

  const createMut = useMutation({
    mutationFn: (d) => hrAppraisalsAPI.create(d),
    onSuccess: () => { toast.success('Review saved'); onSuccess(); },
    onError: e => toast.error(e.response?.data?.error || 'Error'),
  });

  const handleSubmit = () => {
    if (!form.user_id) return toast.error('Select employee');
    createMut.mutate({
      ...form,
      kra_scores: scores,
      kra_score: total.toFixed(2),
      overall_rating: grade.label,
      status: 'completed',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)'}}>
      <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
        transition={{duration:0.22}} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{background:`linear-gradient(135deg,${B.navy},#1e3a8a)`}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Star className="w-5 h-5 text-white"/>
            </div>
            <div>
              <p className="font-bold text-white">Employee Performance Review</p>
              <p className="text-white/55 text-xs">BCIM Engineering Pvt Ltd — Monthly / Quarterly</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X className="w-4 h-4"/></button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* Employee & Period */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className={lbl}>Review Period</label>
              <select className={inp} value={form.review_period_type} onChange={e=>setForm(p=>({...p,review_period_type:e.target.value}))}>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Year</label>
              <input className={inp} type="number" value={form.appraisal_year} onChange={e=>setForm(p=>({...p,appraisal_year:e.target.value}))}/>
            </div>
            <div>
              <label className={lbl}>Review Date</label>
              <input className={inp} type="date" value={form.review_date} onChange={e=>setForm(p=>({...p,review_date:e.target.value}))}/>
            </div>
          </div>

          <div>
            <label className={lbl}>Employee</label>
            <select className={inp} value={form.user_id} onChange={e=>setForm(p=>({...p,user_id:e.target.value}))}>
              <option value="">Select Employee</option>
              {(empData?.data||[]).map(e=><option key={e.id} value={e.id}>{e.name} ({e.employee_code})</option>)}
            </select>
          </div>

          {/* Rating scale legend */}
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-4 py-3">
            <p className="text-xs font-black text-slate-500 uppercase tracking-wide mb-2">Rating Scale</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              {Object.entries(RATING_LABELS).reverse().map(([v,l])=>(
                <span key={v}><span className="font-black text-slate-900">{v}</span> = {l}</span>
              ))}
            </div>
          </div>

          {/* 6 Parameters */}
          <div>
            <p className={lbl}>Performance Parameters</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2.5 text-xs font-black text-gray-500 uppercase tracking-wide w-6">#</th>
                    <th className="text-left px-4 py-2.5 text-xs font-black text-gray-500 uppercase tracking-wide">Parameter</th>
                    <th className="text-center px-4 py-2.5 text-xs font-black text-gray-500 uppercase tracking-wide w-16">Wt.</th>
                    <th className="text-center px-4 py-2.5 text-xs font-black text-gray-500 uppercase tracking-wide w-36">Rating (1–5)</th>
                    <th className="text-center px-4 py-2.5 text-xs font-black text-gray-500 uppercase tracking-wide w-16">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {PARAMS.map((p,i)=>{
                    const r    = Number(scores[p.key]||0);
                    const ws   = ((r/5)*p.weightage).toFixed(1);
                    const open = openCriteria === p.key;
                    return (
                      <React.Fragment key={p.key}>
                        <tr className={i%2===0?'bg-white':'bg-gray-50/50'}>
                          <td className="px-4 py-3 text-xs text-gray-400 font-bold">{i+1}</td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-gray-800">{p.label}</div>
                            <button
                              type="button"
                              onClick={()=>toggleCriteria(p.key)}
                              className="text-xs text-blue-500 hover:text-blue-700 font-bold mt-0.5 flex items-center gap-1"
                            >
                              {open ? '▲ Hide criteria' : '▼ View criteria'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-center text-gray-500 font-bold">{p.weightage}</td>
                          <td className="px-4 py-3 text-center">
                            <select
                              className="w-full px-2 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-bold text-center focus:outline-none focus:border-blue-400"
                              value={r}
                              onChange={e=>setScores(s=>({...s,[p.key]:Number(e.target.value)}))}
                            >
                              <option value={0}>— Select —</option>
                              {[5,4,3,2,1].map(v=><option key={v} value={v}>{v} – {RATING_LABELS[v]}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-3 text-center font-black text-blue-700">{ws}</td>
                        </tr>
                        {open && (
                          <tr className="bg-blue-50/60">
                            <td colSpan={5} className="px-6 py-3">
                              <p className="text-xs font-black text-blue-700 uppercase tracking-wide mb-2">Assessment Criteria — {p.label}</p>
                              <ul className="space-y-1">
                                {(CRITERIA[p.key]||[]).map((c,ci)=>(
                                  <li key={ci} className="flex items-start gap-2 text-xs text-gray-600">
                                    <span className="mt-0.5 text-blue-400 flex-shrink-0">•</span>
                                    <span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  <tr className="bg-slate-800 text-white">
                    <td colSpan={2} className="px-4 py-3 font-black text-sm">Total Score</td>
                    <td className="px-4 py-3 text-center font-black">100</td>
                    <td className="px-4 py-3"/>
                    <td className="px-4 py-3 text-center font-black text-lg">{total.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Grade badge */}
            <div className={`mt-3 rounded-xl px-4 py-3 flex items-center justify-between ${grade.bg}`}>
              <span className={`text-sm font-black ${grade.color}`}>Overall Performance Rating</span>
              <span className={`text-sm font-black ${grade.color}`}>{grade.label}</span>
            </div>
          </div>

          {/* Observations */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={lbl}>Major Strengths</label>
              <textarea className={inp} rows={2} placeholder="Key strengths…" value={form.strengths} onChange={e=>setForm(p=>({...p,strengths:e.target.value}))}/>
            </div>
            <div>
              <label className={lbl}>Areas for Improvement</label>
              <textarea className={inp} rows={2} placeholder="Improvement areas…" value={form.improvements} onChange={e=>setForm(p=>({...p,improvements:e.target.value}))}/>
            </div>
            <div>
              <label className={lbl}>Training Required</label>
              <input className={inp} placeholder="Training needs…" value={form.training_required} onChange={e=>setForm(p=>({...p,training_required:e.target.value}))}/>
            </div>
            <div>
              <label className={lbl}>Increment % (optional)</label>
              <input className={inp} type="number" placeholder="e.g. 10" value={form.increment_percentage} onChange={e=>setForm(p=>({...p,increment_percentage:e.target.value}))}/>
            </div>
          </div>

          <div>
            <label className={lbl}>Comments / Remarks</label>
            <textarea className={inp} rows={2} placeholder="Reporting manager comments…" value={form.comments} onChange={e=>setForm(p=>({...p,comments:e.target.value}))}/>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-5 pt-3 flex-shrink-0 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-bold">Cancel</button>
          <button onClick={handleSubmit} disabled={createMut.isPending}
            className="flex-1 py-2.5 text-white rounded-xl text-sm font-black disabled:opacity-50"
            style={{background:`linear-gradient(135deg,${B.blue},${B.navy})`}}>
            {createMut.isPending ? 'Saving…' : 'Save Review'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function DetailModal({ appraisal:a, onClose }) {
  const scores = a.kra_scores || {};
  const total  = calcTotal(scores);
  const grade  = gradeFromTotal(total);
  const st     = STATUS_CFG[a.status] || STATUS_CFG.draft;
  const [g1,g2]= avatarGrad(a.employee_name);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{background:'rgba(0,0,0,0.5)',backdropFilter:'blur(4px)'}}>
      <motion.div initial={{scale:0.95,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}}
        transition={{duration:0.22}} className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">

        <div className="flex items-center justify-between px-6 py-4 flex-shrink-0"
          style={{background:`linear-gradient(135deg,${B.navy},#1e3a8a)`}}>
          <p className="font-bold text-white">Performance Review Detail</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center text-white hover:bg-white/20"><X className="w-4 h-4"/></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* Employee header */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white text-lg font-black flex-shrink-0"
              style={{background:`linear-gradient(135deg,${g1},${g2})`}}>
              {initials(a.employee_name)}
            </div>
            <div className="flex-1">
              <p className="font-black text-gray-900 text-lg">{a.employee_name}</p>
              <p className="text-sm text-gray-500">{a.employee_code} · {a.department_name}</p>
              <p className="text-xs text-gray-400 capitalize">{a.review_period_type || 'monthly'} Review · {a.appraisal_year}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5 ${st.bg} ${st.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}/>{st.label}
            </span>
          </div>

          {/* Score summary */}
          <div className={`rounded-xl p-4 ${grade.bg}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-black text-base ${grade.color}`}>Total Score: {total.toFixed(1)} / 100</span>
              <span className={`font-black text-sm ${grade.color}`}>{grade.label}</span>
            </div>
            <div className="h-3 bg-white/60 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${grade.bar}`} style={{width:`${total}%`}}/>
            </div>
          </div>

          {/* Parameter breakdown */}
          <div>
            <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-2">Parameter Scores</p>
            <div className="rounded-xl border border-gray-100 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left px-4 py-2 text-xs font-black text-gray-400 uppercase">Parameter</th>
                    <th className="text-center px-4 py-2 text-xs font-black text-gray-400 uppercase">Weight</th>
                    <th className="text-center px-4 py-2 text-xs font-black text-gray-400 uppercase">Rating</th>
                    <th className="text-center px-4 py-2 text-xs font-black text-gray-400 uppercase">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {PARAMS.map((p,i)=>{
                    const r  = Number(scores[p.key]||0);
                    const ws = ((r/5)*p.weightage).toFixed(1);
                    return (
                      <tr key={p.key} className={i%2===0?'bg-white':'bg-gray-50/50'}>
                        <td className="px-4 py-2.5 text-gray-700 font-medium">{p.label}</td>
                        <td className="px-4 py-2.5 text-center text-gray-400">{p.weightage}</td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="font-bold text-gray-800">{r || '—'}</span>
                          {r > 0 && <span className="text-xs text-gray-400 ml-1">({RATING_LABELS[r]})</span>}
                        </td>
                        <td className="px-4 py-2.5 text-center font-black text-blue-700">{ws}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Observations */}
          {(a.strengths || a.improvements || a.training_required) && (
            <div className="grid gap-3 sm:grid-cols-3">
              {a.strengths && (
                <div className="bg-emerald-50 rounded-xl p-3">
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-wide mb-1">Strengths</p>
                  <p className="text-sm text-emerald-800">{a.strengths}</p>
                </div>
              )}
              {a.improvements && (
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs font-black text-amber-600 uppercase tracking-wide mb-1">Improvements</p>
                  <p className="text-sm text-amber-800">{a.improvements}</p>
                </div>
              )}
              {a.training_required && (
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs font-black text-blue-600 uppercase tracking-wide mb-1">Training</p>
                  <p className="text-sm text-blue-800">{a.training_required}</p>
                </div>
              )}
            </div>
          )}

          {a.increment_pct > 0 && (
            <div className="bg-emerald-50 rounded-xl p-3 flex items-center justify-between">
              <span className="text-sm font-bold text-emerald-700">Increment Recommended</span>
              <span className="text-2xl font-black text-emerald-700">{a.increment_pct}%</span>
            </div>
          )}

          {a.comments && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs font-black text-gray-500 uppercase tracking-wide mb-1">Comments / Remarks</p>
              <p className="text-sm text-gray-700">{a.comments}</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
