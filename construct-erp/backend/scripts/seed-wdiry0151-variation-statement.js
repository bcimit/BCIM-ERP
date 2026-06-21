// seed-wdiry0151-variation-statement.js
// Uploads WDIRY0151 Variation Statement data into the ERP
// Run: node scripts/seed-wdiry0151-variation-statement.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const q = (sql, p) => pool.query(sql, p);

// ── Data from WDIRY0151-BCIM Engineering Pvt Ltd-Variation Statement.xlsx ─────

const HEADER = {
  wo_number:           'WDIRY0151',
  vendor_name:         'Divyashree Infrastructure Projects Pvt Ltd',
  package_description: 'Civil works for Retaining wall and STP',
  wo_value_excl_gst:   42827874.275,
  gst_rate:            18,
  remarks:             'Residential Apartments-Yelahanka',
};

const ITEMS = [
  {
    sl_no: '01.36.61.01.25.56.95',
    item_code: '01.36.61.01.25.56.95',
    description: 'Earth work excavation by mechanical means using JCB etc., in all type of soil including dense, weathered rock, soft rock including levelling, all leads and lifts for footing, raft, rc wall foundation, trenches, etc., including excavation for dressing the edges & levelling. Rate to include stacking or dispose the excavated earth within the site premises and spreading in layers to required level and also carting away the excess earth outside.',
    unit: 'cum', rate: 375, wo_qty: 6291.89, amendment_qty: 12948.459,
  },
  {
    sl_no: '01.36.61.01.25.56.96',
    item_code: '01.36.61.01.25.56.96',
    description: 'Earth backfilling with available earth in foundations and the area wherever specified with approved good quality filling materials in plinths, area development etc. wherever specified in layers of not exceeding 300 mm thick including breaking clods, storing, transportation, watering, compacting each layer with vibratory compactor/roller and at unaccessible places with wooden/steel rammers to achieve 90 to 95% proctor density at optimum moisture content.',
    unit: 'cum', rate: 180, wo_qty: 4515.83, amendment_qty: 4515.83,
  },
  {
    sl_no: '01.36.61.01.25.56.97',
    item_code: '01.36.61.01.25.56.97',
    description: 'Providing and laying 100 thk P.C.C. 1:3:6 M10 of specified thick wherever specified using M.sand, 20mm and downsize metal including base preparation, Compaction, levelling, all leads and lifts, curing and shuttering if necessary etc., Complete - Below Foundation.',
    unit: 'cum', rate: 5750, wo_qty: 141.75, amendment_qty: 306.355,
  },
  {
    sl_no: '01.36.61.01.25.56.98',
    item_code: '01.36.61.01.25.56.98',
    description: 'Providing, batching, mixing, transporting through transit mixers, pumping and laying RCC - Retaining wall Raft - M30.',
    unit: 'cum', rate: 7750, wo_qty: 912.81, amendment_qty: 1074.554,
  },
  {
    sl_no: '01.36.61.01.25.56.99',
    item_code: '01.36.61.01.25.56.99',
    description: 'Providing, batching, mixing, transporting through transit mixers, pumping and laying RCC - Concrete for Retaining wall and Columns and Slab - M30.',
    unit: 'cum', rate: 7750, wo_qty: 934.98, amendment_qty: 1386.532,
  },
  {
    sl_no: '01.36.61.01.25.56.100',
    item_code: '01.36.61.01.25.56.100',
    description: 'Providing, fabricating and erecting form work - Retaining wall raft Shuttering.',
    unit: 'sqm', rate: 725, wo_qty: 1543.24, amendment_qty: 823.58,
  },
  {
    sl_no: '01.36.61.01.25.56.101',
    item_code: '01.36.61.01.25.56.101',
    description: 'Providing, fabricating and erecting form work - Retaining walls & Slab shuttering.',
    unit: 'sqm', rate: 725, wo_qty: 5760.965, amendment_qty: 8895.724,
  },
  {
    sl_no: '01.36.61.01.25.56.102',
    item_code: '01.36.61.01.25.56.102',
    description: 'Supply, fabricating & fixing in position reinforcement - Reinforcement Steel Fe 550 D for Nailing Works.',
    unit: 'mt', rate: 72500, wo_qty: 173.01, amendment_qty: 270,
  },
  {
    sl_no: '01.36.61.01.25.56.103',
    item_code: '01.36.61.01.25.56.103',
    description: 'Supply and application of Penetron Whitetank© system, integrated water resistance cell in combination with catalytic effective hydrophilic mechanism for below Basements Retaining Walls & Walls for Water Retaining Structures / Swimming Pools & Liftpit etc. Approved make Penetron India.',
    unit: 'cum', rate: 1000, wo_qty: 918.44, amendment_qty: 2546.984,
  },
  {
    sl_no: '01.36.61.01.25.56.104',
    item_code: '01.36.61.01.25.56.104',
    description: 'Providing and applying Penetron coating shake application - catalytic crystalline waterproofing treatment to the footing sides. Approved make Penetron India.',
    unit: 'sqm', rate: 450, wo_qty: 1023.25, amendment_qty: 0,
  },
  {
    sl_no: '01.36.61.01.25.56.107',
    item_code: '01.36.61.01.25.56.107',
    description: 'Providing waterproofing by Surface method INTERNALLY - Floors.',
    unit: 'sqm', rate: 800, wo_qty: 390.94, amendment_qty: 571.354,
  },
  {
    sl_no: '01.36.61.01.25.56.108',
    item_code: '01.36.61.01.25.56.108',
    description: 'Providing waterproofing by Surface method INTERNALLY - Walls.',
    unit: 'sqm', rate: 900, wo_qty: 1777.07, amendment_qty: 2026.036,
  },
  {
    sl_no: '01.36.61.01.25.56.109',
    item_code: '01.36.61.01.25.56.109',
    description: 'Providing and treating of all Tierods considering as part of the entire below ground structure in combination with catalytic effective crystalline hydrophilic mechanism using Penecrete Mortar & required primer & providing finishing coat at all treated areas.',
    unit: 'Nos', rate: 75, wo_qty: 17530, amendment_qty: 17530,
  },
  {
    sl_no: '01.36.61.01.25.56.110',
    item_code: '01.36.61.01.25.56.110',
    description: 'Providing and installing of Construction Joints in all the joints of the below ground structures including Retaining Walls & Grade Slab using Penecrete Mortar & required primer & finishing coat at all the construction joints.',
    unit: 'rm', rate: 1000, wo_qty: 2075.59, amendment_qty: 2075.59,
  },
];

const NT_ITEMS = [
  {
    sl_no: 'NT Items-03',
    description: 'Supply, fabrication, fixing, testing and commissioning of MS puddle flanged pipes of required sizes for inlet, outlet, vent and overflow pipes for all Water retaining structures. All the puddle flanged pipes, plates and fittings shall be Hot dip galvanized after fabrication as per IS specifications. Size: 200mm x 200mm x 6mm.',
    unit: 'Nos', rate: 5424, qty: 7,
  },
  {
    sl_no: 'NT Items-04',
    description: 'Providing and fixing in position single component, self sealing water swelling bars at construction joints of retaining walls and water retaining structures like UG Sump, OHT & STP, etc., and wherever specified with proper overlaps at joints of approved makes as per consultants approval.',
    unit: 'Rmt', rate: 685, qty: 2389.157,
  },
  {
    sl_no: 'NT Items-05',
    description: 'Supply of Cement Bags.',
    unit: 'Bags', rate: 220, qty: 100,
  },
  {
    sl_no: 'NT Items-06',
    description: 'Deploying of Security Guard Supervisor.',
    unit: 'Months', rate: 30750, qty: 6,
  },
  {
    sl_no: 'NT Items-07',
    description: 'Deploying of Security Guard.',
    unit: 'Months', rate: 27675, qty: 18,
  },
  {
    sl_no: 'NT Items-08',
    description: 'Security Deposit to Labour Camp.',
    unit: 'Ls', rate: 1524600, qty: 1,
  },
  {
    sl_no: 'NT Items-09',
    description: 'Rental Charges for Labour Camp.',
    unit: 'Months', rate: 217800, qty: 6,
  },
  {
    sl_no: 'NT Items-10',
    description: 'Supply of Steel to Client.',
    unit: 'MT', rate: 48750, qty: 3,
  },
];

async function run() {
  console.log('Connecting to database…');

  // Widen sl_no if it was created with VARCHAR(20)
  await q(`ALTER TABLE IF EXISTS variation_statement_items ALTER COLUMN sl_no TYPE VARCHAR(60)`).catch(() => {});
  await q(`ALTER TABLE IF EXISTS variation_statement_nt_items ALTER COLUMN sl_no TYPE VARCHAR(60)`).catch(() => {});

  // Ensure tables exist
  await q(`
    CREATE TABLE IF NOT EXISTS variation_statements (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
      project_id UUID REFERENCES projects(id),
      wo_number VARCHAR(100) DEFAULT '',
      vendor_name VARCHAR(200) DEFAULT '',
      package_description TEXT DEFAULT '',
      wo_value_excl_gst NUMERIC(15,2) DEFAULT 0,
      gst_rate NUMERIC(5,2) DEFAULT 18,
      status VARCHAR(20) DEFAULT 'draft',
      submitted_at TIMESTAMPTZ,
      remarks TEXT DEFAULT '',
      created_by UUID REFERENCES users(id),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS variation_statement_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      statement_id UUID REFERENCES variation_statements(id) ON DELETE CASCADE,
      sl_no VARCHAR(40) DEFAULT '',
      item_code VARCHAR(60) DEFAULT '',
      description TEXT DEFAULT '',
      unit VARCHAR(30) DEFAULT '',
      rate NUMERIC(12,2) DEFAULT 0,
      wo_qty NUMERIC(14,3) DEFAULT 0,
      amendment_qty NUMERIC(14,3) DEFAULT 0,
      sort_order INT DEFAULT 0
    )
  `);
  await q(`
    CREATE TABLE IF NOT EXISTS variation_statement_nt_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      statement_id UUID REFERENCES variation_statements(id) ON DELETE CASCADE,
      sl_no VARCHAR(40) DEFAULT '',
      description TEXT DEFAULT '',
      unit VARCHAR(30) DEFAULT '',
      rate NUMERIC(12,2) DEFAULT 0,
      qty NUMERIC(14,3) DEFAULT 0,
      sort_order INT DEFAULT 0
    )
  `);

  // Get company
  const compR = await q(`SELECT id FROM companies LIMIT 1`);
  if (!compR.rows.length) throw new Error('No company found');
  const company_id = compR.rows[0].id;
  console.log('Company:', company_id);

  // Find project (search by keywords from the variation statement)
  const projR = await q(
    `SELECT id, name FROM projects WHERE company_id = $1
     AND (LOWER(name) LIKE '%yelahanka%' OR LOWER(name) LIKE '%divyasree%' OR LOWER(name) LIKE '%quiet%' OR LOWER(name) LIKE '%residential%')
     ORDER BY created_at DESC LIMIT 5`,
    [company_id]
  );
  if (!projR.rows.length) {
    // List all projects
    const allP = await q(`SELECT id, name FROM projects WHERE company_id=$1 ORDER BY name`, [company_id]);
    console.log('\nNo matching project found. Available projects:');
    allP.rows.forEach(p => console.log(' -', p.name, '→', p.id));
    throw new Error('Please update the script with the correct project name/ID');
  }
  const project_id = projR.rows[0].id;
  console.log('Project:', projR.rows[0].name, '→', project_id);

  // Get a user
  const userR = await q(`SELECT id FROM users WHERE company_id=$1 ORDER BY created_at LIMIT 1`, [company_id]);
  const created_by = userR.rows[0]?.id || null;

  // Check if already exists
  const exists = await q(
    `SELECT id FROM variation_statements WHERE company_id=$1 AND wo_number=$2`,
    [company_id, HEADER.wo_number]
  );
  if (exists.rows.length) {
    console.log(`\nVariation Statement for ${HEADER.wo_number} already exists (id: ${exists.rows[0].id}). Deleting and re-inserting…`);
    await q(`DELETE FROM variation_statements WHERE id=$1`, [exists.rows[0].id]);
  }

  // Create statement
  const stmtR = await q(
    `INSERT INTO variation_statements
       (company_id, project_id, wo_number, vendor_name, package_description, wo_value_excl_gst, gst_rate, remarks, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
    [company_id, project_id, HEADER.wo_number, HEADER.vendor_name,
     HEADER.package_description, HEADER.wo_value_excl_gst, HEADER.gst_rate,
     HEADER.remarks, created_by]
  );
  const stmt_id = stmtR.rows[0].id;
  console.log('\nVariation Statement created:', stmt_id);

  // Insert existing items
  for (let i = 0; i < ITEMS.length; i++) {
    const it = ITEMS[i];
    await q(
      `INSERT INTO variation_statement_items
         (statement_id, sl_no, item_code, description, unit, rate, wo_qty, amendment_qty, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [stmt_id, it.sl_no, it.item_code, it.description, it.unit,
       it.rate, it.wo_qty, it.amendment_qty, i]
    );
    console.log(`  ✓ Item ${i+1}/${ITEMS.length}: ${it.item_code}`);
  }

  // Insert NT items
  for (let i = 0; i < NT_ITEMS.length; i++) {
    const n = NT_ITEMS[i];
    await q(
      `INSERT INTO variation_statement_nt_items
         (statement_id, sl_no, description, unit, rate, qty, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [stmt_id, n.sl_no, n.description, n.unit, n.rate, n.qty, i]
    );
    console.log(`  ✓ NT Item ${i+1}/${NT_ITEMS.length}: ${n.sl_no}`);
  }

  console.log('\n✅ Done! WDIRY0151 Variation Statement uploaded successfully.');
  console.log(`   Statement ID: ${stmt_id}`);
  console.log(`   ${ITEMS.length} existing items + ${NT_ITEMS.length} NT items`);

  const totals = ITEMS.reduce((s, it) => ({
    wo: s.wo + it.rate * it.wo_qty,
    amend: s.amend + it.rate * it.amendment_qty,
  }), { wo: 0, amend: 0 });
  const ntTotal = NT_ITEMS.reduce((s, n) => s + n.rate * n.qty, 0);
  const grandEx = totals.amend + ntTotal;
  console.log(`\n   WO Total (excl GST):     ₹${totals.wo.toLocaleString('en-IN', {maximumFractionDigits:2})}`);
  console.log(`   Amendment Total (excl):  ₹${totals.amend.toLocaleString('en-IN', {maximumFractionDigits:2})}`);
  console.log(`   NT Items Total:          ₹${ntTotal.toLocaleString('en-IN', {maximumFractionDigits:2})}`);
  console.log(`   Grand Total (excl GST):  ₹${grandEx.toLocaleString('en-IN', {maximumFractionDigits:2})}`);
  console.log(`   Grand Total (incl 18%):  ₹${(grandEx * 1.18).toLocaleString('en-IN', {maximumFractionDigits:2})}`);

  await pool.end();
}

run().catch(e => { console.error('ERROR:', e.message); pool.end(); process.exit(1); });
