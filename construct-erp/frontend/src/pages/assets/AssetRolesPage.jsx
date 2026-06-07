// Asset User Roles & Permissions — shows role matrix for the Asset module
import React from 'react';
import { CheckCircle, XCircle, Shield, Users, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLES = [
  { key: 'super_admin',     label: 'Super Admin',      color: 'bg-red-100 text-red-700' },
  { key: 'admin',           label: 'Admin',            color: 'bg-orange-100 text-orange-700' },
  { key: 'managing_director',label:'Managing Director', color: 'bg-purple-100 text-purple-700' },
  { key: 'project_manager', label: 'Project Manager',  color: 'bg-blue-100 text-blue-700' },
  { key: 'site_engineer',   label: 'Site Engineer',    color: 'bg-cyan-100 text-cyan-700' },
  { key: 'storekeeper',     label: 'Storekeeper',      color: 'bg-green-100 text-green-700' },
  { key: 'accounts',        label: 'Accounts',         color: 'bg-yellow-100 text-yellow-700' },
  { key: 'viewer',          label: 'Viewer',           color: 'bg-gray-100 text-gray-700' },
];

const PERMISSIONS = [
  {
    group: 'Asset Master',
    items: [
      { action: 'View Asset Register',          roles: ['super_admin','admin','managing_director','project_manager','site_engineer','storekeeper','accounts','viewer'] },
      { action: 'Add / Register New Asset',     roles: ['super_admin','admin'] },
      { action: 'Edit Asset Details',           roles: ['super_admin','admin'] },
      { action: 'Delete / Dispose Asset',       roles: ['super_admin','admin'] },
      { action: 'Import Assets (CSV)',          roles: ['super_admin','admin'] },
      { action: 'Manage Asset Categories',      roles: ['super_admin','admin'] },
    ]
  },
  {
    group: 'Allocation & Tracking',
    items: [
      { action: 'Issue / Allocate Asset',       roles: ['super_admin','admin','storekeeper'] },
      { action: 'Return Asset',                 roles: ['super_admin','admin','storekeeper'] },
      { action: 'View Allocation History',      roles: ['super_admin','admin','managing_director','project_manager','site_engineer','storekeeper'] },
      { action: 'Create Transfer Request',      roles: ['super_admin','admin','project_manager','site_engineer'] },
      { action: 'Approve / Reject Transfer',    roles: ['super_admin','admin','managing_director','project_manager'] },
    ]
  },
  {
    group: 'Maintenance',
    items: [
      { action: 'View Maintenance Schedule',    roles: ['super_admin','admin','managing_director','project_manager','site_engineer','storekeeper'] },
      { action: 'Create Work Order',            roles: ['super_admin','admin','project_manager','site_engineer','storekeeper'] },
      { action: 'Complete / Close Work Order',  roles: ['super_admin','admin','project_manager','site_engineer'] },
      { action: 'Log Fuel / Usage',             roles: ['super_admin','admin','site_engineer','storekeeper'] },
    ]
  },
  {
    group: 'Documents & Disposal',
    items: [
      { action: 'Add Insurance / Permit Docs',  roles: ['super_admin','admin'] },
      { action: 'View Documents',               roles: ['super_admin','admin','managing_director','project_manager','storekeeper'] },
      { action: 'Initiate Disposal',            roles: ['super_admin','admin','project_manager'] },
      { action: 'Approve Disposal',             roles: ['super_admin','admin','managing_director'] },
    ]
  },
  {
    group: 'Reports & Alerts',
    items: [
      { action: 'View Dashboard & Reports',     roles: ['super_admin','admin','managing_director','project_manager','accounts','viewer'] },
      { action: 'View Depreciation Schedule',   roles: ['super_admin','admin','managing_director','accounts'] },
      { action: 'View Alerts & Notifications',  roles: ['super_admin','admin','managing_director','project_manager','storekeeper'] },
      { action: 'Export Reports',               roles: ['super_admin','admin','managing_director','accounts'] },
    ]
  },
];

function Check({ has }) {
  return has
    ? <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
    : <XCircle    className="w-4 h-4 text-gray-200 mx-auto" />;
}

export default function AssetRolesPage() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-500" /> Asset Module — User Roles & Permissions
          </h1>
          <p className="text-sm text-gray-500">Role-based access control for all Asset Management features</p>
        </div>
        <button onClick={() => navigate('/users')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
          <Users className="w-4 h-4" /> Manage Users & Roles
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <strong>How it works:</strong> Roles are assigned per user in the Team Members page.
          A <strong>Super Admin</strong> bypasses all checks. To change a user's role,
          click <em>"Manage Users & Roles"</em> above.
        </div>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap gap-2 mb-6">
        {ROLES.map(r => (
          <span key={r.key} className={`px-3 py-1 rounded-full text-xs font-medium ${r.color}`}>
            {r.label}
          </span>
        ))}
      </div>

      {/* Permission Matrix */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b sticky top-0 z-10">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-medium text-gray-600 min-w-[220px]">
                  Permission
                </th>
                {ROLES.map(r => (
                  <th key={r.key} className="py-3 px-2 text-center min-w-[80px]">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${r.color} whitespace-nowrap`}>
                      {r.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((group, gi) => (
                <React.Fragment key={gi}>
                  <tr className="bg-gray-100 border-y">
                    <td colSpan={ROLES.length + 1} className="py-2 px-4 text-xs font-bold text-gray-600 uppercase tracking-wider">
                      {group.group}
                    </td>
                  </tr>
                  {group.items.map((item, ii) => (
                    <tr key={ii} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 px-4 text-xs text-gray-700">{item.action}</td>
                      {ROLES.map(r => (
                        <td key={r.key} className="py-3 px-2 text-center">
                          <Check has={item.roles.includes(r.key)} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role descriptions */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { role:'Super Admin / Admin', desc:'Full access to all asset features including create, edit, delete, approve disposals and approve transfers. Only they can manage asset categories.' },
          { role:'Managing Director', desc:'Can view all reports, approve disposals and transfers. Read-only access to asset details and maintenance history.' },
          { role:'Project Manager', desc:'Can issue/return assets, create maintenance work orders, initiate transfers and disposal requests. Full operational access.' },
          { role:'Site Engineer', desc:'Can create maintenance work orders, log fuel/usage data, view asset details and initiate transfer requests.' },
          { role:'Storekeeper', desc:'Can issue and return assets, create work orders, log fuel and usage data. Cannot delete assets or approve financial actions.' },
          { role:'Accounts / Viewer', desc:'Read-only access to reports, dashboard, depreciation schedules and asset register for auditing and accounting purposes.' },
        ].map((item, i) => (
          <div key={i} className="p-4 bg-gray-50 rounded-xl border">
            <div className="font-semibold text-sm text-gray-800 mb-1">{item.role}</div>
            <p className="text-xs text-gray-600">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
