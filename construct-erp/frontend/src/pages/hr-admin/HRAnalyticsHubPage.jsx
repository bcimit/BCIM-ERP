// HR Analytics Hub — dedicated analytics page
import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Users, TrendingUp, Building2, Briefcase,
  UserCheck, Clock, ArrowRight, BarChart2,
} from 'lucide-react';
import { hrEmployeesAPI, hrAdvancedAPI, hrAttendanceAPI, hrLeaveAPI } from '../../api/client';

const B = {
  navy: '#0A1F5C', blue: '#2563EB', success: '#10B981',
  warning: '#F59E0B', danger: '#EF4444', bg: '#F8FAFC',
};
const DEPT_COLORS = ['#2563EB','#10B981','#F59E0B','#EF4444','#8B5CF6','#14B8A6','#F97316','#EC4899'];
const fade = (d=0) => ({ initial:{opacity:0,y:18}, animate:{opacity:1,y:0}, transition:{duration:0.42,delay:d,ease:[0.16,1,0.3,1]} });

function ChartTip({ active, payload, label, suffix='' }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      {payload.map((p,i) => (
        <p key={i} style={{color:p.color||B.blue}} className="font-medium">
          {p.name}: {p.value}{suffix}
        </p>
      ))}
    </div>
  );
}

function KpiCard({ label, value, icon: Icon, color, bg, sub, delay=0, onClick }) {
  return (
    <motion.div {...fade(delay)}
      onClick={onClick}
      className={`rounded-2xl p-5 flex gap-4 items-start ${onClick?'cursor-pointer hover:opacity-90 active:scale-[0.98]':''} transition-all`}
      style={{background: bg || '#fff', boxShadow:'0 2px 12px rgba(10,31,92,0.07)', border:`1px solid ${color}22`}}>
      <div className="rounded-xl p-2.5 flex-shrink-0" style={{background:`${color}18`}}>
        <Icon size={20} style={{color}}/>
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value ?? '—'}</p>
        <p className="text-xs font-semibold text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </motion.div>
  );
}

function ChartCard({ title, sub, icon: Icon, iconColor, children, delay=0 }) {
  return (
    <motion.div {...fade(delay)}
      className="bg-white rounded-2xl p-6 border border-gray-100"
      style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
      <div className="flex items-center gap-3 mb-5">
        <div className="rounded-xl p-2" style={{background:`${iconColor}18`}}>
          <Icon size={16} style={{color:iconColor}}/>
        </div>
        <div>
          <p className="text-sm font-bold text-gray-800">{title}</p>
          {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
        </div>
      </div>
      {children}
    </motion.div>
  );
}

export default function HRAnalyticsHubPage() {
  const navigate = useNavigate();

  const { data: summaryData } = useQuery({
    queryKey: ['hr-analytics-summary'],
    queryFn: () => hrAdvancedAPI.analyticsSummary().then(r => r.data?.data ?? {}),
  });

  const { data: chartsData } = useQuery({
    queryKey: ['hr-analytics-charts'],
    queryFn: () => hrAdvancedAPI.analyticsCharts().then(r => r.data?.data ?? {}),
  });

  const { data: empList = [] } = useQuery({
    queryKey: ['hr-employees-all'],
    queryFn: () => hrEmployeesAPI.list({ employment_status:'active' }).then(r => r.data?.data ?? []),
  });

  const charts = chartsData || {};
  const yearsData    = charts.years_in_service   || [];
  const ageData      = charts.age_distribution   || [];
  const locationData = charts.location_headcount || [];
  const attritionData = charts.additions_attrition || [];

  // Dept headcount from employee list
  const deptData = useMemo(() => {
    const map = {};
    empList.forEach(e => {
      const d = e.department_name || 'Unassigned';
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, count }))
      .sort((a,b) => b.count - a.count).slice(0, 10);
  }, [empList]);

  // Employment type breakdown
  const typeData = useMemo(() => {
    const map = {};
    empList.forEach(e => {
      const t = e.employment_type || 'Unspecified';
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [empList]);

  const s = summaryData || {};

  return (
    <div className="min-h-screen" style={{background:B.bg}}>
      {/* Header */}
      <motion.div {...fade(0)} className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-3" style={{background:`${B.blue}15`}}>
              <BarChart2 size={22} style={{color:B.blue}}/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Analytics Hub</h1>
              <p className="text-xs text-gray-400 mt-0.5">Workforce insights &amp; trends</p>
            </div>
          </div>
          <button onClick={() => navigate('/hr-admin')}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors">
            Dashboard <ArrowRight size={14}/>
          </button>
        </div>
      </motion.div>

      <div className="px-8 py-7 space-y-8">

        {/* KPI Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard delay={0.05} label="Total Employees" value={s.total_employees ?? empList.length} icon={Users} color={B.blue} sub="Active headcount"/>
          <KpiCard delay={0.08} label="On Leave Today"  value={s.on_leave_today ?? 0} icon={Clock} color={B.warning} sub="Approved leaves"/>
          <KpiCard delay={0.11} label="Present Today"   value={s.present_today ?? 0} icon={UserCheck} color={B.success} sub="Clocked in"/>
          <KpiCard delay={0.14} label="Departments"     value={deptData.length} icon={Building2} color="#8B5CF6" sub="Active departments"/>
        </div>

        {/* Charts row 1 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Department Headcount" sub="Employees per department" icon={Building2} iconColor="#8B5CF6" delay={0.16}>
            {deptData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={deptData} margin={{top:4,right:8,left:-16,bottom:0}} barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="name" tick={{fontSize:10}} interval={0} angle={-25} textAnchor="end" height={50}/>
                  <YAxis tick={{fontSize:11}} allowDecimals={false}/>
                  <Tooltip content={<ChartTip suffix=" employees"/>}/>
                  <Bar dataKey="count" name="Employees" radius={[4,4,0,0]}>
                    {deptData.map((_,i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No data yet</div>}
          </ChartCard>

          <ChartCard title="Employment Type Mix" sub="Full-time, Contract, etc." icon={Briefcase} iconColor={B.blue} delay={0.18}>
            {typeData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="60%" height={220}>
                  <PieChart>
                    <Pie data={typeData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                      outerRadius={80} innerRadius={48} paddingAngle={3}>
                      {typeData.map((_,i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]}/>)}
                    </Pie>
                    <Tooltip content={<ChartTip suffix=" employees"/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2.5">
                  {typeData.map((d,i) => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{background:DEPT_COLORS[i%DEPT_COLORS.length]}}/>
                      <span className="text-xs text-gray-600">{d.name}</span>
                      <span className="text-xs font-bold text-gray-800 ml-auto">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No data yet</div>}
          </ChartCard>
        </div>

        {/* Charts row 2 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Years In Service Distribution" sub="Employee tenure breakdown" icon={Briefcase} iconColor={B.blue} delay={0.20}>
            {yearsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={yearsData} margin={{top:8,right:8,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="bucket" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}} allowDecimals={false}/>
                  <Tooltip content={<ChartTip suffix=" employees"/>}/>
                  <Bar dataKey="count" name="Employees" fill={B.blue} radius={[4,4,0,0]}/>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No tenure data yet</div>}
          </ChartCard>

          <ChartCard title="Additions &amp; Attrition" sub="Last 12 months" icon={TrendingUp} iconColor={B.success} delay={0.22}>
            {attritionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={attritionData} margin={{top:8,right:8,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="month" tick={{fontSize:10}}/>
                  <YAxis tick={{fontSize:11}} allowDecimals={false}/>
                  <Tooltip content={<ChartTip/>}/>
                  <Legend wrapperStyle={{fontSize:11}}/>
                  <Line type="monotone" dataKey="joined"   name="Joined"   stroke={B.blue}   strokeWidth={2} dot={{r:3}}/>
                  <Line type="monotone" dataKey="resigned" name="Resigned" stroke={B.danger}  strokeWidth={2} dot={{r:3}}/>
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No movement data yet</div>}
          </ChartCard>
        </div>

        {/* Charts row 3 */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Employee Count By Location" sub="Headcount per site / office" icon={Building2} iconColor="#14B8A6" delay={0.24}>
            {locationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={locationData} layout="vertical" margin={{top:4,right:30,left:10,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false}/>
                  <XAxis type="number" tick={{fontSize:11}} allowDecimals={false}/>
                  <YAxis type="category" dataKey="location" tick={{fontSize:11}} width={90}/>
                  <Tooltip content={<ChartTip suffix=" employees"/>}/>
                  <Bar dataKey="count" name="Employees" fill="#14B8A6" radius={[0,4,4,0]}>
                    {locationData.map((_,i) => <Cell key={i} fill={DEPT_COLORS[i % DEPT_COLORS.length]}/>)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No location data yet</div>}
          </ChartCard>

          <ChartCard title="Age Distribution" sub="Employee age groups" icon={Users} iconColor={B.warning} delay={0.26}>
            {ageData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={ageData} margin={{top:8,right:8,left:-20,bottom:0}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                  <XAxis dataKey="bucket" tick={{fontSize:11}}/>
                  <YAxis tick={{fontSize:11}} allowDecimals={false}/>
                  <Tooltip content={<ChartTip suffix=" employees"/>}/>
                  <Line type="monotone" dataKey="count" name="Employees" stroke={B.warning} strokeWidth={2} dot={{r:4}} fill="#FEF3C7"/>
                </LineChart>
              </ResponsiveContainer>
            ) : <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">No age data yet</div>}
          </ChartCard>
        </div>

      </div>
    </div>
  );
}
