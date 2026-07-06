const { query, pool } = require('../src/config/database');

async function main() {
  const res = await query(`
    SELECT name, email
    FROM users
    WHERE is_active = TRUE
      AND email IS NOT NULL
      AND email ILIKE '%@hr.local'
    ORDER BY name ASC
  `);
  console.log(JSON.stringify(res.rows));
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => pool.end());
