// One-off: tag WOTQS006's sc_wo_items with equipment_group / usage_category /
// category_order so they render correctly in the Hire Usage Tracker. Scoped to
// WOTQS006 only — does not touch any other work order's items.
require('dotenv').config();

const { pool } = require('../src/config/database');

const WO_NUMBER = 'WOTQS006';

// description (as copied verbatim from work_order_items) -> { equipment_group, usage_category, category_order }
const TAGS = [
  { match: 'Hiring of Hydra Crane (12 Ton)\nMinimum 3 hours Shift', equipment_group: 'Hydra 12 Tonne',  usage_category: 'Upto 3 Hours',          category_order: 1 },
  { match: 'Hiring of Hydra Crane (12 Ton)\nafter 3 Hours',         equipment_group: 'Hydra 12 Tonne',  usage_category: 'After 3 Hours',          category_order: 2 },
  { match: 'Hiring of Hydra Crane (12 Ton)\n8 Hours per Day',       equipment_group: 'Hydra 12 Tonne',  usage_category: 'For 1 Day (8 Hours)',    category_order: 3 },
  { match: 'Hiring of F15-Farana Crane\nMinimum 3 hours',           equipment_group: 'F15-Farana Crane', usage_category: 'Upto 3 Hours',          category_order: 1 },
  { match: 'Hiring of F15-Farana Crane',                            equipment_group: 'F15-Farana Crane', usage_category: 'After 3 Hours',         category_order: 2 },
  { match: 'Hiring of F15-Farana Crane\n8 hours Shift',             equipment_group: 'F15-Farana Crane', usage_category: 'For 1 Day (8 Hours)',   category_order: 3 },
];

async function main() {
  // Same columns hireLog.routes.js adds on boot via runSchemaInit — added here too
  // since this script runs standalone without starting the full Express app.
  await pool.query(`ALTER TABLE sc_wo_items ADD COLUMN IF NOT EXISTS equipment_group VARCHAR(200)`);
  await pool.query(`ALTER TABLE sc_wo_items ADD COLUMN IF NOT EXISTS usage_category VARCHAR(100)`);
  await pool.query(`ALTER TABLE sc_wo_items ADD COLUMN IF NOT EXISTS category_order INTEGER DEFAULT 0`);

  const woRes = await pool.query(
    `SELECT id FROM sc_work_orders WHERE UPPER(TRIM(wo_number)) = $1`, [WO_NUMBER]
  );
  if (!woRes.rows.length) throw new Error(`${WO_NUMBER} not found in sc_work_orders — run sync-wotqs006-to-sc.js first`);
  const woId = woRes.rows[0].id;

  const items = await pool.query(`SELECT id, description FROM sc_wo_items WHERE wo_id = $1`, [woId]);
  let tagged = 0;
  for (const it of items.rows) {
    const tag = TAGS.find(t => t.match === it.description);
    if (!tag) { console.log('No tag match for:', JSON.stringify(it.description)); continue; }
    await pool.query(
      `UPDATE sc_wo_items SET equipment_group=$1, usage_category=$2, category_order=$3 WHERE id=$4`,
      [tag.equipment_group, tag.usage_category, tag.category_order, it.id]
    );
    tagged++;
  }
  console.log(JSON.stringify({ wo_id: woId, items_found: items.rows.length, items_tagged: tagged }, null, 2));
  await pool.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
