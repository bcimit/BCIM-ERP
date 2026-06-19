#!/usr/bin/env node
/**
 * insert-yelahanka-mrs-035-047.js
 *
 * Inserts MR-035, 037, 038, 040, 041, 042, 046, 047 into WDIRY0151.
 * Data sourced from Excel: "Materials request formet.xlsx"
 *
 *   node scripts/insert-yelahanka-mrs-035-047.js            # DRY RUN
 *   railway run node scripts/insert-yelahanka-mrs-035-047.js --create
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

const MRS = [

  // ── MR-035 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-035',
    date:     '2026-03-14',
    required: '2026-03-20',
    narration: 'Waterproofing work for security slab cabin. Physical MR BCIM-TQS-BLR-MR-035 dated 14-03-2026.',
    items: [
      { material: 'WATER PROOFING WORK', qty: 40, unit: 'SQM', remarks: 'For Security Slab Cabin' },
    ],
  },

  // ── MR-037 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-037',
    date:     '2026-03-18',
    required: '2026-03-25',
    narration: 'M Sand and P Sand for paver block laying and security cabin plastering. Physical MR BCIM-TQS-BLR-MR-037 dated 18-03-2026.',
    items: [
      { material: 'M SAND', qty: 29.31, unit: 'MT', remarks: 'For paver block laying work in front of Divya sree Site Office' },
      { material: 'P SAND',  qty: 23.08, unit: 'MT', remarks: 'For Security Cabin plastering and Retaining wall finishing work' },
    ],
  },

  // ── MR-038 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-038',
    date:     '2026-03-25',
    required: '2026-04-01',
    narration: 'IT licenses — Microsoft 365 and CISCO Cloud Email Security. Physical MR BCIM-TQS-BLR-MR-038 dated 25-03-2026.',
    items: [
      {
        material: 'Microsoft 365 Business Basic (formerly Office 365 Business Essentials) - MS Office Online, Exchange Online 50GB, SharePoint, OneDrive 1TB, Teams - 1 year',
        qty: 3, unit: "NO'S",
      },
      {
        material: 'Microsoft 365 Business Standard - MS Office Offline, Exchange Online 50GB, SharePoint, OneDrive 1TB, Teams - 1 year',
        qty: 13, unit: "NO'S",
      },
      {
        material: 'CISCO Cloud Email Security with Advanced Threat Protection (ATP) - Malware Scanning, Forged Email Detection, Malicious URL Scanning, BEC Protection, Zero Hour, Anti-Malware, Anti-Spam',
        qty: 16, unit: "NO'S",
      },
    ],
  },

  // ── MR-040 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-040',
    date:     '2026-03-25',
    required: '2026-04-01',
    narration: 'AutoCAD LT 2026 annual subscription. Physical MR BCIM-TQS-BLR-MR-040 dated 25-03-2026.',
    items: [
      { material: 'Auto CAD LT 2026 Commercial New Single-User ELD Annual Subscription', qty: 4, unit: "NO'S" },
    ],
  },

  // ── MR-041 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-041',
    date:     '2026-03-25',
    required: '2026-04-01',
    narration: 'Desktop computers procurement. Physical MR BCIM-TQS-BLR-MR-041 dated 25-03-2026.',
    items: [
      { material: 'Desktop', qty: 5, unit: "NO'S" },
    ],
  },

  // ── MR-042 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-042',
    date:     '2026-04-15',
    required: '2026-05-04',
    narration: 'Work orders for security cabin finishes, entrance road granite, shuttering, steel, block/plastering work, labour charges, and machinery. Physical MR BCIM-TQS-BLR-MR-042 dated 15-04-2026.',
    items: [
      { material: 'Window Doors work - WO',                                                            qty: 4.914,  unit: 'Sqm',   remarks: 'For security cabin; req 04-05-2026' },
      { material: 'Front Sliding window work - WO',                                                    qty: 8.568,  unit: 'Sqm',   remarks: 'For security cabin; req 04-05-2026' },
      { material: 'Ventelator V1 & V2 work - WO',                                                     qty: 2.483,  unit: 'Sqm',   remarks: 'For security cabin; req 04-05-2026' },
      { material: 'Granite Stone (20mm thk. Antique finished Jet Black grey granite stone) work - WO', qty: 17.41,  unit: 'Sqm',   remarks: 'For security cabin; req 04-05-2026' },
      { material: 'Texture paint work - WO',                                                           qty: 37.418, unit: 'Sqm',   remarks: 'For security cabin; req 04-10-2026' },
      { material: 'Internal enamel paint work - WO',                                                   qty: 37.418, unit: 'Sqm',   remarks: 'For security cabin; req 04-10-2026' },
      { material: 'Artificial turf work - WO',                                                         qty: 33.47,  unit: 'Sqm',   remarks: 'For security cabin; req 04-10-2026' },
      { material: 'Exposed brick tiles cladding work - WO',                                            qty: 34.084, unit: 'Sqm',   remarks: 'For security cabin; req 04-10-2026' },
      { material: 'Granite Stone (Fixing of 40mm thk, 100*100mm wide antique finished Midnight black) work - WO', qty: 55,    unit: 'Sqm',   remarks: 'For entrance road granite work; req 04-06-2026' },
      { material: 'Granite Stone (Fixing of 40mm thk 600mm wide antique finsihed Midnight black) work - WO',      qty: 12.017, unit: 'Sqm',  remarks: 'For entrance road granite work; req 04-06-2026' },
      { material: 'Granite Stone (40mm thk 200mm wide antique finsihed Midnight BLACK) work - WO',    qty: 4.992,  unit: 'Sqm',   remarks: 'For entrance road granite work; req 04-06-2026' },
      { material: 'Shuttering work - WO',                                                              qty: 1480,   unit: 'SQM',   remarks: 'For STP+RW+UG sump RCC work; req 04-10-2026' },
      { material: 'Steel work - WO',                                                                   qty: 45,     unit: 'MT',    remarks: 'req 15-04-2026' },
      { material: 'Block work (200 mm)',                                                                qty: 75,     unit: 'SQM',   remarks: 'For Security cabin work; req 04-05-2026' },
      { material: 'plasting work',                                                                     qty: 150,    unit: 'SQM',   remarks: 'req 04-05-2026' },
      { material: 'Labour charges for Carpenter / Fitter / Mason 8 Hours per day',                     qty: 30,     unit: 'days',  remarks: 'Mason and unskilled work for april month; req 04-05-2026' },
      { material: 'Labour charges for Unskilled labour 8 Hours per day',                               qty: 30,     unit: 'days',  remarks: 'req 04-05-2026' },
      { material: 'Overtime charges for carpenter / Helper / Fitter',                                  qty: 4,      unit: 'hours', remarks: 'req 04-05-2026' },
      { material: 'Overtime charges for Unskilled Labours',                                            qty: 4,      unit: 'hours', remarks: 'req 04-05-2026' },
      { material: 'Labours Charges for Supervisor 8 Hours per shift',                                  qty: 30,     unit: 'days',  remarks: 'req 04-05-2026' },
      { material: 'Overtime charges for supervisor',                                                   qty: 4,      unit: 'hours', remarks: 'req 04-05-2026' },
      { material: 'JCB - WO',                                                                         qty: 150,    unit: 'hours', remarks: 'For back filling and excavation; req 04-05-2026' },
      { material: 'Tractor - WO',                                                                      qty: 20,     unit: 'days',  remarks: 'For back filling and excavation; req 04-05-2026' },
      { material: 'Bob cat machine',                                                                   qty: 15,     unit: 'days',  remarks: 'stp back filling; req 04-10-2026' },
    ],
  },

  // ── MR-046 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-046',
    date:     '2026-05-21',
    required: '2026-05-30',
    narration: 'Puddle flanges (MS) and PVC rungs for UG sump construction. Physical MR BCIM-TQS-BLR-MR-046 dated 21-05-2026.',
    items: [
      { material: '315mm PUDDLE FLANGE pipe length 600mm MS plate to be fixed at center Plate size 630*630mm',    qty: 3,   unit: "NO'S", remarks: 'For UG sump' },
      { material: '250mm PIPE PUDDLE FLANGE pipe length 600mm MS plate to be fixed at center plate size 500*500mm', qty: 5,  unit: "NO'S", remarks: 'For UG sump' },
      { material: '100mm PIPE PUDDLE FLANGE pipe length 600mm MS plate to be fixed at center plate size 200*200mm', qty: 13, unit: "NO'S", remarks: 'For UG sump' },
      { material: '100mm PIPE PUDDLE FLANGE pipe length 550mm MS plate to be fixed at center plate size 200*200mm', qty: 13, unit: "NO'S", remarks: 'For UG sump' },
      { material: '80mm PIPE PUDDLE FLANGE pipe length 600mm MS plate to be fixed at center plate size 320*320mm',  qty: 6,  unit: "NO'S", remarks: 'For UG sump' },
      { material: '80mm PIPE PUDDLE FLANGE pipe length 550mm MS plate to be fixed at center plate size 320*320mm',  qty: 2,  unit: "NO'S", remarks: 'For UG sump' },
      { material: '50mm PIPE 600mm length threading length 50mm both side MS plate to be fixed at center plate size 200*200mm', qty: 3, unit: "NO'S", remarks: 'For UG sump' },
      { material: '50mm PIPE 550mm length threading length 50mm both side MS plate to be fixed at center plate size 200*200mm', qty: 3, unit: "NO'S", remarks: 'For UG sump' },
      { material: 'PVC Rungs 200mm*300mm',                                                                          qty: 114, unit: "NO'S", remarks: 'For UG sump' },
    ],
  },

  // ── MR-047 ──────────────────────────────────────────────────────────────────
  {
    serial:   'BCIM-TQS-BLR-MR-047',
    date:     '2026-06-01',
    required: '2026-06-02',
    narration: 'Soil excavation for UG sump. Physical MR BCIM-TQS-BLR-MR-047 dated 01-06-2026.',
    items: [
      { material: 'Soil excavation work', qty: 6000, unit: 'cum', remarks: 'For UG sump' },
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

    const skipped = [], toInsert = [];
    for (const mr of MRS) {
      const dup = await client.query(
        `SELECT id FROM material_requisitions WHERE serial_no_formatted = $1`, [mr.serial]
      );
      if (dup.rows.length) skipped.push(mr.serial);
      else toInsert.push(mr);
    }

    if (skipped.length) console.log(`⚠️  Already exist (will skip): ${skipped.join(', ')}\n`);

    console.log('MRs to insert:');
    toInsert.forEach(mr => console.log(`  ${mr.serial}  ${mr.date}  (${mr.items.length} items)`));
    const totalItems = toInsert.reduce((s, m) => s + m.items.length, 0);
    console.log(`\nTotal: ${toInsert.length} MRs, ${totalItems} line items`);

    if (!DO_CREATE) {
      console.log('\n(DRY RUN — nothing inserted. Re-run with --create to commit.)\n');
      return;
    }

    await client.query('BEGIN');

    for (const mr of toInsert) {
      const res = await client.query(
        `INSERT INTO material_requisitions (
           project_id, mrs_number, serial_no_formatted, department,
           head_office_project_name, required_by, priority, remarks,
           raised_by, status, created_at
         ) VALUES ($1,$2,$3,$4,$5,$6,'medium',$7,$8,'pending',$9) RETURNING id`,
        [proj.id, mr.serial, mr.serial, DEPT, proj.name,
         mr.required, mr.narration, raisedBy.id, mr.date]
      );
      const mrsId = res.rows[0].id;
      for (let i = 0; i < mr.items.length; i++) {
        const { material, qty, unit, remarks } = mr.items[i];
        await client.query(
          `INSERT INTO mrs_items (mrs_id, material_name, quantity, unit, sort_order, remarks)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [mrsId, material, qty, unit, i + 1, remarks || null]
        );
      }
      console.log(`  ✅ Inserted ${mr.serial} (${mr.items.length} items)`);
    }

    await client.query('COMMIT');
    console.log('\n✅ All done.\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error — rolled back:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
})();
