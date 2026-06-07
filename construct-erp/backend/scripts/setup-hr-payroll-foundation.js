// Seed HR payroll foundation data without touching confidential employee salaries.
const { query, pool } = require('../src/config/database');

const SALARY_STRUCTURES = [
  {
    name: 'BCIM Staff Salary Structure',
    components: [
      { component_name: 'Basic', component_type: 'earning', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: true },
      { component_name: 'House Rent Allowance', component_type: 'earning', calc_type: 'pct_of_basic', amount: 0, pct: 40, is_taxable: true },
      { component_name: 'Conveyance Allowance', component_type: 'earning', calc_type: 'fixed', amount: 1600, pct: 0, is_taxable: false },
      { component_name: 'Medical Allowance', component_type: 'earning', calc_type: 'fixed', amount: 1250, pct: 0, is_taxable: false },
      { component_name: 'Special Allowance', component_type: 'earning', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: true },
      { component_name: 'PF Employee', component_type: 'statutory', calc_type: 'pct_of_basic', amount: 0, pct: 12, is_taxable: false },
      { component_name: 'PF Employer', component_type: 'statutory', calc_type: 'pct_of_basic', amount: 0, pct: 12, is_taxable: false },
      { component_name: 'ESI Employee', component_type: 'statutory', calc_type: 'pct_of_gross', amount: 0, pct: 0.75, is_taxable: false },
      { component_name: 'ESI Employer', component_type: 'statutory', calc_type: 'pct_of_gross', amount: 0, pct: 3.25, is_taxable: false },
      { component_name: 'Professional Tax', component_type: 'deduction', calc_type: 'fixed', amount: 200, pct: 0, is_taxable: false },
      { component_name: 'TDS', component_type: 'deduction', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: false },
      { component_name: 'Loan / Advance Recovery', component_type: 'deduction', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: false },
      { component_name: 'Other Deduction', component_type: 'deduction', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: false },
    ],
  },
  {
    name: 'BCIM Site Staff Salary Structure',
    components: [
      { component_name: 'Basic', component_type: 'earning', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: true },
      { component_name: 'House Rent Allowance', component_type: 'earning', calc_type: 'pct_of_basic', amount: 0, pct: 40, is_taxable: true },
      { component_name: 'Site Allowance', component_type: 'earning', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: true },
      { component_name: 'Conveyance Allowance', component_type: 'earning', calc_type: 'fixed', amount: 1600, pct: 0, is_taxable: false },
      { component_name: 'Special Allowance', component_type: 'earning', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: true },
      { component_name: 'PF Employee', component_type: 'statutory', calc_type: 'pct_of_basic', amount: 0, pct: 12, is_taxable: false },
      { component_name: 'PF Employer', component_type: 'statutory', calc_type: 'pct_of_basic', amount: 0, pct: 12, is_taxable: false },
      { component_name: 'ESI Employee', component_type: 'statutory', calc_type: 'pct_of_gross', amount: 0, pct: 0.75, is_taxable: false },
      { component_name: 'ESI Employer', component_type: 'statutory', calc_type: 'pct_of_gross', amount: 0, pct: 3.25, is_taxable: false },
      { component_name: 'Professional Tax', component_type: 'deduction', calc_type: 'fixed', amount: 200, pct: 0, is_taxable: false },
      { component_name: 'TDS', component_type: 'deduction', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: false },
      { component_name: 'Loan / Advance Recovery', component_type: 'deduction', calc_type: 'fixed', amount: 0, pct: 0, is_taxable: false },
    ],
  },
];

async function ensureTables() {
  await query(`
    CREATE TABLE IF NOT EXISTS hr_salary_structures (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      name TEXT NOT NULL,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS hr_salary_components (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      structure_id UUID REFERENCES hr_salary_structures(id) ON DELETE CASCADE,
      component_name TEXT NOT NULL,
      component_type TEXT NOT NULL,
      calc_type TEXT DEFAULT 'fixed',
      amount NUMERIC(12,2) DEFAULT 0,
      pct NUMERIC(5,2) DEFAULT 0,
      is_taxable BOOLEAN DEFAULT TRUE,
      sort_order INT DEFAULT 0
    )
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS hr_employee_salaries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES users(id),
      structure_id UUID REFERENCES hr_salary_structures(id),
      ctc_annual NUMERIC(14,2),
      basic NUMERIC(12,2),
      hra NUMERIC(12,2),
      conveyance NUMERIC(12,2),
      medical NUMERIC(12,2),
      special_allowance NUMERIC(12,2),
      other_allowance NUMERIC(12,2),
      gross_monthly NUMERIC(12,2),
      pf_applicable BOOLEAN DEFAULT TRUE,
      esi_applicable BOOLEAN DEFAULT TRUE,
      pt_applicable BOOLEAN DEFAULT TRUE,
      effective_from DATE NOT NULL,
      effective_to DATE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getCompanyId() {
  const { rows } = await query('SELECT id FROM companies ORDER BY created_at NULLS LAST LIMIT 1');
  if (!rows.length) throw new Error('No company found. Create company/admin first.');
  return rows[0].id;
}

async function upsertStructure(companyId, structure) {
  const existing = await query(
    'SELECT id FROM hr_salary_structures WHERE company_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1',
    [companyId, structure.name]
  );

  const structureId = existing.rows[0]?.id || (await query(
    'INSERT INTO hr_salary_structures (company_id, name, is_active) VALUES ($1, $2, TRUE) RETURNING id',
    [companyId, structure.name]
  )).rows[0].id;

  await query('DELETE FROM hr_salary_components WHERE structure_id = $1', [structureId]);

  for (let i = 0; i < structure.components.length; i++) {
    const c = structure.components[i];
    await query(
      `INSERT INTO hr_salary_components
       (structure_id, component_name, component_type, calc_type, amount, pct, is_taxable, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [
        structureId,
        c.component_name,
        c.component_type,
        c.calc_type,
        c.amount,
        c.pct,
        c.is_taxable,
        i + 1,
      ]
    );
  }

  return structureId;
}

async function main() {
  await ensureTables();
  const companyId = await getCompanyId();

  const seeded = [];
  for (const structure of SALARY_STRUCTURES) {
    const id = await upsertStructure(companyId, structure);
    seeded.push({ id, name: structure.name, components: structure.components.length });
  }

  const counts = {};
  for (const table of ['hr_salary_structures', 'hr_salary_components', 'hr_employee_salaries']) {
    const { rows } = await query(`SELECT COUNT(*)::int AS count FROM ${table}`);
    counts[table] = rows[0].count;
  }

  console.log(JSON.stringify({ companyId, seeded, counts }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
