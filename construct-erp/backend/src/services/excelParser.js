/**
 * excelParser.js
 * Reads a BCIM-format Purchase Order or Work Order Excel file and returns
 * structured data (header fields + line items) ready for DB insertion.
 *
 * Uses the SheetJS (xlsx) package — no external processes needed.
 */

const xlsx = require('xlsx');

// ─── helpers ──────────────────────────────────────────────────────────────────

function cellStr(ws, row, col) {
  const addr = xlsx.utils.encode_cell({ r: row, c: col });
  const cell = ws[addr];
  if (!cell) return '';
  return String(cell.v ?? '').replace(/\s+/g, ' ').trim();
}

function toNum(v) {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v).replace(/,/g, '').trim());
  return isNaN(n) ? null : n;
}

/** Scan the sheet looking for a label anywhere in a row; return value in the next non-empty cell */
function findLabelValue(rows, label) {
  const lc = label.toLowerCase();
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      const v = String(row[c] ?? '').toLowerCase().trim();
      if (v.includes(lc)) {
        // return the first non-empty cell after the match in the same row
        for (let k = c + 1; k < row.length; k++) {
          const val = String(row[k] ?? '').trim();
          if (val) return val;
        }
      }
    }
  }
  return '';
}

function parseDate(str) {
  if (!str) return null;
  // handles DD.MM.YYYY or DD/MM/YYYY
  const m = str.match(/(\d{1,2})[.\/](\d{1,2})[.\/](\d{2,4})/);
  if (!m) return null;
  const [, d, mo, y] = m;
  const year = y.length === 2 ? '20' + y : y;
  return `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

const STOP_EXACT = new Set(['total', 'grand total', 'subtotal', 'net total', 'basic amount',
  'sub total', 'total amount', 'cgst', 'sgst', 'igst']);
const STOP_CONTAINS = ['sub total', 'grand total', 'net total', 'basic amount',
  'cgst', 'sgst', 'igst', 'rupees', 'narration', 'terms & conditions', 'terms and conditions'];

function isStopRow(row) {
  const first = String(row[0] ?? '').toLowerCase().trim();
  if (STOP_EXACT.has(first)) return true;
  return STOP_CONTAINS.some(k => first.includes(k));
}

/** Find the header row that contains "description" and ("rate" or "quantity") */
function findHeaderRow(rows) {
  for (let i = 0; i < rows.length; i++) {
    const joined = rows[i].map(v => String(v ?? '').toLowerCase()).join(' ');
    if (joined.includes('description') && (joined.includes('rate') || joined.includes('quantity') || joined.includes('qty'))) {
      return i;
    }
  }
  return -1;
}

/** Map header row cells to column indices */
function mapCols(headerRow) {
  const col = {};
  headerRow.forEach((v, j) => {
    const lv = String(v ?? '').toLowerCase().trim();
    if (lv.includes('description') || lv.includes('particular')) { if (!col.desc)   col.desc   = j; }
    if ((lv.includes('uom') || lv.includes('unit')) && !lv.includes('amount'))      { if (!col.unit)   col.unit   = j; }
    if (lv.includes('qty') || lv.includes('quantity'))           { if (!col.qty)    col.qty    = j; }
    if (lv.includes('rate') && !lv.includes('gst'))              { if (!col.rate)   col.rate   = j; }
    if (lv.includes('amount') && !lv.includes('gst') && !lv.includes('total')) { if (!col.amount) col.amount = j; }
    if (lv.includes('hsn'))                                      { if (!col.hsn)    col.hsn    = j; }
  });
  return col;
}

// ─── PO parser ────────────────────────────────────────────────────────────────

function parsePO(ws, rows) {
  const hi = findHeaderRow(rows);
  if (hi < 0) return { items: [] };

  const col = mapCols(rows[hi]);

  const items = [];
  let sortOrder = 0;

  for (let i = hi + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(v => v === null || v === undefined || v === '')) continue;
    if (isStopRow(row)) break;

    const desc   = String(row[col.desc   ?? 1] ?? '').replace(/\s+/g, ' ').trim();
    const unit   = String(row[col.unit   ?? 2] ?? '').trim() || 'Nos';
    const qty    = toNum(row[col.qty    ?? 3]);
    const rate   = toNum(row[col.rate   ?? 4]);
    let   amount = toNum(row[col.amount ?? 5]);
    const hsn    = String(row[col.hsn   ?? 99] ?? '').trim() || null;

    if (!desc && qty === null && rate === null) continue;
    if (qty === null && rate === null) continue;

    if (amount === null && qty !== null && rate !== null) amount = Math.round(qty * rate * 100) / 100;
    sortOrder++;
    items.push({
      material_name: desc.slice(0, 200),
      hsn_code:      hsn ? hsn.slice(0, 10) : null,
      quantity:      qty  ?? 0,
      unit:          unit.slice(0, 20),
      rate:          rate ?? 0,
      gst_rate:      18,
      gst_amount:    Math.round((amount ?? 0) * 0.18 * 100) / 100,
      total_amount:  Math.round((amount ?? 0) * 1.18 * 100) / 100,
      sort_order:    sortOrder,
    });
  }

  return { items };
}

// ─── WO parser ────────────────────────────────────────────────────────────────

function parseWO(ws, rows) {
  const hi = findHeaderRow(rows);
  if (hi < 0) return { items: [] };

  const col = mapCols(rows[hi]);

  const items = [];
  let pendingDesc = '';

  for (let i = hi + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.every(v => v === null || v === undefined || v === '')) {
      pendingDesc = '';
      continue;
    }
    if (isStopRow(row)) break;

    const desc = String(row[col.desc ?? 1] ?? '').replace(/\s+/g, ' ').trim();
    const unit = String(row[col.unit ?? 2] ?? '').trim() || 'LS';
    const qty  = toNum(row[col.qty  ?? 3]);
    const rate = toNum(row[col.rate ?? 4]);

    // Title-only row (no numeric data)
    if (qty === null && rate === null) {
      if (desc) pendingDesc = desc;
      continue;
    }

    const useDesc = pendingDesc ? `${pendingDesc} - ${desc}`.replace(' -  -', ' -').trim() : desc;
    pendingDesc = '';

    items.push({
      description: useDesc,
      unit:        unit.slice(0, 20),
      quantity:    qty  ?? 1,
      rate:        rate ?? 0,
    });
  }

  return { items };
}

// ─── Auto-detect PO vs WO ─────────────────────────────────────────────────────

function detectType(rows, fileName) {
  const fn = (fileName || '').toUpperCase();
  if (/^PO[A-Z0-9]/.test(fn)) return 'PO';
  if (/^WO[A-Z0-9]/.test(fn)) return 'WO';

  // Scan first 20 rows for "PURCHASE ORDER" / "WORK ORDER" title
  for (let i = 0; i < Math.min(20, rows.length); i++) {
    const joined = rows[i].map(v => String(v ?? '').toUpperCase()).join(' ');
    if (joined.includes('PURCHASE ORDER')) return 'PO';
    if (joined.includes('WORK ORDER'))     return 'WO';
  }
  return null;
}

// ─── Extract scalar header fields ─────────────────────────────────────────────

function extractPOHeader(rows) {
  const poNumber   = findLabelValue(rows, 'PO No');
  // Date: look for "Date:" label but exclude "PO Req Date" / "Delivery Date" rows
  let poDate = '';
  for (const row of rows) {
    for (let c = 0; c < row.length; c++) {
      const v = String(row[c] ?? '').toLowerCase().trim();
      if (v === 'date:' || v === 'date') {
        for (let k = c + 1; k < row.length; k++) {
          const val = String(row[k] ?? '').trim();
          if (val) { poDate = parseDate(val); break; }
        }
        if (poDate) break;
      }
    }
    if (poDate) break;
  }
  const narration  = findLabelValue(rows, 'Narration');

  // Vendor name: find "M/s." in any cell (full-cell or cell starting with M/s.)
  const vendorName = (() => {
    for (const row of rows) {
      for (let c = 0; c < row.length; c++) {
        const v = String(row[c] ?? '').trim();
        if (/^M\/s\.|^M\/S\.|^m\/s\./i.test(v)) return v;
      }
    }
    return '';
  })();

  // Vendor GSTIN: label "GST:" or "GST No" near vendor block (before line items)
  let vendorGstin = '';
  const hi = findHeaderRow(rows);
  const scanRows = hi >= 0 ? rows.slice(0, hi) : rows.slice(0, 25);
  vendorGstin = findLabelValue(scanRows, 'GST:') || findLabelValue(scanRows, 'GST');

  const subTotal   = toNum(findLabelValue(rows, 'Sub Total'));
  const grandTotal = toNum(findLabelValue(rows, 'Grand Total'));
  const totalGst   = grandTotal && subTotal ? Math.round((grandTotal - subTotal) * 100) / 100 : null;

  return { poNumber, poDate: poDate || null, vendorName, vendorGstin, subTotal, totalGst, grandTotal, narration };
}

function extractWOHeader(rows) {
  const woNumber     = findLabelValue(rows, 'Work Order No');
  const woDate       = parseDate(findLabelValue(rows, 'Work Order Date'));
  const contractorName = findLabelValue(rows, 'Contractor');
  const contractorGstin = findLabelValue(rows, 'GST No');
  const contractorPan   = findLabelValue(rows, 'PAN No');
  const narration       = findLabelValue(rows, 'Narration');

  // Find basic amount (before CGST row)
  let contractAmount = null;
  let totalValue     = null;
  for (const row of rows) {
    const first = String(row[0] ?? '').toLowerCase().trim();
    if (first === 'total' || first === 'basic amount') {
      for (let k = 1; k < row.length; k++) {
        const n = toNum(row[k]);
        if (n !== null) { contractAmount = n; break; }
      }
    }
    if (first.includes('net total')) {
      for (let k = 1; k < row.length; k++) {
        const n = toNum(row[k]);
        if (n !== null) { totalValue = n; break; }
      }
    }
  }

  return { woNumber, woDate, contractorName, contractorGstin, contractorPan,
           contractAmount, totalValue, narration };
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Parse a BCIM PO or WO Excel file.
 * @param {string} filePath  Absolute path to the .xlsx file
 * @param {string} fileName  Original filename (used for type detection)
 * @returns {{ type, header, items, error }}
 */
function parseOrderFile(filePath, fileName) {
  try {
    const wb = xlsx.readFile(filePath, { cellFormula: false, cellHTML: false });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const raw = xlsx.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true });

    const type = detectType(raw, fileName);
    if (!type) return { error: 'Could not detect order type (PO or WO). Check filename starts with PO... or WO...' };

    if (type === 'PO') {
      const header = extractPOHeader(raw);
      const { items } = parsePO(ws, raw);
      return { type: 'PO', header, items };
    } else {
      const header = extractWOHeader(raw);
      const { items } = parseWO(ws, raw);
      return { type: 'WO', header, items };
    }
  } catch (err) {
    return { error: `Parse failed: ${err.message}` };
  }
}

module.exports = { parseOrderFile };
