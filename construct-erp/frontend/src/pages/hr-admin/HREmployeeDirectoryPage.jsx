// HR Employee Directory — searchable card-based directory
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Search, Users, Building2, MapPin, Mail, Phone,
  ChevronDown, ChevronRight, LayoutGrid, List,
} from 'lucide-react';
import { hrEmployeesAPI } from '../../api/client';

const AVATAR_COLORS = [
  ['#6366F1','#4F46E5'],['#0EA5E9','#0284C7'],['#10B981','#059669'],
  ['#F59E0B','#D97706'],['#EF4444','#DC2626'],['#8B5CF6','#7C3AED'],
  ['#EC4899','#DB2777'],['#14B8A6','#0D9488'],
];
const avatarGrad = (n) => AVATAR_COLORS[(n?.charCodeAt(0)||0) % AVATAR_COLORS.length];
const initials   = (n) => (n||'U').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();
const fade = (d=0) => ({ initial:{opacity:0,y:14}, animate:{opacity:1,y:0}, transition:{duration:0.38,delay:d,ease:[0.16,1,0.3,1]} });

function Avatar({ name, photo, size=44 }) {
  const [g1, g2] = avatarGrad(name);
  if (photo) return <img src={photo} alt={name} className="rounded-full object-cover flex-shrink-0" style={{width:size,height:size}}/>;
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{width:size,height:size,fontSize:size*0.34,background:`linear-gradient(135deg,${g1},${g2})`}}>
      {initials(name)}
    </div>
  );
}

function EmployeeCard({ emp, onClick }) {
  return (
    <motion.div
      whileHover={{y:-2,boxShadow:'0 8px 24px rgba(10,31,92,0.13)'}}
      className="bg-white rounded-2xl p-5 border border-gray-100 cursor-pointer flex flex-col gap-3 transition-all"
      style={{boxShadow:'0 2px 10px rgba(10,31,92,0.06)'}}
      onClick={onClick}>
      <div className="flex items-start gap-3">
        <Avatar name={emp.name} photo={emp.profile_photo_url} size={48}/>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900 text-sm leading-tight truncate">{emp.name}</p>
          <p className="text-[11px] text-blue-600 font-semibold mt-0.5 truncate">{emp.designation_name || '—'}</p>
          <span className="inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
            {emp.department_name || 'No Dept'}
          </span>
        </div>
      </div>
      <div className="border-t border-gray-50 pt-3 space-y-1.5">
        {emp.email && (
          <div className="flex items-center gap-2 text-[11px] text-gray-500 truncate">
            <Mail size={11} className="text-gray-400 flex-shrink-0"/>
            <span className="truncate">{emp.email}</span>
          </div>
        )}
        {emp.mobile_number && (
          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <Phone size={11} className="text-gray-400 flex-shrink-0"/>
            {emp.mobile_number}
          </div>
        )}
        {emp.work_location && (
          <div className="flex items-center gap-2 text-[11px] text-gray-500 truncate">
            <MapPin size={11} className="text-gray-400 flex-shrink-0"/>
            <span className="truncate">{emp.work_location}</span>
          </div>
        )}
      </div>
      {emp.employment_type && (
        <div className="flex">
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 capitalize">
            {emp.employment_type.replace(/_/g,' ')}
          </span>
        </div>
      )}
    </motion.div>
  );
}

function EmployeeRow({ emp, onClick }) {
  const [g1, g2] = avatarGrad(emp.name);
  return (
    <tr className="border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors" onClick={onClick}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={emp.name} photo={emp.profile_photo_url} size={34}/>
          <div>
            <p className="text-sm font-semibold text-gray-900">{emp.name}</p>
            <p className="text-[11px] text-gray-400">{emp.employee_code || ''}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-[12px] text-blue-600 font-medium">{emp.designation_name || '—'}</td>
      <td className="px-4 py-3 text-[12px] text-gray-600">{emp.department_name || '—'}</td>
      <td className="px-4 py-3 text-[12px] text-gray-500">{emp.email || '—'}</td>
      <td className="px-4 py-3 text-[12px] text-gray-500">{emp.mobile_number || '—'}</td>
      <td className="px-4 py-3 text-[12px] text-gray-500">{emp.work_location || '—'}</td>
      <td className="px-4 py-3">
        {emp.employment_type && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 capitalize">
            {emp.employment_type.replace(/_/g,' ')}
          </span>
        )}
      </td>
    </tr>
  );
}

export default function HREmployeeDirectoryPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [groupByDept, setGroupByDept] = useState(false);
  const [collapsed, setCollapsed] = useState({});

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['hr-directory-employees'],
    queryFn: () => hrEmployeesAPI.list({ employment_status: 'active' }).then(r => r.data?.data ?? []),
  });

  const departments = useMemo(() => {
    const s = new Set(employees.map(e => e.department_name || 'Unassigned'));
    return [...s].sort();
  }, [employees]);

  const filtered = useMemo(() => {
    let list = employees;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.name?.toLowerCase().includes(q) ||
        e.designation_name?.toLowerCase().includes(q) ||
        e.department_name?.toLowerCase().includes(q) ||
        e.email?.toLowerCase().includes(q) ||
        e.employee_code?.toLowerCase().includes(q)
      );
    }
    if (deptFilter) list = list.filter(e => (e.department_name || 'Unassigned') === deptFilter);
    return list;
  }, [employees, search, deptFilter]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const d = e.department_name || 'Unassigned';
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return Object.entries(map).sort(([a],[b]) => a.localeCompare(b));
  }, [filtered]);

  const toggleDept = (d) => setCollapsed(c => ({...c, [d]: !c[d]}));

  return (
    <div className="min-h-screen" style={{background:'#F8FAFC'}}>
      {/* Header */}
      <motion.div {...fade(0)} className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-3 bg-blue-50">
              <Users size={22} className="text-blue-600"/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Employee Directory</h1>
              <p className="text-xs text-gray-400 mt-0.5">{filtered.length} active employees</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden">
              <button onClick={()=>setViewMode('grid')}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode==='grid'?'bg-blue-600 text-white':'text-gray-500 hover:bg-gray-50'}`}>
                <LayoutGrid size={14}/>
              </button>
              <button onClick={()=>setViewMode('list')}
                className={`px-3 py-2 text-xs font-semibold transition-colors ${viewMode==='list'?'bg-blue-600 text-white':'text-gray-500 hover:bg-gray-50'}`}>
                <List size={14}/>
              </button>
            </div>
            {/* Group by dept */}
            <button onClick={()=>setGroupByDept(g=>!g)}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border transition-colors ${groupByDept?'bg-indigo-600 text-white border-indigo-600':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              <Building2 size={14} className="inline mr-1"/>Group by Dept
            </button>
          </div>
        </div>

        {/* Search + Filter */}
        <div className="flex gap-3 mt-4 flex-wrap">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
            <input value={search} onChange={e=>setSearch(e.target.value)}
              placeholder="Search by name, designation, email…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"/>
          </div>
          <select value={deptFilter} onChange={e=>setDeptFilter(e.target.value)}
            className="px-4 py-2.5 text-sm border border-gray-200 rounded-xl bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </motion.div>

      <div className="px-8 py-7">
        {isLoading && (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400">Loading directory…</div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-sm text-gray-400 gap-2">
            <Users size={32} className="text-gray-200"/>
            No employees found
          </div>
        )}

        {!isLoading && filtered.length > 0 && viewMode === 'list' && !groupByDept && (
          <motion.div {...fade(0.1)} className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
            style={{boxShadow:'0 2px 12px rgba(10,31,92,0.06)'}}>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  {['Employee','Designation','Department','Email','Phone','Location','Type'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(emp => (
                  <EmployeeRow key={emp.id} emp={emp} onClick={()=>navigate(`/hr-admin/employees/${emp.id}`)}/>
                ))}
              </tbody>
            </table>
          </motion.div>
        )}

        {!isLoading && filtered.length > 0 && viewMode === 'grid' && !groupByDept && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filtered.map((emp, i) => (
              <EmployeeCard key={emp.id} emp={emp} delay={i*0.02}
                onClick={()=>navigate(`/hr-admin/employees/${emp.id}`)}/>
            ))}
          </div>
        )}

        {!isLoading && groupByDept && grouped.map(([dept, members], gi) => (
          <motion.div key={dept} {...fade(gi*0.05)} className="mb-6">
            <button
              className="flex items-center gap-2 w-full mb-3 group"
              onClick={()=>toggleDept(dept)}>
              <div className="flex items-center gap-2.5 flex-1">
                <Building2 size={16} className="text-blue-500"/>
                <span className="font-bold text-gray-800 text-sm">{dept}</span>
                <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">{members.length}</span>
              </div>
              {collapsed[dept] ? <ChevronRight size={16} className="text-gray-400"/> : <ChevronDown size={16} className="text-gray-400"/>}
            </button>

            {!collapsed[dept] && viewMode === 'grid' && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                {members.map((emp, i) => (
                  <EmployeeCard key={emp.id} emp={emp} delay={i*0.02}
                    onClick={()=>navigate(`/hr-admin/employees/${emp.id}`)}/>
                ))}
              </div>
            )}

            {!collapsed[dept] && viewMode === 'list' && (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden"
                style={{boxShadow:'0 2px 10px rgba(10,31,92,0.05)'}}>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Employee','Designation','Email','Phone','Location','Type'].map(h => (
                        <th key={h} className="px-4 py-2.5 text-left text-[11px] font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {members.map(emp => (
                      <EmployeeRow key={emp.id} emp={emp} onClick={()=>navigate(`/hr-admin/employees/${emp.id}`)}/>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
