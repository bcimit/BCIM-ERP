// seed-wdiry0194-variation-statement.js
// Uploads WDIRY0194 Variation Statement data into the ERP
// Run: node scripts/seed-wdiry0194-variation-statement.js
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
const q = (sql, p) => pool.query(sql, p);

// ── Data from WDIRY0194-BCIM Engineering Pvt Ltd-Variation Statement -Excluding Relinguish road.xlsx ─────

const HEADER = {
  wo_number:           'WDIRY0194',
  vendor_name:         'Divyashree Infrastructure Projects Pvt Ltd',
  package_description: 'Main Entry gate Road work and Storm water drain civil work',
  wo_value_excl_gst:   2819263.695,
  gst_rate:            18,
  remarks:             'Residential Apartments-Yelahanka',
};

const ITEMS = [
  {
    sl_no: '01.36.61.01.25.56.141',
    item_code: '01.36.61.01.25.56.141',
    description: 'Excavation in all types of soil except rocks not exceeding 1.5m depth including dressing for camber & disposing the excess earth & Spreading in layers of 250mm within the site to the required levels wherever specified',
    unit: 'Cum', rate: 550, wo_qty: 571.35, amendment_qty: 571.35,
  },
  {
    sl_no: '01.36.61.01.25.56.142',
    item_code: '01.36.61.01.25.56.142',
    description: 'Providing & Laying 250thk GSB consisting of morum, crushed Stone & gravel mixed in proportion as specified including preparation of subgrade after trimming to required level. Rate is inclusive of lead, lift, compaction etc as per requirement',
    unit: 'Cum', rate: 3250, wo_qty: 147.75, amendment_qty: 180.23565,
  },
  {
    sl_no: '01.36.61.01.25.56.143',
    item_code: '01.36.61.01.25.56.143',
    description: 'WMM 150mm thick providing & laying of wet mixed macadam in 1 layer of 150mm thickness as per morth table 100-12 to make the existing road slope towards proposed drain including watering & Compacting by vibratory roller to achieve 98% proctor density',
    unit: 'Cum', rate: 2400, wo_qty: 88.65, amendment_qty: 97.5017925,
  },
  {
    sl_no: '01.36.61.01.25.56.144',
    item_code: '01.36.61.01.25.56.144',
    description: 'DBM 800 thk Providing and laying 80mm consolidating thickness dense bituminous macadam using 20mm and 12mm size metal mixed with 60/70 grade hot bitumen at 56.00kg/cum metal mix from central hot mix plant and laid by paver and consolidated with vibrator',
    unit: 'Sqm', rate: 825, wo_qty: 591, amendment_qty: 650.01195,
  },
  {
    sl_no: '01.36.61.01.25.56.145',
    item_code: '01.36.61.01.25.56.145',
    description: 'Providing and laying 40mm compacted thick asphalt concrete over the prepared bituminous macadam with aggregates as per the MORTH Specifications',
    unit: 'Sqm', rate: 400, wo_qty: 591, amendment_qty: 725.5563,
  },
  {
    sl_no: '01.36.61.01.25.56.146',
    item_code: '01.36.61.01.25.56.146',
    description: 'Storm Water Drain Outside Main Gate - Providing and Laying P.C.C 1:3:6 M10 of specified thick wherever specified using M.Sand, 20mm and downsize metal including base preparation, Compaction, levelling, all leads and lifts, curing and shuttering if necessary etc., Complete',
    unit: 'Cum', rate: 6150, wo_qty: 9.45, amendment_qty: 10.7116432500003,
  },
  {
    sl_no: '01.36.61.01.25.56.147',
    item_code: '01.36.61.01.25.56.147',
    description: 'Providing & Laying Storm Water Drain Raft, Wall Concrete - M25 Grade',
    unit: 'Cum', rate: 7600, wo_qty: 52.2, amendment_qty: 67.31061868241073,
  },
  {
    sl_no: '01.36.61.01.25.56.148',
    item_code: '01.36.61.01.25.56.148',
    description: 'Providing & Fixing Storm Water Drain Raft, Wall Shuttering',
    unit: 'Sqm', rate: 895.5, wo_qty: 409.29, amendment_qty: 583.3380987258386,
  },
  {
    sl_no: '01.36.61.01.25.56.149',
    item_code: '01.36.61.01.25.56.149',
    description: 'Providing, Supplying, Fabricating & Fixing in Position Reinforcement for RCC work with high yield Strength ribbed cold twisted for Steel (HSD) bar of various diameters and grade of steel as specified in drawing to IS Specification including cutting, providing, supplying & Bending, hoisting, fabricating and placing in position according to drawings and binding the reinforcement with galvanised annealed binding wire of double fold of 18 gauge and providing PVC Cover blocks for placing the reinforcements in position and for Maintaining the cover specified or according to relevant IS',
    unit: 'MT', rate: 73000, wo_qty: 3.654, amendment_qty: 10.09659280236161,
  },
];

const NT_ITEMS = [
  {
    sl_no: 'NT Items-01',
    description: 'Shifting of Existing Gate',
    unit: 'LS', rate: 20000, qty: 1,
  },
  {
    sl_no: 'NT Items-02',
    description: 'Supply, Fabricating, Fixing of "MS C Channel" for Security Cabin. Size: 200mm x 75mm',
    unit: 'Kgs', rate: 122, qty: 545,
  },
  {
    sl_no: 'NT Items-03',
    description: 'Providing and fixing of Kerb stones of Size 600mm x 300mm x 100mm for Planter Walls Make: Shobha',
    unit: 'Rmt', rate: 765, qty: 35,
  },
  {
    sl_no: 'NT Items-04',
    description: 'Supplying and fixing of Drain cover to Drains complete as shown on the drawings etc. Drain Cover without Perforation - 600x900x75mm',
    unit: 'Nos', rate: 2846, qty: 145,
  },
  {
    sl_no: 'NT Items-05',
    description: 'Supplying and fixing of Drain cover to Drain complete as shown on the drawings etc. Drain Cover with Perforation - 600x900x75mm',
    unit: 'Nos', rate: 2846, qty: 15,
  },
  {
    sl_no: 'NT Items-06a',
    description: 'Fixing of 20mm thk. Antique finished Jet Black grey granite stone as Counter top with outer edge bull-nosed, cut to profile as per design, fixed in CM 1:4, including acid wash, wastages, lead and lift etc., complete (Granite Supply - DIPL Scope)',
    unit: 'Sqm', rate: 1785, qty: 3.915,
  },
  {
    sl_no: 'NT Items-06b',
    description: 'Fixing of 20mm thk. Antique finished Jet Black granite stone as vertical face with outer edge straight, cut to profile as per design, fixed with adhesive of Bostic/MYK Laticrete make, including acid wash, wastages, lead and lift etc., complete (Granite Supply - DIPL Scope)',
    unit: 'Sqm', rate: 1890, qty: 9.028,
  },
  {
    sl_no: 'NT Items-06c',
    description: 'Fixing of 20mm thk. Antique finished Jet Black granite stone as flooring with outer edge straight, cut to profile as per design, fixed in CM 1:4, including acid wash, wastages, lead and lift etc., complete (Granite Supply - DIPL Scope)',
    unit: 'Sqm', rate: 1418, qty: 19.046,
  },
  {
    sl_no: 'NT Items-06d',
    description: 'Fixing of 40mm thk, 100x100mm wide antique finished Midnight black, cut to shape as per design and detail with machine cut edges, fixed in CM 1:4, and 10mm wide recessed mortar joints, filled with polymer reinforced cementitious grout, including wastages, lead and lift etc., complete (Granite Supply - DIPL Scope)',
    unit: 'Sqm', rate: 1187, qty: 64.26,
  },
  {
    sl_no: 'NT Items-06e',
    description: 'Fixing of 40mm thk 600mm wide antique finished Midnight black as floor finish, fixed in CM 1:6, including recessed pointing, acid wash, lead and lift etc., complete (Granite Supply - DIPL Scope)',
    unit: 'Sqm', rate: 1187, qty: 7.06,
  },
  {
    sl_no: 'NT Items-06f',
    description: 'Fixing of 40mm thk 200mm wide antique finished Midnight BLACK as floor finish, fixed in CM 1:6, including recessed pointing, acid wash, lead and lift, etc., complete (Basic cost of the material considered @ Rs.320 / sqft.) (Granite Supply - DIPL Scope)',
    unit: 'Sqm', rate: 1187, qty: 2.16,
  },
  {
    sl_no: 'NT Items-07a',
    description: 'Supply and application of texture paint, of the approved pattern and finished with outdoor emulsion paint in ACE/APEX series of Asian paints make/any other approved make, including one primer coat and 2 final coloured coats, including all necessary lead and lift etc., complete',
    unit: 'Sqm', rate: 399, qty: 37.42,
  },
  {
    sl_no: 'NT Items-07b',
    description: 'Supply and application of internal enamel paint, with a primer coat and 2 finish coats in colour as per approved sample, including lead and lift etc., complete',
    unit: 'Sqm', rate: 132, qty: 70.18,
  },
  {
    sl_no: 'NT Items-08a',
    description: 'Supply and installation of aluminium doors, windows and ventilator with 40x65mm section as main frame and 25x50mm section as shutter. Clear glass of Saint Gobin 6mm thick, colour (RAL7010) Powder coating finish. Make: Aluminium Jindal Sections; Glass: 6mm thick Saint Gobin Clear glass. Rate including all required accessories, fixing, cleaning, sealant work, wastages, lead and lift etc Complete. - Door',
    unit: 'Sqm', rate: 5109, qty: 4.91,
  },
  {
    sl_no: 'NT Items-08b',
    description: 'Supply and installation of aluminium doors, windows and ventilator with 40x65mm section as main frame and 25x50mm section as shutter. Clear glass of Saint Gobin 6mm thick, colour (RAL7010) Powder coating finish. Make: Aluminium Jindal Sections; Glass: 6mm thick Saint Gobin Clear glass. Rate including all required accessories, fixing, cleaning, sealant work, wastages, lead and lift etc Complete. - Front Sliding Window',
    unit: 'Sqm', rate: 5109, qty: 8.57,
  },
  {
    sl_no: 'NT Items-08c',
    description: 'Supply and installation of aluminium doors, windows and ventilator with 40x65mm section as main frame and 25x50mm section as shutter. Clear glass of Saint Gobin 6mm thick, colour (RAL7010) Powder coating finish. Make: Aluminium Jindal Sections; Glass: 6mm thick Saint Gobin Clear glass. Rate including all required accessories, fixing, cleaning, sealant work, wastages, lead and lift etc Complete. - Ventilator V1 & V2',
    unit: 'Sqm', rate: 5369, qty: 2.48,
  },
  {
    sl_no: 'NT Items-09a',
    description: 'Supplying and applying Smartcare PU Magnum US High build elastomeric waterproofing coating which shall be pure, hydrophobic polyurethane, cold applied with spray/brush, with an elongation of 500% as per ASTM D 2370. System includes surface preparation, application of water based epoxy primer and applying SmartCare PU Magnum US in two coats to achieve a thickness of 1.5mm DFT at a coverage of 2.3kg per sqm as per ASTM C898. Supplying and applying protective geo textile fabric of 120 GSM over the entire membrane with proper overlaps.',
    unit: 'Sqm', rate: 1134, qty: 41.158,
  },
  {
    sl_no: 'NT Items-09b',
    description: 'For Horizontal Surface: Laying an average of 75mm thick M20 grade concrete screed',
    unit: 'Sqm', rate: 591, qty: 29.638,
  },
  {
    sl_no: 'NT Items-09c',
    description: 'For Vertical Surface: Laying 15mm thick polymeric waterproof plastering with CM 1:4 admixed with integral waterproofing compound at 0.2litre/bag of cement.',
    unit: 'Sqm', rate: 351, qty: 7.68,
  },
  {
    sl_no: 'NT Items-10',
    description: 'Providing and constructing 200mm thick Solid concrete block work in walls, piers and architectural features at all levels using approved Solid blocks in cement mortar 1:6 (M Sand) of strength 35kgs/cm2 including curing, steel scaffolding, steel staging, leads and lifts. Rate inclusive of cost of structural steel, anchor bolts etc., with all leads and lifts and as directed by Project Consultant/Engineer in charge.',
    unit: 'Sqm', rate: 1331, qty: 54.26756999999999,
  },
  {
    sl_no: 'NT Items-11',
    description: 'Prepare the surface and plaster all internal RCC/Masonry surface, walls, etc., in cement mortar 1:6, 15mm thick with M Sand, smooth finished to line and plumb at all levels rounding of corners wherever required complete with necessary scaffolding, curing etc., including lead and lifts and cost of necessary scaffolding, staging, curing, leads and lifts etc., complete, as per the directions of the Project Consultant/Engineer in charge.',
    unit: 'Sqm', rate: 351, qty: 108.53513999999998,
  },
  {
    sl_no: 'NT Items-12',
    description: 'Providing & Laying of Compound Wall Concrete - M30 Grade',
    unit: 'Cum', rate: 7750, qty: 13.719247499999863,
  },
  {
    sl_no: 'NT Items-13',
    description: 'Providing bituminous Tack coat with bituminous emulsion as per IS:8887 all complete as per Technical Specifications Clause 503 cleaned with mechanical broom on granular surface @0.25 to 0.30 Kg/sqm',
    unit: 'Sqm', rate: 33, qty: 691.006,
  },
  {
    sl_no: 'NT Items-14',
    description: 'Providing and laying Bituminous concrete 50mm Loose thickness using crushed stone aggregates as per table 500-18, premixed with bituminous binder in hot mix plant, transported to site in tipper to paver, laid over a previously prepared surface with paver finisher to required grade, level, alignment, rolling with smooth wheeled tandem roller 6-8 tonnes as per clauses 501.6 and 501.7 to achieve desired compaction. Rate includes all materials, labour, hire charges of machinery, lead lifts, loading, unloading, stacking, transporting etc., excluding cost of primer/Tack coat. Complete as per MOST&H specification 509 using grading 1 with 5.5%VG-30 Bitumen and of 60/70 grade',
    unit: 'Sqm', rate: 420, qty: 691.006,
  },
  {
    sl_no: 'NT Items-15',
    description: 'Shifting the MS Poles from Site to Meridian and Placing the Poles in the Designated Locations',
    unit: 'Nos', rate: 970, qty: 36,
  },
  {
    sl_no: 'NT Items-16',
    description: 'Earth Backfilling with bought out earth in foundations and the area wherever specified with approved good quality filling material in plinths, area development etc., wherever specified in layers of not exceeding 300mm thick including breaking clods, storing, transportation, watering, compacting each layer with vibratory compactor/roller and at unaccessible places with wooden/steel rammers to achieve 90 to 95% proctor density at optimum moisture content, cost shall include conveyance of all materials, labour, machinery etc. complete (mode of measurement - Final consolidated filling area with R.Ls only will be consolidated)',
    unit: 'Cum', rate: 180, qty: 0,
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

  // Find project
  const projR = await q(
    `SELECT id, name FROM projects WHERE company_id = $1
     AND (LOWER(name) LIKE '%yelahanka%' OR LOWER(name) LIKE '%divyasree%' OR LOWER(name) LIKE '%quiet%' OR LOWER(name) LIKE '%residential%')
     ORDER BY created_at DESC LIMIT 5`,
    [company_id]
  );
  if (!projR.rows.length) {
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

  console.log('\n✅ Done! WDIRY0194 Variation Statement uploaded successfully.');
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
