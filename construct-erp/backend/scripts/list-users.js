const { query, pool } = require('../src/config/database');

async function main() {
  const result = await query(`
    SELECT name, email, role, department, is_active, created_at
    FROM users
    ORDER BY created_at DESC
  `);
  console.table(result.rows);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
