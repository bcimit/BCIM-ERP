/**
 * seed-lh10-civil-budget.js
 *
 * Seeds BCIM Budget amounts for the LH 10 (LANCO HILLS CIVIL WORKS) project into
 * boq_item_budget_breakdown. Values are taken from the official BOQ PDF
 * (LH 10 LANCO HILLS - CIVIL WORKS BOQ, BCIM Budget column).
 *
 * Matching strategy:
 *   1. Exact item_no match (e.g. "1.1", "2.3")
 *   2. ILIKE description match (for sub-items with alpha suffixes like 3.1a)
 *   3. If neither matches, the row is SKIPPED and reported.
 *
 * Usage (run from backend/ directory):
 *   node scripts/seed-lh10-civil-budget.js            # DRY RUN — shows what would change
 *   node scripts/seed-lh10-civil-budget.js --commit   # writes to the database
 *
 * Safe to re-run (uses ON CONFLICT upsert).
 */
'use strict';
require('dotenv').config();
const { pool, query } = require('../src/config/database');

const COMMIT = process.argv.includes('--commit');

// ---------------------------------------------------------------------------
// PDF data — BCIM Budget amounts per BOQ line item
// cost_head: best-fit expenditure head from BOQ_COST_HEADS list
// desc_keywords: used as fallback when item_no doesn't match exactly
// ---------------------------------------------------------------------------
const PDF_ITEMS = [
  // ── Chapter 1: Block Work ──────────────────────────────────────────────────
  { item_no: '1.1',  bcim_budget: 18611476.45, cost_head: 'Blocks',                   desc_keywords: ['100 MM', 'BLOCK'] },
  { item_no: '1.2',  bcim_budget:   859103.78, cost_head: 'Blocks',                   desc_keywords: ['150 MM', 'BLOCK'] },
  { item_no: '1.3',  bcim_budget: 19713929.56, cost_head: 'Blocks',                   desc_keywords: ['200 MM', 'BLOCK'] },
  { item_no: '1.4',  bcim_budget:   505832.14, cost_head: 'Blocks',                   desc_keywords: ['300 MM', 'BLOCK'] },
  { item_no: '1.5',  bcim_budget:  2388162.16, cost_head: 'Concrete Material',        desc_keywords: ['LINTEL'] },

  // ── Chapter 2: Plaster Work ────────────────────────────────────────────────
  { item_no: '2.1',  bcim_budget: 23990812.36, cost_head: 'Cement',                   desc_keywords: ['INTERNAL', 'PLASTER'] },
  { item_no: '2.2',  bcim_budget:  5202336.34, cost_head: 'Cement',                   desc_keywords: ['SHAFT', 'PLASTER'] },
  { item_no: '2.3',  bcim_budget: 15753658.65, cost_head: 'Cement',                   desc_keywords: ['EXTERNAL', 'PLASTER'] },
  { item_no: '2.3b', bcim_budget:  1684247.80, cost_head: 'Cement',                   desc_keywords: ['CEILING', 'PLASTER'] },
  { item_no: '2.4',  bcim_budget:  3812501.35, cost_head: 'Cement',                   desc_keywords: ['ROUGH', 'PLASTER'] },

  // ── Chapter 3: Waterproofing ───────────────────────────────────────────────
  { item_no: '3.1a', bcim_budget:   968290.84, cost_head: 'Materials / Consumables',  desc_keywords: ['TOILET', 'NON SUNKEN'] },
  { item_no: '3.1b', bcim_budget:  2854766.60, cost_head: 'Materials / Consumables',  desc_keywords: ['SUNKEN', 'WATERPROOF'] },
  { item_no: '3.1c', bcim_budget:   580520.08, cost_head: 'Materials / Consumables',  desc_keywords: ['TERRACE'] },
  { item_no: '3.1d', bcim_budget:   146186.61, cost_head: 'Materials / Consumables',  desc_keywords: ['OHT'] },
  { item_no: '3.1e', bcim_budget:  2470274.98, cost_head: 'Materials / Consumables',  desc_keywords: ['EXPANSION JOINT'] },
  { item_no: '3.1f', bcim_budget:  2665106.42, cost_head: 'Materials / Consumables',  desc_keywords: ['GI SHEET', 'TRAY'] },
  { item_no: '3.1g', bcim_budget:   216585.89, cost_head: 'Materials / Consumables',  desc_keywords: ['EDECK', 'RCC WALL'] },
  { item_no: '3.1h', bcim_budget:   407797.21, cost_head: 'Sub Con',                  desc_keywords: ['DRILLING', '14MM'] },

  // ── Chapter 4: Screeding ───────────────────────────────────────────────────
  { item_no: '4',    bcim_budget:  1153505.20, cost_head: 'Concrete Material',        desc_keywords: ['SCREED', 'SUNKEN'] },

  // ── Chapter 5: Demolition Works ───────────────────────────────────────────
  { item_no: '5.1',  bcim_budget:  2248050.21, cost_head: 'Debris Disposal',          desc_keywords: ['100MM', 'DEMOL'] },
  { item_no: '5.2',  bcim_budget:  2528597.39, cost_head: 'Debris Disposal',          desc_keywords: ['200MM', 'DEMOL'] },

  // ── Chapter 6: Miscellaneous Works ────────────────────────────────────────
  { item_no: '6a',   bcim_budget:  1354626.71, cost_head: 'Concrete Material',        desc_keywords: ['SHUTTERING'] },
  { item_no: '6b',   bcim_budget:  1476903.12, cost_head: 'Steel',                    desc_keywords: ['REINFORCEMENT', 'STEEL'] },
  { item_no: '6c',   bcim_budget:  1247959.22, cost_head: 'Concrete Material',        desc_keywords: ['M30', 'CONCRETE'] },
  { item_no: '6d',   bcim_budget:  4902521.53, cost_head: 'Concrete Material',        desc_keywords: ['M15', 'SCREED'] },
  { item_no: '6e1',  bcim_budget:   523264.87, cost_head: 'Materials / Consumables',  desc_keywords: ['200MM DIA', 'CORE'] },
  { item_no: '6e2',  bcim_budget:   168347.21, cost_head: 'Materials / Consumables',  desc_keywords: ['150MM DIA', 'CORE'] },
  { item_no: '6e3',  bcim_budget:   117058.40, cost_head: 'Materials / Consumables',  desc_keywords: ['100MM DIA', 'CORE'] },
  { item_no: '6f1',  bcim_budget:     8377.60, cost_head: 'Materials / Consumables',  desc_keywords: ['120 MM', 'MASONA'] },
  { item_no: '6f2',  bcim_budget:    14903.95, cost_head: 'Materials / Consumables',  desc_keywords: ['75 MM', 'MASONA'] },
  { item_no: '6g1',  bcim_budget:    56188.03, cost_head: 'Materials / Consumables',  desc_keywords: ['60MM DIA', 'BORE'] },
  { item_no: '6g2',  bcim_budget:   258721.41, cost_head: 'Materials / Consumables',  desc_keywords: ['125MM DIA', 'BORE'] },
  { item_no: '6g3',  bcim_budget:    28310.91, cost_head: 'Materials / Consumables',  desc_keywords: ['160MM DIA', 'BORE'] },
  { item_no: '6h',   bcim_budget:  1372290.56, cost_head: 'Sub Con',                  desc_keywords: ['TIE ROD', 'SLEEVE'] },
  { item_no: '6i',   bcim_budget:  1615924.15, cost_head: 'Sub Con',                  desc_keywords: ['TROWEL'] },
  { item_no: '6j',   bcim_budget:  1389389.65, cost_head: 'Debris Disposal',          desc_keywords: ['DEBRIS REMOVAL'] },
  { item_no: '6k',   bcim_budget:   984529.00, cost_head: 'Materials / Consumables',  desc_keywords: ['BONDING AGENT'] },
  { item_no: '6l1',  bcim_budget:   113207.33, cost_head: 'Sub Con',                  desc_keywords: ['UNSKILLED'] },
  { item_no: '6l2',  bcim_budget:    65310.36, cost_head: 'Sub Con',                  desc_keywords: ['SKILLED'] },
  { item_no: '6l3',  bcim_budget:    69678.70, cost_head: 'Equipment & Rentals',      desc_keywords: ['JCB'] },
  { item_no: '6l4',  bcim_budget:   500000.00, cost_head: 'Power & Water',            desc_keywords: ['WATER TANKER'] },
  { item_no: '6l5',  bcim_budget:  3653144.63, cost_head: 'Sub Con',                  desc_keywords: ['SCAFFOLD'] },
];

// ---------------------------------------------------------------------------

(async () => {
  try {
    // 1. Find the LH10 project
    const projR = await query(
      `SELECT id, name, project_code FROM projects WHERE name ILIKE '%LH 10%' OR name ILIKE '%LH10%' OR project_code ILIKE '%LH10%' OR project_code ILIKE '%LH-10%' LIMIT 3`
    );
    if (!projR.rows.length) {
      console.error('❌  Could not find the LH 10 project. Check the project name/code.');
      process.exit(1);
    }
    const project = projR.rows[0];
    console.log(`✅  Project found: "${project.name}" (${project.project_code}) — ID: ${project.id}`);

    // 2. Load all BOQ items for this project
    const boqR = await query(
      `SELECT id, item_no, chapter_no, description FROM boq_items WHERE project_id = $1 AND is_active = true ORDER BY chapter_no, item_no`,
      [project.id]
    );
    const boqItems = boqR.rows;
    console.log(`   ${boqItems.length} BOQ items loaded.\n`);

    const boqByItemNo = {};
    for (const b of boqItems) {
      const key = (b.item_no || '').trim().toLowerCase();
      if (!boqByItemNo[key]) boqByItemNo[key] = b;
    }

    // 3. Match each PDF item to a BOQ item
    const matched = [];
    const unmatched = [];

    for (const pdf of PDF_ITEMS) {
      const key = pdf.item_no.trim().toLowerCase();
      let boq = boqByItemNo[key];

      if (!boq) {
        // Fuzzy: find by description keyword match
        const upper = (s) => (s || '').toUpperCase();
        boq = boqItems.find(b =>
          pdf.desc_keywords.every(kw => upper(b.description).includes(kw.toUpperCase()))
        );
      }

      if (boq) {
        matched.push({ pdf, boq });
        console.log(`  ✓  ${pdf.item_no.padEnd(6)} → BOQ ${boq.item_no.padEnd(8)} "${boq.description.slice(0, 60)}"  →  ₹${pdf.bcim_budget.toLocaleString('en-IN')}`);
      } else {
        unmatched.push(pdf);
        console.log(`  ✗  ${pdf.item_no.padEnd(6)} — NO MATCH (keywords: ${pdf.desc_keywords.join(', ')})`);
      }
    }

    console.log(`\n  Matched: ${matched.length}/${PDF_ITEMS.length}   Unmatched: ${unmatched.length}`);

    if (!COMMIT) {
      console.log('\n⚠️  DRY RUN — nothing written. Re-run with --commit to apply.\n');
      await pool.end();
      return;
    }

    // 4. Upsert budget breakdown entries
    console.log('\nWriting to boq_item_budget_breakdown…');
    let saved = 0;
    for (const { pdf, boq } of matched) {
      // Get the BOQ item amount to calculate pct
      const amtR = await query(
        `SELECT ROUND((quantity * rate)::numeric, 2) AS amount FROM boq_items WHERE id = $1`,
        [boq.id]
      );
      const itemAmount = parseFloat(amtR.rows[0]?.amount || 0);
      const pct = itemAmount > 0 ? (pdf.bcim_budget / itemAmount) * 100 : 0;

      await query(
        `INSERT INTO boq_item_budget_breakdown (boq_item_id, project_id, cost_head, budgeted_pct, budgeted_amount, created_by)
         VALUES ($1, $2, $3, $4, $5, NULL)
         ON CONFLICT (boq_item_id, cost_head)
         DO UPDATE SET budgeted_pct = $4, budgeted_amount = $5, updated_at = NOW()`,
        [boq.id, project.id, pdf.cost_head, pct, pdf.bcim_budget]
      );
      saved++;
      console.log(`  ✓ Saved ${boq.item_no} — ${pdf.cost_head} — ₹${pdf.bcim_budget.toLocaleString('en-IN')}`);
    }

    console.log(`\n✅  Done. ${saved} entries written to boq_item_budget_breakdown.`);
    if (unmatched.length) {
      console.log(`\n⚠️  ${unmatched.length} PDF items had no matching BOQ item — enter these manually:`);
      for (const u of unmatched) {
        console.log(`     item_no: ${u.item_no}  budget: ₹${u.bcim_budget.toLocaleString('en-IN')}  (${u.desc_keywords.join(', ')})`);
      }
    }

    await pool.end();
  } catch (err) {
    console.error('ERROR:', err.message);
    process.exit(1);
  }
})();
