// HR Organization Chart — tree view based on reporting_manager_id
import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users, ChevronDown, ChevronRight, Search,
  GitBranch, Building2, MapPin, Briefcase,
} from 'lucide-react';
import { hrAdvancedAPI } from '../../api/client';

const AVATAR_COLORS = [
  ['#6366F1','#4F46E5'],['#0EA5E9','#0284C7'],['#10B981','#059669'],
  ['#F59E0B','#D97706'],['#EF4444','#DC2626'],['#8B5CF6','#7C3AED'],
  ['#EC4899','#DB2777'],['#14B8A6','#0D9488'],
];
const avatarGrad = (n) => AVATAR_COLORS[(n?.charCodeAt(0)||0) % AVATAR_COLORS.length];
const initials   = (n) => (n||'U').split(' ').map(x=>x[0]).join('').slice(0,2).toUpperCase();

function Avatar({ name, photo, size=40 }) {
  const [g1, g2] = avatarGrad(name);
  if (photo) return <img src={photo} alt={name} className="rounded-full object-cover flex-shrink-0" style={{width:size,height:size}}/>;
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{width:size,height:size,fontSize:size*0.35,background:`linear-gradient(135deg,${g1},${g2})`}}>
      {initials(name)}
    </div>
  );
}

function OrgNode({ node, depth=0, allNodes, collapsed, toggle, navigate, searchQ }) {
  const children = allNodes.filter(n => n.reporting_manager_id === node.id);
  const isCollapsed = collapsed[node.id];
  const isRoot = depth === 0;

  const highlight = searchQ && (
    node.name?.toLowerCase().includes(searchQ) ||
    node.designation?.toLowerCase().includes(searchQ) ||
    node.department?.toLowerCase().includes(searchQ)
  );

  return (
    <div className={`flex flex-col items-center ${depth > 0 ? 'mt-0' : ''}`}>
      {/* Node Card */}
      <div className="relative flex flex-col items-center">
        <motion.div
          initial={{opacity:0,scale:0.9}} animate={{opacity:1,scale:1}}
          transition={{duration:0.3,delay:depth*0.05}}
          className={`relative rounded-2xl border transition-all cursor-pointer select-none
            ${isRoot ? 'w-52' : depth===1 ? 'w-44' : 'w-40'}
            ${highlight ? 'border-yellow-400 shadow-[0_0_0_3px_rgba(251,191,36,0.3)]' : 'border-gray-100 hover:border-blue-300'}
          `}
          style={{
            background: isRoot ? 'linear-gradient(135deg,#0A1F5C,#1e40af)' : '#fff',
            boxShadow: isRoot ? '0 8px 24px rgba(10,31,92,0.25)' : '0 2px 12px rgba(10,31,92,0.08)',
          }}
          onClick={() => navigate(`/hr-admin/employees/${node.id}`)}
        >
          <div className="p-4 flex flex-col items-center text-center gap-2">
            <Avatar name={node.name} photo={node.profile_photo_url} size={isRoot?48:38}/>
            <div>
              <p className={`font-bold leading-tight text-${isRoot?'white':'gray-900'} ${isRoot?'text-[13px]':'text-[12px]'}`}>
                {node.name}
              </p>
              {node.designation && (
                <p className={`text-[10px] mt-0.5 font-semibold ${isRoot?'text-blue-200':'text-blue-600'}`}>
                  {node.designation}
                </p>
              )}
              {node.department && (
                <p className={`text-[10px] mt-0.5 ${isRoot?'text-blue-300':'text-gray-400'}`}>
                  {node.department}
                </p>
              )}
              {node.work_location && (
                <p className={`text-[9px] mt-0.5 flex items-center justify-center gap-0.5 ${isRoot?'text-blue-300':'text-gray-400'}`}>
                  <MapPin size={8}/>{node.work_location}
                </p>
              )}
            </div>
            {children.length > 0 && (
              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isRoot?'bg-white/20 text-white':'bg-blue-50 text-blue-600'}`}>
                {children.length} report{children.length!==1?'s':''}
              </span>
            )}
          </div>
        </motion.div>

        {/* Collapse toggle */}
        {children.length > 0 && (
          <button
            onClick={e => { e.stopPropagation(); toggle(node.id); }}
            className="mt-1 w-6 h-6 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center text-blue-600 shadow-sm hover:bg-blue-50 transition-colors z-10"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? <ChevronRight size={11}/> : <ChevronDown size={11}/>}
          </button>
        )}
      </div>

      {/* Children */}
      {children.length > 0 && !isCollapsed && (
        <div className="flex flex-col items-center">
          {/* Vertical connector */}
          <div className="w-px h-4 bg-gray-300"/>
          {children.length === 1 ? (
            <div className="flex flex-col items-center">
              <OrgNode node={children[0]} depth={depth+1} allNodes={allNodes}
                collapsed={collapsed} toggle={toggle} navigate={navigate} searchQ={searchQ}/>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              {/* Horizontal connector bar */}
              <div className="flex items-start">
                {children.map((child, idx) => {
                  const isFirst = idx === 0;
                  const isLast  = idx === children.length - 1;
                  return (
                    <div key={child.id} className="flex flex-col items-center px-2">
                      {/* Top connector */}
                      <div className={`h-4 border-t border-gray-300 ${
                        isFirst  ? 'border-l rounded-tl-md ml-1/2 w-1/2 self-end' :
                        isLast   ? 'border-r rounded-tr-md mr-1/2 w-1/2 self-start' :
                        'w-full'
                      }`}/>
                      <div className="w-px h-3 bg-gray-300"/>
                      <OrgNode node={child} depth={depth+1} allNodes={allNodes}
                        collapsed={collapsed} toggle={toggle} navigate={navigate} searchQ={searchQ}/>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Simpler flat children layout
function OrgTree({ node, allNodes, collapsed, toggle, navigate, searchQ, depth=0 }) {
  const children = allNodes.filter(n => n.reporting_manager_id === node.id);
  const isCollapsed = collapsed[node.id];
  const isRoot = depth === 0;

  const highlight = searchQ && (
    node.name?.toLowerCase().includes(searchQ) ||
    node.designation?.toLowerCase().includes(searchQ) ||
    node.department?.toLowerCase().includes(searchQ)
  );

  const cardW = isRoot ? 'w-52' : depth===1 ? 'w-44' : 'w-40';

  return (
    <div style={{display:'inline-flex', flexDirection:'column', alignItems:'center', margin:'0 8px'}}>
      {/* Card */}
      <motion.div
        initial={{opacity:0,scale:0.92}} animate={{opacity:1,scale:1}}
        transition={{duration:0.3,delay:Math.min(depth*0.06,0.4)}}
        onClick={() => navigate(`/hr-admin/employees/${node.id}`)}
        className={`${cardW} rounded-2xl border cursor-pointer transition-all hover:shadow-lg
          ${highlight ? 'ring-2 ring-yellow-400 ring-offset-1' : ''}
        `}
        style={{
          background: isRoot ? 'linear-gradient(135deg,#0A1F5C,#1d4ed8)' : '#fff',
          boxShadow: isRoot ? '0 8px 28px rgba(10,31,92,0.22)' : '0 2px 10px rgba(10,31,92,0.07)',
          border: isRoot ? 'none' : '1px solid #e5e7eb',
        }}
      >
        <div className="p-4 flex flex-col items-center text-center gap-2">
          <Avatar name={node.name} photo={node.profile_photo_url} size={isRoot?50:40}/>
          <div>
            <p className={`font-bold leading-tight ${isRoot?'text-white text-[13px]':'text-gray-900 text-[12px]'}`}>
              {node.name}
            </p>
            {node.designation && (
              <p className={`text-[10px] mt-0.5 font-semibold ${isRoot?'text-blue-200':'text-blue-600'}`}>
                {node.designation}
              </p>
            )}
            {node.department && (
              <p className={`text-[10px] mt-0.5 ${isRoot?'text-blue-300':'text-gray-400'}`}>
                {node.department}
              </p>
            )}
            {node.work_location && (
              <p className={`text-[9px] mt-1 flex items-center justify-center gap-0.5 ${isRoot?'text-blue-300':'text-gray-400'}`}>
                <MapPin size={8}/>{node.work_location}
              </p>
            )}
          </div>
          {children.length > 0 && (
            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isRoot?'bg-white/20 text-white':'bg-blue-50 text-blue-600'}`}>
              {children.length} direct report{children.length!==1?'s':''}
            </span>
          )}
        </div>
      </motion.div>

      {/* Collapse toggle */}
      {children.length > 0 && (
        <button
          onClick={e => { e.stopPropagation(); toggle(node.id); }}
          className="mt-1.5 w-6 h-6 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center text-blue-600 shadow hover:bg-blue-50 transition-colors"
        >
          {isCollapsed ? <ChevronRight size={11}/> : <ChevronDown size={11}/>}
        </button>
      )}

      {/* Children branch */}
      {children.length > 0 && !isCollapsed && (
        <div style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
          {/* Vertical line from toggle to horizontal bar */}
          <div style={{width:1,height:16,background:'#d1d5db'}}/>
          {children.length > 1 && (
            <div style={{
              display:'flex',
              borderTop:'1px solid #d1d5db',
              width: `calc(100% - 32px)`,
              minWidth: children.length * 120,
              height:1,
            }}/>
          )}
          {/* Children row */}
          <div style={{display:'flex',alignItems:'flex-start',gap:0}}>
            {children.map((child,i) => (
              <div key={child.id} style={{display:'flex',flexDirection:'column',alignItems:'center'}}>
                {/* Vertical stub down */}
                <div style={{width:1,height:children.length>1?16:0,background:'#d1d5db'}}/>
                <OrgTree
                  node={child} allNodes={allNodes} collapsed={collapsed}
                  toggle={toggle} navigate={navigate} searchQ={searchQ} depth={depth+1}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HROrgChartPage() {
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState({});
  const [search, setSearch] = useState('');

  const { data: employees = [], isLoading } = useQuery({
    queryKey: ['hr-org-chart'],
    queryFn: () => hrAdvancedAPI.orgChart().then(r => r.data?.data ?? []),
  });

  const toggle = (id) => setCollapsed(c => ({...c, [id]: !c[id]}));
  const searchQ = search.trim().toLowerCase();

  // Build tree roots = employees whose manager is not in the list (or has no manager)
  const empIds = useMemo(() => new Set(employees.map(e => e.id)), [employees]);
  const roots = useMemo(() =>
    employees.filter(e => !e.reporting_manager_id || !empIds.has(e.reporting_manager_id)),
    [employees, empIds]
  );

  // Unlinked employees (if no employees returned but we know there are staff)
  const isolated = useMemo(() => {
    const inTree = new Set();
    function mark(id) {
      inTree.add(id);
      employees.filter(e => e.reporting_manager_id === id).forEach(c => mark(c.id));
    }
    roots.forEach(r => mark(r.id));
    return employees.filter(e => !inTree.has(e.id));
  }, [employees, roots]);

  const expandAll = () => setCollapsed({});
  const collapseAll = () => {
    const c = {};
    employees.forEach(e => { c[e.id] = true; });
    setCollapsed(c);
  };

  return (
    <div className="min-h-screen" style={{background:'#F8FAFC'}}>
      {/* Header */}
      <motion.div initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} transition={{duration:0.4}}
        className="bg-white border-b border-gray-100 px-8 py-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl p-3 bg-blue-50">
              <GitBranch size={22} className="text-blue-600"/>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Organization Chart</h1>
              <p className="text-xs text-gray-400 mt-0.5">{employees.length} active employees</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)}
                placeholder="Search employee…"
                className="pl-8 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white w-52 focus:outline-none focus:ring-2 focus:ring-blue-500/20"/>
            </div>
            <button onClick={expandAll}
              className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              Expand All
            </button>
            <button onClick={collapseAll}
              className="px-3 py-2 text-xs font-semibold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-50 transition-colors">
              Collapse All
            </button>
          </div>
        </div>
      </motion.div>

      {/* Chart area */}
      <div className="px-8 py-8 overflow-x-auto">
        {isLoading && (
          <div className="flex items-center justify-center h-60 text-sm text-gray-400">Loading org chart…</div>
        )}

        {!isLoading && employees.length === 0 && (
          <div className="flex flex-col items-center justify-center h-60 text-sm text-gray-400 gap-2">
            <GitBranch size={36} className="text-gray-200"/>
            <p>No employees found. Add reporting managers in employee profiles to build the org chart.</p>
          </div>
        )}

        {!isLoading && employees.length > 0 && roots.length === 0 && (
          <div className="mb-6 px-5 py-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            <strong>No root node detected.</strong> Set reporting managers in employee profiles to build the hierarchy.
          </div>
        )}

        {!isLoading && roots.length > 0 && (
          <div style={{display:'inline-flex',flexDirection:'column',alignItems:'center',minWidth:'100%',paddingBottom:40}}>
            {roots.map(root => (
              <div key={root.id} className="mb-10">
                <OrgTree
                  node={root} allNodes={employees}
                  collapsed={collapsed} toggle={toggle}
                  navigate={navigate} searchQ={searchQ}
                  depth={0}
                />
              </div>
            ))}

            {/* Isolated employees (no manager, not root — shouldn't happen but safety net) */}
            {isolated.length > 0 && (
              <div className="mt-8 w-full">
                <div className="flex items-center gap-2 mb-4 px-2">
                  <div className="flex-1 h-px bg-gray-200"/>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider px-2">
                    Unlinked ({isolated.length})
                  </span>
                  <div className="flex-1 h-px bg-gray-200"/>
                </div>
                <div className="flex flex-wrap gap-4 justify-center">
                  {isolated.map(emp => (
                    <div key={emp.id} className="flex flex-col items-center">
                      <motion.div
                        whileHover={{y:-2}}
                        onClick={() => navigate(`/hr-admin/employees/${emp.id}`)}
                        className="w-40 rounded-2xl border border-gray-100 bg-white cursor-pointer p-4 flex flex-col items-center text-center gap-2"
                        style={{boxShadow:'0 2px 8px rgba(10,31,92,0.06)'}}>
                        <Avatar name={emp.name} photo={emp.profile_photo_url} size={38}/>
                        <div>
                          <p className="font-bold text-gray-900 text-[12px]">{emp.name}</p>
                          {emp.designation && <p className="text-[10px] text-blue-600 mt-0.5">{emp.designation}</p>}
                          {emp.department && <p className="text-[10px] text-gray-400">{emp.department}</p>}
                        </div>
                      </motion.div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      {!isLoading && employees.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur border border-gray-200 rounded-2xl px-5 py-3 text-xs text-gray-500 shadow-lg">
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-lg" style={{background:'linear-gradient(135deg,#0A1F5C,#1d4ed8)'}}/>
            <span>Top-level</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-5 rounded-lg border border-gray-200 bg-white"/>
            <span>Reporting employee</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full bg-white border-2 border-blue-300 flex items-center justify-center">
              <ChevronDown size={8} className="text-blue-600"/>
            </div>
            <span>Expand / Collapse</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-3 rounded bg-yellow-200 border border-yellow-400"/>
            <span>Search match</span>
          </div>
        </div>
      )}
    </div>
  );
}
