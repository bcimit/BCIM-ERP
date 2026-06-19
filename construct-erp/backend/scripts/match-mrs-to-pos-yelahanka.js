#!/usr/bin/env node
/**
 * match-mrs-to-pos-yelahanka.js
 *
 * Auto-matches MRs to POs for project WDIRY0151 by material-name word overlap.
 * Prints a ranked candidate table.  Add --link to apply matches to the DB.
 *
 *   node scripts/match-mrs-to-pos-yelahanka.js           # show candidates
 *   railway run node scripts/match-mrs-to-pos-yelahanka.js           # prod dry-run
 *   railway run node scripts/match-mrs-to-pos-yelahanka.js --link    # apply
 *   railway run node scripts/match-mrs-to-pos-yelahanka.js --min 1   # lower threshold
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'construct_erp',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
      }
);

const DO_LINK  = process.argv.includes('--link');
const MIN_ARG  = process.argv.indexOf('--min');
const MIN_HITS = MIN_ARG !== -1 ? parseInt(process.argv[MIN_ARG + 1]) || 2 : 2; // min overlapping words

// ── stop words to ignore in matching ─────────────────────────────────────────
const STOP = new Set([
  'work','works','for','of','and','to','in','at','the','with','a','an','is',
  'nos','no','per','wo','supply','fix','fixing','provide','providing',
  '&','/','-','mm','cm','kg','mt','sqm','cum','rft','ltr','lmt',
  'grade','type','size','class','as','per','req','required','including',
]);

function tokenize(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 1 && !STOP.has(w));
}

function overlap(nameA, nameB) {
  const ta = new Set(tokenize(nameA));
  const tb = new Set(tokenize(nameB));
  let hits = 0;
  for (const w of ta) if (tb.has(w)) hits++;
  return hits;
}

// Best match score between one MR's item list and one PO's item list
// Returns { score, mrItem, poItem } for the best pair
function bestPairScore(mrsItems, poItems) {
  let best = { score: 0, mrMaterial: '', poMaterial: '' };
  for (const mi of mrsItems) {
    for (const pi of poItems) {
      const s = overlap(mi.material_name, pi.material_name);
      if (s > best.score) {
        best = { score: s, mrMaterial: mi.material_name, poMaterial: pi.material_name };
      }
    }
  }
  return best;
}

(async () => {
  const c = await pool.connect();
  try {
    // ── load project ──────────────────────────────────────────────────────────
    const projRes = await c.query(
      `SELECT id, name FROM projects WHERE is_active = true AND LOWER(project_code) = 'wdiry0151'`
    );
    if (!projRes.rows.length) { console.error('Project not found'); process.exit(1); }
    const { id: pid, name: pname } = projRes.rows[0];
    console.log(`\nProject: ${pname}\n`);

    // ── load all MRs with their items ─────────────────────────────────────────
    const mrRes = await c.query(
      `SELECT mr.id, mr.serial_no_formatted, mr.created_at::date AS mr_date,
              json_agg(json_build_object('material_name', mi.material_name, 'qty', mi.quantity, 'unit', mi.unit)
                       ORDER BY mi.sort_order) AS items
       FROM material_requisitions mr
       JOIN mrs_items mi ON mi.mrs_id = mr.id
       WHERE mr.project_id = $1
       GROUP BY mr.id ORDER BY mr.created_at ASC`,
      [pid]
    );
    const mrs = mrRes.rows;
    console.log(`Loaded ${mrs.length} MRs\n`);

    // ── load all POs with their items ─────────────────────────────────────────
    const poRes = await c.query(
      `SELECT po.id, po.po_number, po.serial_no_formatted, po.po_date,
              po.mrs_id, po.mrs_ids,
              json_agg(json_build_object('material_name', pi.material_name, 'qty', pi.quantity, 'unit', pi.unit)
                       ORDER BY pi.sort_order) AS items
       FROM purchase_orders po
       JOIN po_items pi ON pi.po_id = po.id
       WHERE po.project_id = $1 AND po.status != 'cancelled'
       GROUP BY po.id ORDER BY po.po_date ASC NULLS LAST`,
      [pid]
    );
    const pos = poRes.rows;
    console.log(`Loaded ${pos.rows ? pos.rows.length : pos.length} POs\n`);

    // ── score every (MR, PO) pair ─────────────────────────────────────────────
    const candidates = [];  // { mr, po, score, mrMaterial, poMaterial }

    for (const mr of mrs) {
      for (const po of pos) {
        const best = bestPairScore(mr.items, po.items);
        if (best.score >= MIN_HITS) {
          candidates.push({ mr, po, ...best });
        }
      }
    }

    // Sort by score desc
    candidates.sort((a, b) => b.score - a.score);

    // ── deduplicate: for each PO pick the best MR, for each MR pick best POs ─
    // Build: for each PO, which MRs match it?
    const poToMrs = {};
    for (const ca of candidates) {
      const poId = ca.po.id;
      if (!poToMrs[poId]) poToMrs[poId] = [];
      // Only add if this MR isn't already in the list for this PO
      if (!poToMrs[poId].find(x => x.mr.id === ca.mr.id)) {
        poToMrs[poId].push(ca);
      }
    }

    // ── print report ──────────────────────────────────────────────────────────
    const COL = { po: 14, mr: 26, score: 6, mat: 38 };
    const header =
      'PO Number'.padEnd(COL.po) + 'MR Serial'.padEnd(COL.mr) +
      'Score'.padEnd(COL.score) + 'Best matching pair';
    console.log(header);
    console.log('-'.repeat(header.length + 10));

    // Group candidates by PO for display
    const seenPO = new Set();
    for (const ca of candidates) {
      const poLabel = (ca.po.serial_no_formatted || ca.po.po_number).padEnd(COL.po);
      const mrLabel = ca.mr.serial_no_formatted.padEnd(COL.mr);
      const scoreLabel = String(ca.score).padEnd(COL.score);
      const alreadyLinked = ca.po.mrs_ids && ca.po.mrs_ids.includes(ca.mr.id);
      const tag = alreadyLinked ? ' [already linked]' : '';
      console.log(`${poLabel}${mrLabel}${scoreLabel}${ca.mrMaterial.slice(0,36)} ↔ ${ca.poMaterial.slice(0,36)}${tag}`);
    }

    console.log(`\n${candidates.length} candidate pair(s) found (min word-overlap: ${MIN_HITS})`);

    if (!DO_LINK) {
      console.log('\n(DRY RUN — re-run with --link to apply these links to the DB)\n');
      return;
    }

    // ── apply: group by PO, collect MR ids, update ───────────────────────────
    console.log('\nApplying links...');
    for (const [poId, matches] of Object.entries(poToMrs)) {
      const po = matches[0].po;
      const poLabel = po.serial_no_formatted || po.po_number;

      // Collect all MR UUIDs for this PO (deduplicated)
      const existing = Array.isArray(po.mrs_ids) ? po.mrs_ids : (po.mrs_id ? [po.mrs_id] : []);
      const newMrIds = [...new Set([...existing, ...matches.map(m => m.mr.id)])];

      await c.query(
        `UPDATE purchase_orders SET mrs_id = $1, mrs_ids = $2 WHERE id = $3`,
        [newMrIds[0], newMrIds, poId]
      );
      const mrLabels = matches.map(m => m.mr.serial_no_formatted).join(', ');
      console.log(`  linked ${poLabel} -> ${mrLabels}`);
    }

    console.log('\nDone. Redeploy Railway (or wait for next server restart) to auto-fill po_items.mrs_item_id.\n');

  } finally {
    c.release();
    await pool.end();
  }
})();
