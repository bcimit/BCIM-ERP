#!/usr/bin/env node
/**
 * insert-yelahanka-mrs-002-006-013-022fix.js
 *
 * Inserts MR-002, 003, 004, 005, 006, 013 (new) into WDIRY0151.
 * Also CORRECTS MR-022 (wrong date/items from Excel — replaces with physical PDF data).
 *
 *   node scripts/insert-yelahanka-mrs-002-006-013-022fix.js            # DRY RUN
 *   railway run node scripts/insert-yelahanka-mrs-002-006-013-022fix.js --create
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
const DEPT = 'Projects';

// ── MR-022 corrected data (will replace existing wrong entry) ─────────────────
const MR022_CORRECT = {
  serial:   'BCIM-TQS-BLR-MR-022',
  date:     '2026-02-09',   // Physical PDF: 9/2/2026 (DD/MM/YYYY)
  required: '2026-02-16',
  narration: 'Safety PPE — safety vests, shoes (sizes 7-11), dust mask, gloves, ear plugs. Physical MR BCIM-TQS-BLR-MR-022 dated 09-02-2026.',
  items: [
    { material: 'Green Safety Vests',         qty: 20, unit: 'nos'  },
    { material: 'Blue Safety Vests',          qty: 10, unit: 'nos'  },
    { material: 'Safety Shoes size 7',        qty: 10, unit: 'nos'  },
    { material: 'Safety Shoes size 8',        qty: 10, unit: 'nos'  },
    { material: 'Safety Shoes size 9',        qty: 10, unit: 'nos'  },
    { material: 'Safety Shoes size 10',       qty: 10, unit: 'nos'  },
    { material: 'Safety Shoes size 11',       qty: 10, unit: 'nos'  },
    { material: 'Dust Mask',                  qty: 1,  unit: 'bnd'  },
    { material: 'Ear Plug',                   qty: 30, unit: 'nos'  },
    { material: 'Cut Resistant Gloves',       qty: 30, unit: 'nos'  },
    { material: 'Shoulder Pad',               qty: 30, unit: 'nos'  },
    { material: 'Electrical Gloves 1000V',    qty: 2,  unit: 'nos'  },
    { material: 'Cotton Hand Gloves',         qty: 60, unit: 'pair' },
  ],
};

// ── New MRs to insert ─────────────────────────────────────────────────────────
const MRS = [

  // ── MR-002 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-002',
    date:     '2025-12-16',
    required: '2025-12-23',
    narration: 'Scaffolding materials — MS pipe, spigot pins, swivel clamps, aluminium leaders, vibrator, hessian cloth. Physical MR BCIM-TQS-BLR-MR-002 dated 16-12-2025.',
    items: [
      { material: 'MS Pipe 20 ft',           qty: 250, unit: 'nos' },
      { material: 'Spigot Pins',             qty: 300, unit: 'nos' },
      { material: 'Swivel Clamps',           qty: 500, unit: 'nos' },
      { material: 'Aluminium Leader 4 mtr',  qty: 5,   unit: 'nos' },
      { material: 'Aluminium Leader 3 mtr',  qty: 5,   unit: 'nos' },
      { material: 'Electrical Vibrator',     qty: 1,   unit: 'nos' },
      { material: 'Hessian Cloth',           qty: 300, unit: 'rmt' },
    ],
  },

  // ── MR-003 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-003',
    date:     '2025-12-18',
    required: '2025-12-20',
    narration: 'Road work and storm water trench work — excavation, GSB, wet mix macadam, DBM, asphalt, PCC, RCC, shuttering, steel. Physical MR BCIM-TQS-BLR-MR-003 dated 18-12-2025.',
    items: [
      { material: 'Excavation Work',                            qty: 571.35, unit: 'cum' },
      { material: 'GSB (Granular Sub Base) 25mm TK',           qty: 120.00, unit: 'cum' },
      { material: 'Wet Mix Macadam ~150mm TK',                 qty: 72.00,  unit: 'cum' },
      { material: 'DBM (Dense Bitumen Macadam) 75mm TK',       qty: 480.00, unit: 'cum' },
      { material: 'Asphalt Concrete 40mm TK',                  qty: 480.00, unit: 'cum' },
      { material: 'PCC M10 1:3:6',                             qty: 9.45,   unit: 'cum' },
      { material: 'RCC M25',                                    qty: 52.20,  unit: 'cum' },
      { material: 'Shuttering Work',                            qty: 409.29, unit: 'sqm' },
      { material: 'Steel Work',                                 qty: 3.65,   unit: 'mt'  },
    ],
  },

  // ── MR-004 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-004',
    date:     '2025-12-18',
    required: '2025-12-18',
    narration: 'Concrete and waterproofing — M10, M30, Penetron admix, Penibar SW45. Physical MR BCIM-TQS-BLR-MR-004 dated 18-12-2025.',
    items: [
      { material: 'Concrete M10',    qty: 160,  unit: 'cum', remarks: 'SCP — req 18-12-2025' },
      { material: 'Concrete M30',    qty: 1850, unit: 'cum', remarks: 'SCP — req 20-12-2025' },
      { material: 'Penetron Admix',  qty: 1850, unit: 'cum', remarks: 'CSW — req 18-12-2025' },
      { material: 'Penibar SW45',    qty: 1000, unit: 'rmt', remarks: 'CSW — req 20-12-2025' },
    ],
  },

  // ── MR-005 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-005',
    date:     '2025-12-29',
    required: '2026-01-05',
    narration: 'Tools, consumables, PPE and equipment. Physical MR BCIM-TQS-BLR-MR-005 dated 29-12-2025.',
    items: [
      { material: 'Hand Gloves (Cotton)',                qty: 50,  unit: 'pair' },
      { material: 'Weight Machine 50kg',                 qty: 1,   unit: 'nos'  },
      { material: 'Rubber Gloves Mason',                 qty: 25,  unit: 'pair' },
      { material: 'Concrete Grinding Wheel',             qty: 25,  unit: 'nos'  },
      { material: 'Chisel',                              qty: 5,   unit: 'nos'  },
      { material: 'MS Binding Wire',                     qty: 50,  unit: 'kg'   },
      { material: 'Hessian Cloth',                       qty: 300, unit: 'mtr'  },
      { material: 'SS Ply Drill Bit 5mm',                qty: 25,  unit: 'nos'  },
      { material: 'Fosroc Conbextra GP2',                qty: 5,   unit: 'bags' },
      { material: 'Concrete Nail 1.5 inch',              qty: 10,  unit: 'nos'  },
      { material: 'Sponge (Mason)',                      qty: 50,  unit: 'nos'  },
      { material: 'Mason Pan',                           qty: 10,  unit: 'nos'  },
      { material: 'Grinding Machine 4 inch',             qty: 1,   unit: 'nos', remarks: 'Dewalt' },
      { material: '16 AMP Male and Female Socket 3 Pin', qty: 10,  unit: 'nos'  },
      { material: '2 Core 1.0 sqmm Cable',               qty: 200, unit: 'mtr'  },
      { material: '32 AMP Male and Female Socket',       qty: 5,   unit: 'nos'  },
      { material: 'Halogen Light 200 Watts',             qty: 5,   unit: 'nos'  },
      { material: 'Hammer 5 LB',                         qty: 5,   unit: 'nos'  },
      { material: 'Ply Cutting Machine',                 qty: 1,   unit: 'nos', remarks: 'Dewalt' },
      { material: 'Vibrator Machine',                    qty: 1,   unit: 'nos'  },
      { material: 'Ply Saw Cutting Wheel 7 inch',        qty: 25,  unit: 'nos'  },
      { material: 'Concrete Drill Bit 10mm',             qty: 10,  unit: 'nos', remarks: 'Dewalt' },
      { material: 'Ply Drilling Machine',                qty: 1,   unit: 'nos'  },
      { material: 'Nito Bond EP',                        qty: 0.5, unit: 'ltr'  },
      { material: 'PVC Tie Rod Cone',                    qty: 300, unit: 'nos'  },
      { material: 'Runner 2x3 inch',                     qty: 50,  unit: 'cft'  },
    ],
  },

  // ── MR-006 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-006',
    date:     '2026-01-02',
    required: '2026-01-05',
    narration: 'Shuttering materials for STP. Physical MR BCIM-TQS-BLR-MR-006 dated 02-01-2026.',
    items: [
      { material: '12mm Plywood',          qty: 150, unit: 'nos', remarks: 'STP shuttering work — req 05-01-2026' },
      { material: 'Wing Nut',              qty: 150, unit: 'nos', remarks: 'req 06-01-2026' },
      { material: 'Washer Plate',          qty: 150, unit: 'nos', remarks: 'req 07-01-2026' },
      { material: 'Wooden Runner 3x4 inch',qty: 150, unit: 'cft', remarks: 'req 08-01-2026' },
      { material: 'Tie Rod 3 mtr',         qty: 35,  unit: 'nos', remarks: 'req 09-01-2026' },
      { material: 'PVC Pipe 20mm 2 mtr',   qty: 300, unit: 'nos', remarks: 'req 10-01-2026' },
    ],
  },

  // ── MR-013 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-013',
    date:     '2026-01-23',
    required: '2026-01-30',
    narration: 'Concrete M10 and M35 supply (as per received new RW drawing). Physical MR BCIM-TQS-BLR-MR-013 dated 23-01-2026.',
    items: [
      { material: 'Concrete M10', qty: 150, unit: 'cum', remarks: 'SCP' },
      { material: 'Concrete M35', qty: 50,  unit: 'cum', remarks: 'SCP — as per received new RW dwg' },
    ],
  },

];

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  const client = await pool.connect();
  try {
    const projRes = await client.query(
      `SELECT id, name, project_code, company_id FROM projects
       WHERE is_active = true AND LOWER(project_code) = 'wdiry0151'`
    );
    if (!projRes.rows.length) { console.error('❌ Project WDIRY0151 not found.'); process.exit(1); }
    const proj = projRes.rows[0];
    console.log(`\nTarget project: "${proj.name}"  (${proj.id})\n`);

    const userRes = await client.query(
      `SELECT id, name FROM users
       WHERE company_id = $1 AND is_active = true AND role IN ('super_admin','admin')
       ORDER BY created_at ASC LIMIT 1`,
      [proj.company_id]
    );
    if (!userRes.rows.length) { console.error('❌ No admin user found.'); process.exit(1); }
    const raisedBy = userRes.rows[0];
    console.log(`Raised by: ${raisedBy.name}\n`);

    // ── Check MR-022 existing ──────────────────────────────────────────────────
    const mr022Existing = await client.query(
      `SELECT id, created_at FROM material_requisitions WHERE serial_no_formatted = $1`,
      [MR022_CORRECT.serial]
    );
    const mr022Exists = mr022Existing.rows.length > 0;
    console.log(`MR-022 in DB: ${mr022Exists ? `YES (id: ${mr022Existing.rows[0].id}) — will DELETE and re-insert with correct data` : 'NO — will insert fresh'}`);
    console.log();

    // ── Check new MRs ─────────────────────────────────────────────────────────
    const skipped = [], toInsert = [];
    for (const mr of MRS) {
      const dup = await client.query(
        `SELECT id FROM material_requisitions WHERE serial_no_formatted = $1`, [mr.serial]
      );
      if (dup.rows.length) skipped.push(mr.serial);
      else toInsert.push(mr);
    }

    if (skipped.length) console.log(`⚠️  Already exist (will skip): ${skipped.join(', ')}\n`);

    console.log('New MRs to insert:');
    toInsert.forEach(mr => console.log(`  ${mr.serial}  ${mr.date}  (${mr.items.length} items)`));
    console.log(`  ${MR022_CORRECT.serial}  ${MR022_CORRECT.date}  (${MR022_CORRECT.items.length} items)  [CORRECTION]`);
    const totalMrs   = toInsert.length + 1;
    const totalItems = toInsert.reduce((s, m) => s + m.items.length, 0) + MR022_CORRECT.items.length;
    console.log(`\nTotal: ${totalMrs} MRs, ${totalItems} line items`);

    if (!DO_CREATE) {
      console.log('\n(DRY RUN — nothing inserted. Re-run with --create to commit.)\n');
      return;
    }

    await client.query('BEGIN');

    // ── Fix MR-022 ─────────────────────────────────────────────────────────────
    if (mr022Exists) {
      const oldId = mr022Existing.rows[0].id;
      await client.query(`DELETE FROM mrs_items WHERE mrs_id = $1`, [oldId]);
      await client.query(`DELETE FROM material_requisitions WHERE id = $1`, [oldId]);
      console.log(`  🔄 Deleted old MR-022 (${oldId})`);
    }
    const mr022Res = await client.query(
      `INSERT INTO material_requisitions (
         project_id, mrs_number, serial_no_formatted, department,
         head_office_project_name, required_by, priority, remarks,
         raised_by, status, created_at
       ) VALUES ($1,$2,$3,$4,$5,$6,'medium',$7,$8,'pending',$9) RETURNING id`,
      [proj.id, MR022_CORRECT.serial, MR022_CORRECT.serial, DEPT, proj.name,
       MR022_CORRECT.required, MR022_CORRECT.narration, raisedBy.id, MR022_CORRECT.date]
    );
    for (let i = 0; i < MR022_CORRECT.items.length; i++) {
      const { material, qty, unit, remarks } = MR022_CORRECT.items[i];
      await client.query(
        `INSERT INTO mrs_items (mrs_id, material_name, quantity, unit, sort_order, remarks)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [mr022Res.rows[0].id, material, qty, unit, i + 1, remarks || null]
      );
    }
    console.log(`  ✅ ${MR022_CORRECT.serial}  CORRECTED  (${MR022_CORRECT.items.length} items, date: ${MR022_CORRECT.date})`);

    // ── Insert new MRs ─────────────────────────────────────────────────────────
    for (const mr of toInsert) {
      const mrRes = await client.query(
        `INSERT INTO material_requisitions (
           project_id, mrs_number, serial_no_formatted, department,
           head_office_project_name, required_by, priority, remarks,
           raised_by, status, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,'medium',$7,$8,'pending',$9) RETURNING id`,
        [proj.id, mr.serial, mr.serial, DEPT, proj.name,
         mr.required, mr.narration, raisedBy.id, mr.date]
      );
      const mrId = mrRes.rows[0].id;
      for (let i = 0; i < mr.items.length; i++) {
        const { material, qty, unit, remarks } = mr.items[i];
        await client.query(
          `INSERT INTO mrs_items (mrs_id, material_name, quantity, unit, sort_order, remarks)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [mrId, material, qty, unit, i + 1, remarks || null]
        );
      }
      console.log(`  ✅ ${mr.serial}  (${mr.items.length} items)`);
    }

    await client.query('COMMIT');
    console.log(`\n✅ Done — ${totalMrs} MRs processed, ${totalItems} line items total.`);
    if (skipped.length) console.log(`   Skipped (already existed): ${skipped.join(', ')}`);
    console.log();

  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
