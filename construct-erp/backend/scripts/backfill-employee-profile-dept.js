// One-off: backfill employee_profiles.department_id/designation_id for users
// whose users.department/designation text matches an hr_departments/
// hr_designations row by name but was never linked (HR dashboard reads via
// department_id, Team Members only ever wrote the free-text field). Only
// updates rows that are currently NULL and have a confident exact-name match
// — does not touch anything already linked.
require('dotenv').config();

const { pool } = require('../src/config/database');

async function main() {
  const affected = await pool.query(`
    SELECT u.id, u.name, u.email, u.company_id, u.department, u.designation
    FROM users u
    JOIN employee_profiles ep ON ep.user_id = u.id
    WHERE ep.department_id IS NULL AND u.department IS NOT NULL
  `);

  const results = [];
  for (const u of affected.rows) {
    const sets = [];
    const params = [u.id];
    let i = 2;

    const dep = await pool.query(
      `SELECT id, name FROM hr_departments WHERE company_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
      [u.company_id, u.department]
    );
    if (dep.rows.length) { sets.push(`department_id = $${i++}`); params.push(dep.rows[0].id); }

    if (u.designation) {
      const desg = await pool.query(
        `SELECT id, name FROM hr_designations WHERE company_id = $1 AND LOWER(name) = LOWER($2) LIMIT 1`,
        [u.company_id, u.designation]
      );
      if (desg.rows.length) { sets.push(`designation_id = $${i++}`); params.push(desg.rows[0].id); }
    }

    if (!sets.length) {
      results.push({ name: u.name, email: u.email, status: 'no match', department: u.department, designation: u.designation });
      continue;
    }

    sets.push('updated_at = NOW()');
    await pool.query(`UPDATE employee_profiles SET ${sets.join(', ')} WHERE user_id = $1`, params);
    results.push({ name: u.name, email: u.email, status: 'linked', matched: sets.length - 1 });
  }

  console.log(JSON.stringify(results, null, 2));
  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
