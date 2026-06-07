const { query, pool } = require('../src/config/database');

const DEFAULT_DEPARTMENTS = [
  'Management',
  'Administration',
  'Civil & Structural',
  'QS & Estimation',
  'Procurement',
  'Stores',
  'Finance & Accounts',
  'HR & Admin',
  'Quality (QA/QC)',
  'HSE',
  'Planning',
  'IT',
  'Document Control',
  'Assets',
];

const DEFAULT_LEAVE_TYPES = [
  { name: 'Casual Leave', code: 'CL', days_per_year: 12, carry_forward: false, max_carry_forward: 0, is_paid: true, applicable_gender: 'all' },
  { name: 'Sick Leave', code: 'SL', days_per_year: 12, carry_forward: false, max_carry_forward: 0, is_paid: true, applicable_gender: 'all' },
  { name: 'Earned Leave', code: 'EL', days_per_year: 15, carry_forward: true, max_carry_forward: 30, is_paid: true, applicable_gender: 'all' },
  { name: 'Loss of Pay', code: 'LOP', days_per_year: 0, carry_forward: false, max_carry_forward: 0, is_paid: false, applicable_gender: 'all' },
  { name: 'Maternity Leave', code: 'ML', days_per_year: 182, carry_forward: false, max_carry_forward: 0, is_paid: true, applicable_gender: 'female' },
  { name: 'Paternity Leave', code: 'PL', days_per_year: 7, carry_forward: false, max_carry_forward: 0, is_paid: true, applicable_gender: 'male' },
];

const HOLIDAYS_2026 = [
  ['2026-01-01', 'New Year', 'national'],
  ['2026-01-14', 'Makara Sankranti', 'festival'],
  ['2026-01-26', 'Republic Day', 'national'],
  ['2026-03-21', 'Ugadi', 'festival'],
  ['2026-05-01', 'May Day', 'national'],
  ['2026-08-15', 'Independence Day', 'national'],
  ['2026-08-27', 'Onam', 'festival'],
  ['2026-09-04', 'Janmashtami', 'festival'],
  ['2026-10-02', 'Gandhi Jayanti', 'national'],
  ['2026-10-20', 'Ayudha Puja', 'festival'],
  ['2026-10-21', 'Vijayadashami', 'festival'],
  ['2026-11-08', 'Deepavali', 'festival'],
  ['2026-11-09', 'Balipadyami', 'festival'],
  ['2026-12-25', 'Christmas', 'national'],
];

function cleanName(value, fallback) {
  const text = String(value || '').trim();
  return text || fallback;
}

function titleCaseRole(role) {
  return String(role || 'Employee')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS hr_departments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      name TEXT NOT NULL,
      head_user_id UUID REFERENCES users(id),
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS hr_designations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      name TEXT NOT NULL,
      department_id UUID REFERENCES hr_departments(id),
      grade TEXT,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS hr_holidays (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      holiday_date DATE NOT NULL,
      name TEXT NOT NULL,
      holiday_type TEXT DEFAULT 'national',
      year INT,
      UNIQUE(company_id, holiday_date)
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS hr_leave_types (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      name TEXT NOT NULL,
      code TEXT NOT NULL,
      days_per_year NUMERIC(5,1) DEFAULT 0,
      carry_forward BOOLEAN DEFAULT FALSE,
      max_carry_forward NUMERIC(5,1) DEFAULT 0,
      is_paid BOOLEAN DEFAULT TRUE,
      applicable_gender TEXT DEFAULT 'all',
      is_active BOOLEAN DEFAULT TRUE
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS employee_profiles (
      user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      company_id UUID REFERENCES companies(id),
      department_id UUID REFERENCES hr_departments(id),
      designation_id UUID REFERENCES hr_designations(id),
      date_of_joining DATE,
      date_of_birth DATE,
      gender TEXT,
      father_name TEXT,
      mother_name TEXT,
      marital_status TEXT,
      blood_group TEXT,
      nationality TEXT DEFAULT 'Indian',
      pan_number TEXT,
      aadhaar_number TEXT,
      uan_number TEXT,
      pf_account_number TEXT,
      esi_number TEXT,
      bank_name TEXT,
      bank_account_number TEXT,
      bank_ifsc TEXT,
      permanent_address TEXT,
      current_address TEXT,
      emergency_contact_name TEXT,
      emergency_contact_phone TEXT,
      employment_type TEXT DEFAULT 'permanent',
      probation_end_date DATE,
      notice_period_days INT DEFAULT 30,
      date_of_leaving DATE,
      leaving_reason TEXT,
      employment_status TEXT DEFAULT 'active',
      profile_photo_url TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await query(`
    CREATE TABLE IF NOT EXISTS hr_leave_balances (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id) ON DELETE CASCADE,
      leave_type_id UUID REFERENCES hr_leave_types(id),
      year INT NOT NULL,
      opening_balance NUMERIC(5,1) DEFAULT 0,
      accrued NUMERIC(5,1) DEFAULT 0,
      used NUMERIC(5,1) DEFAULT 0,
      adjusted NUMERIC(5,1) DEFAULT 0,
      closing_balance NUMERIC(5,1) DEFAULT 0,
      UNIQUE(user_id, leave_type_id, year)
    )
  `);
}

async function upsertDepartment(companyId, name) {
  const existing = await query(
    `SELECT id FROM hr_departments WHERE company_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
    [companyId, name]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await query(
    `INSERT INTO hr_departments (company_id, name) VALUES ($1, $2) RETURNING id`,
    [companyId, name]
  );
  return inserted.rows[0].id;
}

async function upsertDesignation(companyId, name, departmentId) {
  const existing = await query(
    `SELECT id FROM hr_designations
      WHERE company_id = $1 AND LOWER(name) = LOWER($2)
        AND COALESCE(department_id::text, '') = COALESCE($3::uuid::text, '')
      LIMIT 1`,
    [companyId, name, departmentId]
  );
  if (existing.rows[0]) return existing.rows[0].id;

  const inserted = await query(
    `INSERT INTO hr_designations (company_id, name, department_id)
     VALUES ($1, $2, $3) RETURNING id`,
    [companyId, name, departmentId]
  );
  return inserted.rows[0].id;
}

async function main() {
  await ensureTables();

  const companyRes = await query(`SELECT id FROM companies ORDER BY created_at NULLS LAST LIMIT 1`);
  const companyId = companyRes.rows[0]?.id;
  if (!companyId) throw new Error('No company found. Cannot seed HR foundation.');

  const deptMap = new Map();
  for (const dept of DEFAULT_DEPARTMENTS) {
    deptMap.set(dept.toLowerCase(), await upsertDepartment(companyId, dept));
  }

  const usersRes = await query(
    `SELECT id, employee_code, name, email, role, designation, department, is_active
       FROM users
      WHERE company_id = $1 AND is_active = TRUE
      ORDER BY name`,
    [companyId]
  );

  let profileCount = 0;
  let designationCount = 0;
  for (const user of usersRes.rows) {
    const deptName = cleanName(user.department, user.role === 'super_admin' ? 'Administration' : 'Administration');
    let deptId = deptMap.get(deptName.toLowerCase());
    if (!deptId) {
      deptId = await upsertDepartment(companyId, deptName);
      deptMap.set(deptName.toLowerCase(), deptId);
    }

    const designationName = cleanName(user.designation, titleCaseRole(user.role));
    const before = await query(
      `SELECT id FROM hr_designations WHERE company_id = $1 AND LOWER(name) = LOWER($2) AND department_id = $3 LIMIT 1`,
      [companyId, designationName, deptId]
    );
    const designationId = await upsertDesignation(companyId, designationName, deptId);
    if (!before.rows[0]) designationCount += 1;

    await query(
      `INSERT INTO employee_profiles
        (user_id, company_id, department_id, designation_id, employment_type, employment_status, notice_period_days)
       VALUES ($1, $2, $3, $4, 'permanent', 'active', 30)
       ON CONFLICT (user_id) DO UPDATE SET
         company_id = EXCLUDED.company_id,
         department_id = COALESCE(employee_profiles.department_id, EXCLUDED.department_id),
         designation_id = COALESCE(employee_profiles.designation_id, EXCLUDED.designation_id),
         employment_status = COALESCE(employee_profiles.employment_status, 'active'),
         updated_at = NOW()`,
      [user.id, companyId, deptId, designationId]
    );
    profileCount += 1;
  }

  for (const lt of DEFAULT_LEAVE_TYPES) {
    await query(
      `INSERT INTO hr_leave_types
        (company_id, name, code, days_per_year, carry_forward, max_carry_forward, is_paid, applicable_gender)
       SELECT $1, $2, $3, $4, $5, $6, $7, $8
       WHERE NOT EXISTS (
         SELECT 1 FROM hr_leave_types WHERE company_id = $1 AND LOWER(code) = LOWER($3)
       )`,
      [companyId, lt.name, lt.code, lt.days_per_year, lt.carry_forward, lt.max_carry_forward, lt.is_paid, lt.applicable_gender]
    );
  }

  for (const [holidayDate, name, type] of HOLIDAYS_2026) {
    await query(
      `INSERT INTO hr_holidays (company_id, holiday_date, name, holiday_type, year)
       VALUES ($1, $2, $3, $4, 2026)
       ON CONFLICT (company_id, holiday_date)
       DO UPDATE SET name = EXCLUDED.name, holiday_type = EXCLUDED.holiday_type, year = EXCLUDED.year`,
      [companyId, holidayDate, name, type]
    );
  }

  const leaveTypes = await query(
    `SELECT id, days_per_year FROM hr_leave_types WHERE company_id = $1 AND is_active = TRUE`,
    [companyId]
  );
  for (const user of usersRes.rows) {
    for (const lt of leaveTypes.rows) {
      await query(
        `INSERT INTO hr_leave_balances (user_id, leave_type_id, year, accrued, closing_balance)
         VALUES ($1, $2, 2026, $3, $3)
         ON CONFLICT (user_id, leave_type_id, year) DO NOTHING`,
        [user.id, lt.id, lt.days_per_year || 0]
      );
    }
  }

  const counts = {};
  for (const table of [
    'hr_departments',
    'hr_designations',
    'employee_profiles',
    'hr_leave_types',
    'hr_leave_balances',
    'hr_holidays',
  ]) {
    const c = await query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = c.rows[0].count;
  }

  console.log(JSON.stringify({
    companyId,
    activeUsers: usersRes.rows.length,
    employeeProfilesTouched: profileCount,
    newDesignationsFromUsers: designationCount,
    counts,
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
