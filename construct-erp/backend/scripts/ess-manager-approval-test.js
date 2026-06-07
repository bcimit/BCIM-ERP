require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const jwt = require('jsonwebtoken');
const { pool } = require('../src/config/database');

const API = process.env.TEST_API_BASE || 'http://localhost:5000/api/v1';
const JWT_SECRET = process.env.JWT_SECRET || 'your_super_secret_jwt_key_change_in_production';

const tokenFor = (user) =>
  jwt.sign({ id: user.id, role: user.role, company_id: user.company_id }, JWT_SECRET, { expiresIn: '30m' });

const apiFetch = async (user, path, options = {}) => {
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${tokenFor(user)}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(async () => ({ raw: await res.text() }));
  return { status: res.status, body };
};

const pickUser = async (roles) => {
  const { rows } = await pool.query(
    `SELECT id, name, email, role, company_id
       FROM users
      WHERE is_active IS DISTINCT FROM false
        AND role = ANY($1::text[])
      ORDER BY name
      LIMIT 1`,
    [roles]
  );
  return rows[0] || null;
};

const cleanupLeave = async ({ leaveId, userId, leaveTypeId, year, days }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(`DELETE FROM hr_attendance WHERE leave_request_id = $1`, [leaveId]);
    await client.query(`DELETE FROM hr_leave_requests WHERE id = $1`, [leaveId]);
    await client.query(
      `UPDATE hr_leave_balances
          SET taken = GREATEST(taken - $1, 0),
              closing_balance = opening_balance + accrued + carry_forwarded - GREATEST(taken - $1, 0)
        WHERE user_id = $2 AND leave_type_id = $3 AND year = $4`,
      [days, userId, leaveTypeId, year]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

const cleanupCorrection = async ({ correctionId, userId, date }) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `DELETE FROM hr_attendance
        WHERE user_id = $1
          AND attendance_date = $2::date
          AND source = 'ess_correction'
          AND remarks LIKE 'ESS approval audit%'`,
      [userId, date]
    );
    await client.query(`DELETE FROM hr_attendance_correction_requests WHERE id = $1`, [correctionId]);
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

(async () => {
  const employee = await pickUser(['employee', 'site_engineer', 'qs_engineer', 'procurement', 'stores']);
  const manager = await pickUser(['project_manager', 'project_head', 'department_head', 'manager']);

  if (!employee || !manager) {
    throw new Error(`Missing test users. employee=${Boolean(employee)} manager=${Boolean(manager)}`);
  }

  console.log(`Employee: ${employee.name} <${employee.email}> [${employee.role}]`);
  console.log(`Manager: ${manager.name} <${manager.email}> [${manager.role}]`);

  const balances = await apiFetch(employee, '/ess/leave/balances');
  if (balances.status !== 200 || !balances.body.data?.length) {
    throw new Error(`Leave balance setup failed: ${balances.status} ${JSON.stringify(balances.body)}`);
  }
  const leaveType = balances.body.data.find((row) => Number(row.closing_balance || 0) >= 0.5) || balances.body.data[0];
  const fromDate = '2026-12-24';
  const leaveCreate = await apiFetch(employee, '/ess/leave/requests', {
    method: 'POST',
    body: JSON.stringify({
      leave_type_id: leaveType.leave_type_id,
      from_date: fromDate,
      to_date: fromDate,
      half_day: true,
      half_day_session: 'FN',
      reason: 'ESS approval audit - auto cleanup',
    }),
  });
  if (leaveCreate.status !== 201) {
    throw new Error(`Leave create failed: ${leaveCreate.status} ${JSON.stringify(leaveCreate.body)}`);
  }
  const leave = leaveCreate.body.data;

  const leaveApprove = await apiFetch(manager, `/ess/manager/leave-requests/${leave.id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  if (leaveApprove.status !== 200 || leaveApprove.body.data?.status !== 'approved') {
    throw new Error(`Leave approve failed: ${leaveApprove.status} ${JSON.stringify(leaveApprove.body)}`);
  }

  const correctionDate = '2026-12-25';
  const correctionCreate = await apiFetch(employee, '/ess/attendance/corrections', {
    method: 'POST',
    body: JSON.stringify({
      attendance_date: correctionDate,
      requested_status: 'present',
      requested_in_time: '09:00',
      requested_out_time: '18:00',
      reason: 'ESS approval audit - auto cleanup',
    }),
  });
  if (correctionCreate.status !== 201) {
    throw new Error(`Correction create failed: ${correctionCreate.status} ${JSON.stringify(correctionCreate.body)}`);
  }
  const correction = correctionCreate.body.data;

  const correctionApprove = await apiFetch(manager, `/ess/manager/attendance-corrections/${correction.id}/approve`, {
    method: 'PATCH',
    body: JSON.stringify({}),
  });
  if (correctionApprove.status !== 200 || correctionApprove.body.data?.status !== 'approved') {
    throw new Error(`Correction approve failed: ${correctionApprove.status} ${JSON.stringify(correctionApprove.body)}`);
  }

  await cleanupLeave({
    leaveId: leave.id,
    userId: leave.user_id,
    leaveTypeId: leave.leave_type_id,
    year: new Date(leave.from_date).getFullYear(),
    days: Number(leave.days || 0),
  });
  await cleanupCorrection({ correctionId: correction.id, userId: correction.user_id, date: correctionDate });

  console.table([
    { check: 'Employee creates leave request', status: leaveCreate.status, result: leave.status },
    { check: 'Manager approves leave request', status: leaveApprove.status, result: leaveApprove.body.data.status },
    { check: 'Employee creates attendance correction', status: correctionCreate.status, result: correction.status },
    {
      check: 'Manager approves attendance correction',
      status: correctionApprove.status,
      result: correctionApprove.body.data.status,
    },
    { check: 'Audit test data cleanup', status: 200, result: 'removed' },
  ]);
})()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
