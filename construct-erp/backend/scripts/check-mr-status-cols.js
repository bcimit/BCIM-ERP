require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : { host: process.env.DB_HOST||'localhost', port: parseInt(process.env.DB_PORT)||5432, database: process.env.DB_NAME||'construct_erp', user: process.env.DB_USER||'postgres', password: process.env.DB_PASSWORD||'' }
);
(async () => {
  const c = await pool.connect();
  try {
    const cols = await c.query(
      `SELECT column_name, data_type FROM information_schema.columns
       WHERE table_name='material_requisitions' AND column_name ILIKE '%approv%' OR column_name IN ('status','rejected_by','rejected_at','processed_by','processed_at')
       ORDER BY column_name`
    );
    console.log('COLUMNS:');
    cols.rows.forEach(r => console.log(' -', r.column_name, '(' + r.data_type + ')'));

    const proj = await c.query(`SELECT id, name, mrs_workflow FROM projects WHERE LOWER(project_code)='wdiry0151'`);
    console.log('\nPROJECT:', JSON.stringify(proj.rows[0]));

    const mrs = await c.query(
      `SELECT serial_no_formatted, status FROM material_requisitions
       WHERE project_id = $1 ORDER BY serial_no_formatted`,
      [proj.rows[0].id]
    );
    console.log(`\nMRs (${mrs.rows.length}):`);
    mrs.rows.forEach(r => console.log(' -', r.serial_no_formatted, '=>', r.status));
  } finally {
    c.release(); await pool.end();
  }
})();
