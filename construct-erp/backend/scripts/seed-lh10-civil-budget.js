/**
 * seed-lh10-civil-budget.js
 *
 * Seeds BCIM Budget amounts for LH 10 (LANCO HILLS CIVIL WORKS) into
 * boq_item_budget_breakdown using direct item_no → budget mappings.
 *
 * Usage (run from backend/ directory):
 *   node scripts/seed-lh10-civil-budget.js            # DRY RUN
 *   node scripts/seed-lh10-civil-budget.js --commit   # write to DB
 */
'use strict';
require('dotenv').config();
const { pool, query } = require('../src/config/database');

const COMMIT = process.argv.includes('--commit');

// Direct mapping: db item_no → BCIM Budget amount + cost head
// Verified against the 42 actual BOQ items in the production DB
const MAPPINGS = [
  // ── Chapter 1: Block Work ──────────────────────────────────────────────────
  { item_no: '01.52.13.21.15.28', budget: 18611476.45, cost_head: 'Blocks' },           // 1.1 100mm Block
  { item_no: '01.52.13.21.15.29', budget:   859103.78, cost_head: 'Blocks' },           // 1.2 150mm Block
  { item_no: '01.52.13.21.15.30', budget: 19713929.56, cost_head: 'Blocks' },           // 1.3 200mm Block
  { item_no: '01.52.13.21.15.31', budget:   505832.14, cost_head: 'Blocks' },           // 1.4 300mm Block
  { item_no: '01.52.13.21.15.32', budget:  2388162.16, cost_head: 'Concrete Material' },// 1.5 RCC Band / Lintel
  // ── Chapter 2: Plaster Work ────────────────────────────────────────────────
  { item_no: '01.52.13.21.15.33', budget: 23990812.36, cost_head: 'Cement' },           // 2.1 Internal Plaster
  { item_no: '01.52.13.21.15.34', budget:  5202336.34, cost_head: 'Cement' },           // 2.2 Shaft Plaster
  { item_no: '01.52.13.21.15.35', budget: 15753658.65, cost_head: 'Cement' },           // 2.3 External Plaster
  { item_no: '01.52.13.21.15.36', budget:  1684247.80, cost_head: 'Cement' },           // 2.3b Ceiling Plaster
  { item_no: '01.52.13.21.15.37', budget:  3812501.35, cost_head: 'Cement' },           // 2.4 Rough Plaster
  // ── Chapter 3: Waterproofing ───────────────────────────────────────────────
  { item_no: '01.52.13.21.15.40', budget:   968290.84, cost_head: 'Materials / Consumables' }, // 3.1a Toilet & Balcony WP
  { item_no: '01.52.13.21.15.41', budget:  2854766.60, cost_head: 'Materials / Consumables' }, // 3.1b Sunken Area WP
  { item_no: '01.52.13.21.15.42', budget:   580520.08, cost_head: 'Materials / Consumables' }, // 3.1c Terrace WP
  { item_no: '01.52.13.21.15.43', budget:   146186.61, cost_head: 'Materials / Consumables' }, // 3.1d OHT WP
  { item_no: '01.52.13.21.15.44', budget:  2470274.98, cost_head: 'Materials / Consumables' }, // 3.1e Expansion Joint
  { item_no: '01.52.13.21.15.45', budget:  2665106.42, cost_head: 'Materials / Consumables' }, // 3.1f GI Sheet Tray
  { item_no: '01.52.13.21.15.46', budget:   216585.89, cost_head: 'Materials / Consumables' }, // 3.1g Edeck RCC Wall WP
  { item_no: '01.52.13.21.15.47', budget:   407797.21, cost_head: 'Sub Con' },                 // 3.1h Drilling 14mm
  // ── Chapter 4: Screeding ───────────────────────────────────────────────────
  { item_no: '01.52.13.21.15.49', budget:  1153505.20, cost_head: 'Concrete Material' },       // 4 Screed Sunken Areas
  // ── Chapter 5: Demolition ─────────────────────────────────────────────────
  { item_no: '01.52.13.21.15.50', budget:  2528597.39, cost_head: 'Debris Disposal' },         // 5.2 200mm Wall Demo
  { item_no: '01.52.13.21.15.51', budget:  2248050.21, cost_head: 'Debris Disposal' },         // 5.1 100mm Wall Demo
  // ── Chapter 6: Miscellaneous Works ────────────────────────────────────────
  { item_no: '01.52.13.21.15.52', budget:  1354626.71, cost_head: 'Concrete Material' },       // 6a Shuttering
  { item_no: '01.52.13.21.15.53', budget:  1476903.12, cost_head: 'Steel' },                   // 6b Reinforcement Steel
  { item_no: '01.52.13.21.15.54', budget:  1247959.22, cost_head: 'Concrete Material' },       // 6c RCC M30
  { item_no: '01.52.13.21.15.55', budget:  4902521.53, cost_head: 'Concrete Material' },       // 6d M15 Screed Concrete
  { item_no: '01.52.13.21.15.56', budget:   523264.87, cost_head: 'Materials / Consumables' }, // 6e1 Core Cut 200mm
  { item_no: '01.52.13.21.15.57', budget:   117058.40, cost_head: 'Materials / Consumables' }, // 6e3 Core Cut 100mm
  { item_no: '01.52.13.21.15.58', budget:   168347.21, cost_head: 'Materials / Consumables' }, // 6e2 Core Cut 150mm
  { item_no: '01.52.13.21.15.59', budget:     8377.60, cost_head: 'Materials / Consumables' }, // 6f1 Core Cut 120mm Masonry
  { item_no: '01.52.13.21.15.60', budget:    14903.95, cost_head: 'Materials / Consumables' }, // 6f2 Core Cut 75mm Masonry
  { item_no: '01.52.13.21.15.61', budget:    56188.03, cost_head: 'Materials / Consumables' }, // 6g1 Bore Packing 60mm
  { item_no: '01.52.13.21.15.62', budget:   258721.41, cost_head: 'Materials / Consumables' }, // 6g2 Bore Packing 125mm
  { item_no: '01.52.13.21.15.63', budget:    28310.91, cost_head: 'Materials / Consumables' }, // 6g3 Bore Packing 160mm
  { item_no: '01.52.13.21.15.64', budget:  1372290.56, cost_head: 'Sub Con' },                 // 6h Closing Tie Rods
  { item_no: '01.52.13.21.15.65', budget:  1615924.15, cost_head: 'Sub Con' },                 // 6i Power Trowelling
  { item_no: '01.52.13.21.15.66', budget:  1389389.65, cost_head: 'Debris Disposal' },         // 6j Debris Removal
  { item_no: '01.52.13.21.15.67', budget:   984529.00, cost_head: 'Materials / Consumables' }, // 6k Bonding Agent
  { item_no: '01.52.13.21.15.69', budget:   113207.33, cost_head: 'Sub Con' },                 // 6l1 Unskilled / Misc
  { item_no: '01.52.13.21.15.70', budget:    65310.36, cost_head: 'Sub Con' },                 // 6l2 Skilled Works
  { item_no: '01.52.13.21.15.71', budget:    69678.70, cost_head: 'Equipment & Rentals' },     // 6l3 JCB / Helper
  { item_no: '01.52.13.21.15.72', budget:   500000.00, cost_head: 'Power & Water' },           // 6l4 Water Tanker
  { item_no: '01.52.13.21.15.73', budget:  3653144.63, cost_head: 'Sub Con' },                 // 6l5 Scaffolding
];

(async () => {
  try {
    // Find LH10 project
    const projR = await query(
      `SELECT id, name, project_code FROM projects WHERE name ILIKE '%LH 10%' OR project_code ILIKE '%LH-10%' LIMIT 1`
    );
    if (!projR.rows.length) { console.error('❌  LH 10 project not found'); process.exit(1); }
    const project = projR.rows[0];
    console.log(`✅  Project: "${project.name}" (${project.project_code})  ID: ${project.id}\n`);

    // Load BOQ items indexed by item_no
    const boqR = await query(
      `SELECT id, item_no, ROUND((quantity*rate)::numeric,2) AS amount, LEFT(description,70) AS desc
       FROM boq_items WHERE project_id=$1 AND is_active=true`, [project.id]
    );
    const byItemNo = {};
    for (const r of boqR.rows) byItemNo[r.item_no.trim()] = r;
    console.log(`   ${boqR.rows.length} BOQ items loaded\n`);

    const inr = v => `₹${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    let matched = 0, missing = 0;

    for (const m of MAPPINGS) {
      const boq = byItemNo[m.item_no];
      if (!boq) {
        console.log(`  ✗  ${m.item_no}  NOT FOUND IN DB`);
        missing++;
        continue;
      }
      const itemAmount = parseFloat(boq.amount || 0);
      const pct = itemAmount > 0 ? (m.budget / itemAmount) * 100 : 0;

      if (COMMIT) {
        await query(
          `INSERT INTO boq_item_budget_breakdown (boq_item_id, project_id, cost_head, budgeted_pct, budgeted_amount, created_by)
           VALUES ($1,$2,$3,$4,$5,NULL)
           ON CONFLICT (boq_item_id, cost_head)
           DO UPDATE SET budgeted_pct=$4, budgeted_amount=$5, updated_at=NOW()`,
          [boq.id, project.id, m.cost_head, pct, m.budget]
        );
      }
      console.log(`  ✓  ${m.item_no.padEnd(26)} ${inr(m.budget).padStart(20)}  ${m.cost_head}  |  "${boq.desc}"`);
      matched++;
    }

    const grandTotal = MAPPINGS.reduce((s, m) => s + m.budget, 0);
    console.log(`\n  Matched: ${matched}  Missing: ${missing}  Grand total: ${inr(grandTotal)}`);

    if (!COMMIT) {
      console.log('\n⚠️  DRY RUN — nothing written. Re-run with --commit to apply.\n');
    } else {
      console.log(`\n✅  ${matched} budget entries written to boq_item_budget_breakdown.\n`);
    }

    await pool.end();
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
