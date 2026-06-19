#!/usr/bin/env node
/**
 * insert-yelahanka-mr034.js
 *
 * Inserts MR-034 (tools, consumables, spare parts — 93 items) into WDIRY0151.
 * Serial: BCIM-TQS-BLR-MR-034, Date: 13-03-2026, Required: 16-03-2026
 *
 *   node scripts/insert-yelahanka-mr034.js            # DRY RUN
 *   railway run node scripts/insert-yelahanka-mr034.js --create
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host:     process.env.DB_HOST     || 'localhost',
        port:     parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME     || 'construct_erp',
        user:     process.env.DB_USER     || 'postgres',
        password: process.env.DB_PASSWORD || '',
      }
);

const DO_CREATE = process.argv.includes('--create');

const SERIAL    = 'BCIM-TQS-BLR-MR-034';
const MR_DATE   = '2026-03-13';
const REQ_DATE  = '2026-03-16';
const DEPT      = 'Projects';
const NARRATION = 'Tools, consumables, spare parts (grinding machines, wire nails, safety items, electrical). Physical MR BCIM-TQS-BLR-MR-034 dated 13-03-2026.';

const ITEMS = [
  { material: 'Wire Nails 4 Inch',                                                     qty: 50,   unit: 'kg'  },
  { material: 'Wire Nails 2 Inch',                                                     qty: 50,   unit: 'kg'  },
  { material: 'Wire Nails 2.5 Inch',                                                   qty: 50,   unit: 'kg'  },
  { material: 'Wire Nails 1.5 Inch',                                                   qty: 50,   unit: 'kg'  },
  { material: 'Thermocol Sheet 1000*600 (25mm)',                                        qty: 25,   unit: 'nos' },
  { material: 'Life Line Rope 16MM (Polypropylene rope)',                              qty: 200,  unit: 'rmt' },
  { material: 'GI Binding Wire',                                                       qty: 500,  unit: 'kg'  },
  { material: 'Shuttering Oil',                                                         qty: 200,  unit: 'ltr' },
  { material: 'Ply Drill Bit 20MM',                                                    qty: 15,   unit: 'nos' },
  { material: 'Ply Drill Bit 25MM',                                                    qty: 10,   unit: 'nos' },
  { material: 'Tie Rod 3 MTR',                                                         qty: 50,   unit: 'nos' },
  { material: 'Tube Light 20W',                                                        qty: 25,   unit: 'nos' },
  { material: 'Measuring Tape 5 MTR',                                                  qty: 5,    unit: 'nos' },
  { material: 'Steel Cutting Blade 7 inch',                                            qty: 25,   unit: 'nos' },
  { material: 'Steel Cutting Blade 5 inch',                                            qty: 25,   unit: 'nos' },
  { material: 'Steel Cutting Blade 14 inch',                                           qty: 25,   unit: 'nos' },
  { material: 'MYK Armix Cure PB White (20 KG)',                                      qty: 200,  unit: 'ltr' },
  { material: 'PVC Pipe 25MM',                                                         qty: 150,  unit: 'nos' },
  { material: 'Concrete Cutting Blade 5 inch',                                         qty: 25,   unit: 'nos' },
  { material: 'PVC Cover Block 40MM',                                                  qty: 1000, unit: 'nos' },
  { material: 'PVC Cover Block 75MM',                                                  qty: 500,  unit: 'nos' },
  { material: 'Industrial Plug Top 3 Pin Male & Female',                              qty: 20,   unit: 'nos' },
  { material: 'Welding Machine (Single Phase with Welding Set)',                       qty: 1,    unit: 'nos' },
  { material: 'Ply Drill Machine',                                                     qty: 1,    unit: 'nos' },
  { material: 'Black Snake Catcher Stick FPSC-66 Falcon 6 Feet Yellow & Black',       qty: 2,    unit: 'nos' },
  { material: 'Carbon Brush — 5 inch DeWalt Grinding Machine Model No 4235',          qty: 10,   unit: 'nos' },
  { material: 'Field Coil — 5 inch DeWalt Grinding Machine Model No 4235',            qty: 5,    unit: 'nos' },
  { material: 'Armature — 5 inch DeWalt Grinding Machine Model No 4235',              qty: 2,    unit: 'nos' },
  { material: 'On/Off Switch — 5 inch DeWalt Grinding Machine Model No 4235',         qty: 5,    unit: 'nos' },
  { material: 'Bearing — 5 inch DeWalt Grinding Machine Model No 4235',               qty: 10,   unit: 'nos' },
  { material: 'Carbon Brush — 5 inch DeWalt Grinding Machine Model No 4215',          qty: 10,   unit: 'nos' },
  { material: 'Field Coil — 5 inch DeWalt Grinding Machine Model No 4215',            qty: 5,    unit: 'nos' },
  { material: 'Armature — 5 inch DeWalt Grinding Machine Model No 4215',              qty: 2,    unit: 'nos' },
  { material: 'Bearing — 5 inch DeWalt Grinding Machine Model No 4215',               qty: 10,   unit: 'nos' },
  { material: 'On/Off Switch — 5 inch DeWalt Grinding Machine Model No 4215',         qty: 5,    unit: 'nos' },
  { material: 'Field Coil — 7 inch DeWalt Grinding Machine Model No 493',             qty: 5,    unit: 'nos' },
  { material: 'Armature — 7 inch DeWalt Grinding Machine Model No 493',               qty: 2,    unit: 'nos' },
  { material: 'On/Off Switch — 7 inch DeWalt Grinding Machine Model No 493',          qty: 5,    unit: 'nos' },
  { material: 'Bearing — 7 inch DeWalt Grinding Machine Model No 493',                qty: 5,    unit: 'nos' },
  { material: 'Carbon Brush — 7 inch DeWalt Grinding Machine Model No 493',           qty: 10,   unit: 'nos' },
  { material: 'Carbon Brush — Ply Cutting Machine 7 inch Bosch GKS 190',              qty: 10,   unit: 'nos' },
  { material: 'Field Coil — Ply Cutting Machine 7 inch Bosch GKS 190',                qty: 5,    unit: 'nos' },
  { material: 'Armature — Ply Cutting Machine 7 inch Bosch GKS 190',                  qty: 2,    unit: 'nos' },
  { material: 'On/Off Switch — Ply Cutting Machine 7 inch Bosch GKS 190',             qty: 5,    unit: 'nos' },
  { material: 'Bearing — Ply Cutting Machine 7 inch Bosch GKS 190',                   qty: 5,    unit: 'nos' },
  { material: 'Carbon Brush — Ply Drilling Machine Bosch GSB 16 RE',                  qty: 5,    unit: 'nos' },
  { material: 'Field Coil — Ply Drilling Machine Bosch GSB 16 RE',                    qty: 5,    unit: 'nos' },
  { material: 'Armature — Ply Drilling Machine Bosch GSB 16 RE',                      qty: 2,    unit: 'nos' },
  { material: 'On/Off Switch — Ply Drilling Machine Bosch GSB 16 RE',                 qty: 5,    unit: 'nos' },
  { material: 'Bearing — Ply Drilling Machine Bosch GSB 16 RE',                       qty: 5,    unit: 'nos' },
  { material: 'Carbon Brush — Concrete Drilling Machine Bosch GBH 4.32 DFR',         qty: 5,    unit: 'nos' },
  { material: 'Field Coil — Concrete Drilling Machine Bosch GBH 4.32 DFR',           qty: 5,    unit: 'nos' },
  { material: 'Armature — Concrete Drilling Machine Bosch GBH 4.32 DFR',             qty: 2,    unit: 'nos' },
  { material: 'On/Off Switch — Concrete Drilling Machine Bosch GBH 4.32 DFR',        qty: 5,    unit: 'nos' },
  { material: 'Bearing — Concrete Drilling Machine Bosch GBH 4.32 DFR',              qty: 5,    unit: 'nos' },
  { material: 'Carbon Brush — Chipping Machine Dong Cheng DZG-10',                   qty: 5,    unit: 'nos' },
  { material: 'Field Coil — Chipping Machine Dong Cheng DZG-10',                     qty: 5,    unit: 'nos' },
  { material: 'Armature — Chipping Machine Dong Cheng DZG-10',                       qty: 2,    unit: 'nos' },
  { material: 'On/Off Switch — Chipping Machine Dong Cheng DZG-10',                  qty: 5,    unit: 'nos' },
  { material: 'Bearing — Chipping Machine Dong Cheng DZG-10',                        qty: 5,    unit: 'nos' },
  { material: 'Carbon Brush — Blower Machine Bosch GBL 82-270',                      qty: 5,    unit: 'nos' },
  { material: 'Field Coil — Blower Machine Bosch GBL 82-270',                        qty: 5,    unit: 'nos' },
  { material: 'Armature — Blower Machine Bosch GBL 82-270',                          qty: 2,    unit: 'nos' },
  { material: 'On/Off Switch — Blower Machine Bosch GBL 82-270',                     qty: 5,    unit: 'nos' },
  { material: 'Bearing — Blower Machine Bosch GBL 82-270',                           qty: 2,    unit: 'nos' },
  { material: 'Carbon Brush — Cut Off Machine 14 inch Bosch GCO 14.24',              qty: 5,    unit: 'nos' },
  { material: 'Armature — Cut Off Machine 14 inch Bosch GCO 14.24',                  qty: 5,    unit: 'nos' },
  { material: 'Field Coil — Cut Off Machine 14 inch Bosch GCO 14.24',                qty: 5,    unit: 'nos' },
  { material: 'On/Off Switch — Cut Off Machine 14 inch Bosch GCO 14.24',             qty: 5,    unit: 'nos' },
  { material: 'Bearing — Cut Off Machine 14 inch Bosch GCO 14.24',                   qty: 5,    unit: 'nos' },
  { material: 'Carbon Brush — Chipping Machine Bosch GSH 11E',                       qty: 5,    unit: 'nos' },
  { material: 'Armature — Chipping Machine Bosch GSH 11E',                           qty: 2,    unit: 'nos' },
  { material: 'Field Coil — Chipping Machine Bosch GSH 11E',                         qty: 5,    unit: 'nos' },
  { material: 'On/Off Switch — Chipping Machine Bosch GSH 11E',                      qty: 5,    unit: 'nos' },
  { material: 'Bearing — Chipping Machine Bosch GSH 11E',                            qty: 5,    unit: 'nos' },
  { material: 'Carbon Brush — Chipping Machine Bosch GSH 5HX',                       qty: 5,    unit: 'nos' },
  { material: 'Armature — Chipping Machine Bosch GSH 5HX',                           qty: 2,    unit: 'nos' },
  { material: 'Field Coil — Chipping Machine Bosch GSH 5HX',                         qty: 5,    unit: 'nos' },
  { material: 'On/Off Switch — Chipping Machine Bosch GSH 5HX',                      qty: 5,    unit: 'nos' },
  { material: 'Bearing — Chipping Machine Bosch GSH 5HX',                            qty: 5,    unit: 'nos' },
  { material: 'Steel Grinding Wheel 5 inch',                                          qty: 10,   unit: 'nos' },
  { material: 'Grinding Machine DeWalt 4 inch',                                       qty: 2,    unit: 'nos' },
  { material: 'Ply Drilling Machine',                                                  qty: 2,    unit: 'nos' },
  { material: 'Concrete Grinding Wheel 4 inch',                                       qty: 10,   unit: 'nos' },
  { material: 'Steel Cutting Wheel 4 inch',                                           qty: 20,   unit: 'nos' },
  { material: 'Concrete Cutting Wheel 4 inch',                                        qty: 10,   unit: 'nos' },
  { material: '16 sqmm 4 Core Aluminium Armoured Cable',                             qty: 100,  unit: 'mtr' },
  { material: 'Gland 28MM',                                                           qty: 2,    unit: 'nos' },
  { material: 'Cable Lugs 1.5mm to 16mm (Hole type and pin type each)',              qty: 25,   unit: 'nos' },
  { material: 'Crimping Tool',                                                         qty: 1,    unit: 'set' },
  { material: 'Distribution Box 12 Model MCB Box 3 Phase',                            qty: 1,    unit: 'nos' },
  { material: 'Single Cot with Bed',                                                  qty: 5,    unit: 'nos' },
  { material: 'Standing Fan',                                                          qty: 3,    unit: 'nos' },
];

(async () => {
  const client = await pool.connect();
  try {
    const projRes = await client.query(
      `SELECT id, name, project_code, company_id FROM projects
       WHERE is_active = true AND LOWER(project_code) = 'wdiry0151'`
    );
    if (!projRes.rows.length) { console.error('❌ Project WDIRY0151 not found.'); process.exit(1); }
    const proj = projRes.rows[0];
    console.log(`\nTarget project: "${proj.name}"  (${proj.id})`);

    const dup = await client.query(
      `SELECT id FROM material_requisitions WHERE serial_no_formatted = $1`, [SERIAL]
    );
    if (dup.rows.length) {
      console.log(`⚠️  MR "${SERIAL}" already exists — aborting.`);
      process.exit(dup.rows.length ? 1 : 0);
    }

    const userRes = await client.query(
      `SELECT id, name FROM users
       WHERE company_id = $1 AND is_active = true AND role IN ('super_admin','admin')
       ORDER BY created_at ASC LIMIT 1`,
      [proj.company_id]
    );
    if (!userRes.rows.length) { console.error('❌ No admin user found.'); process.exit(1); }
    const raisedBy = userRes.rows[0];
    console.log(`Raised by: ${raisedBy.name}`);

    console.log(`\nMR: ${SERIAL}  date: ${MR_DATE}  required: ${REQ_DATE}`);
    console.log(`Items: ${ITEMS.length}`);
    ITEMS.forEach((it, i) => console.log(`  ${i + 1}. ${it.material}  ${it.qty} ${it.unit}`));

    if (!DO_CREATE) {
      console.log('\n(DRY RUN — nothing inserted. Re-run with --create to commit.)\n');
      return;
    }

    await client.query('BEGIN');
    const mrRes = await client.query(
      `INSERT INTO material_requisitions (
         project_id, mrs_number, serial_no_formatted, department,
         head_office_project_name, required_by, priority, remarks,
         raised_by, status, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'medium',$7,$8,'pending',$9) RETURNING id`,
      [proj.id, SERIAL, SERIAL, DEPT, proj.name, REQ_DATE, NARRATION, raisedBy.id, MR_DATE]
    );
    const mrId = mrRes.rows[0].id;

    for (let i = 0; i < ITEMS.length; i++) {
      const { material, qty, unit } = ITEMS[i];
      await client.query(
        `INSERT INTO mrs_items (mrs_id, material_name, quantity, unit, sort_order)
         VALUES ($1,$2,$3,$4,$5)`,
        [mrId, material, qty, unit, i + 1]
      );
    }
    await client.query('COMMIT');

    console.log(`\n✅ Inserted ${SERIAL}  (id: ${mrId})`);
    console.log(`   ${ITEMS.length} line items, status: pending\n`);
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
