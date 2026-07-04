// src/pages/sc/mb/scMbAdapters.js
// Pure reshaping functions — no API calls. Adapt Sub Con (WO-based) data into the
// exact prop shapes the client-side Measurement Book print components already
// expect (qs/mb/MBCover, MBMeasurementDetail, MBAbstract, MBPrintDocument), so
// those components can be reused unmodified for Sub Con billing.

const num = (v) => parseFloat(v || 0);

// sc_wo_items -> "boqItems"-shaped objects (MBMeasurementDetail / MBAbstract read
// id, description, unit, quantity, rate, certified_qty, and an item-code field
// via item_no || item_code || boq_item_no || boq_code || sr_no).
export function adaptWoItemsToBoqItems(woItems = []) {
  return woItems.map((it, i) => ({
    id: it.id,
    item_no: it.item_code || String(i + 1).padStart(2, '0'),
    sr_no: it.sequence_no ?? i + 1,
    description: it.description || '',
    unit: it.unit || '',
    quantity: num(it.qty),
    rate: num(it.rate),
    certified_qty: num(it.billed_qty),
  }));
}

// sc_mb_entries -> "measurements"-shaped objects (MBMeasurementDetail groups by
// boq_item_id; MBAbstract sums net_quantity per boq_item_id). SC entries carry a
// flat executed_qty rather than nos/length/breadth/height, so those dimensional
// fields are filled with safe, inert placeholders (nos=1, length=executed_qty,
// breadth=1, height=1) — MBMeasurementDetail reads net_quantity directly from the
// record rather than recomputing it from nos*length*breadth*height, and the
// Steel Sheet variant (MT/KG units) doesn't render L/B/H columns at all, so this
// mapping never produces a mismatched or misleading number, only cosmetic filler.
export function adaptMbEntriesToMeasurements(mbEntries = []) {
  return mbEntries.map((m) => {
    const qty = num(m.executed_qty);
    return {
      id: m.id,
      boq_item_id: m.wo_item_id,
      entry_date: m.mb_date,
      description: m.description || '',
      location: [m.tower_block, m.floor_number, m.location_detail].filter(Boolean).join(' / '),
      nos: 1,
      length: qty,
      breadth: 1,
      height: 1,
      deduction: 0,
      net_quantity: qty,
      drawing_ref: m.drawing_ref || '',
      remarks: m.remarks || '',
      status: m.status,
    };
  });
}
