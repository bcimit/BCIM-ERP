require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const { pool } = require('../src/config/database');

const API = process.env.TEST_API_BASE || 'http://localhost:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';

const pickRole = async (roles) => {
  const res = await pool.query(
    `SELECT id, name, email, role, department, company_id, is_active
       FROM users
      WHERE is_active IS DISTINCT FROM false
        AND role = ANY($1::text[])
      ORDER BY name
      LIMIT 1`,
    [roles]
  );
  return res.rows[0] || null;
};

const apiFetch = async (user, path, options = {}) => {
  const token = jwt.sign(
    { id: user.id, role: user.role, company_id: user.company_id },
    JWT_SECRET,
    { expiresIn: '30m' }
  );
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body = text;
  try { body = text ? JSON.parse(text) : null; } catch (_) {}
  return { status: res.status, body };
};

const countRows = (payload, keys) => {
  for (const key of keys) {
    if (Array.isArray(payload?.[key])) return payload[key].length;
    if (Array.isArray(payload?.data?.[key])) return payload.data[key].length;
    if (Array.isArray(payload?.data)) return payload.data.length;
  }
  return null;
};

(async () => {
  const users = {
    employee: await pickRole(['employee', 'site_engineer', 'qs_engineer', 'procurement', 'stores']),
    manager: await pickRole(['manager', 'project_manager', 'project_head', 'department_head']),
    hr: await pickRole(['hr_admin', 'hr_manager', 'hr']),
    superAdmin: await pickRole(['super_admin']),
  };

  console.log('Selected users');
  for (const [label, user] of Object.entries(users)) {
    console.log(`${label}: ${user ? `${user.name} <${user.email}> [${user.role}]` : 'NOT FOUND'}`);
  }

  const checks = [];
  for (const [label, user] of Object.entries(users)) {
    if (!user) continue;
    const summary = await apiFetch(user, '/ess/summary');
    const leave = await apiFetch(user, '/ess/leave/requests');
    const corrections = await apiFetch(user, '/ess/attendance/corrections');
    const managerLeave = await apiFetch(user, '/ess/manager/leave-requests');
    const managerCorrections = await apiFetch(user, '/ess/manager/attendance-corrections');

    checks.push({
      label,
      role: user.role,
      summaryStatus: summary.status,
      profileEmail: summary.body?.data?.profile?.email || null,
      profileRole: summary.body?.data?.profile?.role || null,
      ownLeaveStatus: leave.status,
      ownLeaveCount: countRows(leave.body, ['requests', 'leaveRequests']),
      ownCorrectionStatus: corrections.status,
      ownCorrectionCount: countRows(corrections.body, ['corrections']),
      managerLeaveStatus: managerLeave.status,
      managerLeaveError: managerLeave.body?.error || null,
      managerLeaveCount: countRows(managerLeave.body, ['requests', 'leaveRequests']),
      managerCorrectionStatus: managerCorrections.status,
      managerCorrectionError: managerCorrections.body?.error || null,
      managerCorrectionCount: countRows(managerCorrections.body, ['corrections']),
    });
  }

  console.log('ESS access checks');
  console.table(checks);

  const employee = users.employee;
  const hr = users.hr || users.superAdmin;
  if (employee && hr) {
    const employeeOwnRequests = await apiFetch(employee, '/hr-admin/advanced/service-requests');
    const employeeTryingOtherUser = await apiFetch(
      employee,
      `/hr-admin/advanced/service-requests?user_id=${encodeURIComponent(hr.id)}`
    );
    const hrTryingEmployee = await apiFetch(
      hr,
      `/hr-admin/advanced/service-requests?user_id=${encodeURIComponent(employee.id)}`
    );
    console.log('Cross-user service request scope');
    console.table([
      {
        actor: 'employee own',
        status: employeeOwnRequests.status,
        count: countRows(employeeOwnRequests.body, ['requests']),
      },
      {
        actor: 'employee asks HR user_id',
        status: employeeTryingOtherUser.status,
        count: countRows(employeeTryingOtherUser.body, ['requests']),
      },
      {
        actor: 'HR/super admin asks employee user_id',
        status: hrTryingEmployee.status,
        count: countRows(hrTryingEmployee.body, ['requests']),
      },
    ]);
  }
})()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
