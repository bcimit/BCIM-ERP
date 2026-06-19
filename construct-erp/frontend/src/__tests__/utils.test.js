// Pure function unit tests — no DOM, no React, runs in <10ms
// Tests helpers used across the ERP (formatting, category detection, etc.)

// ── inr() ─────────────────────────────────────────────────────────────────────

const inr = (v) =>
  '₹ ' + Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

describe('inr() — Indian Rupee formatter', () => {
  it('formats zero as ₹ 0.00', () => {
    expect(inr(0)).toBe('₹ 0.00');
  });

  it('formats null/undefined as ₹ 0.00', () => {
    expect(inr(null)).toBe('₹ 0.00');
    expect(inr(undefined)).toBe('₹ 0.00');
  });

  it('formats a whole number with two decimal places', () => {
    expect(inr(1000)).toContain('1,000.00');
  });

  it('formats a decimal amount correctly', () => {
    expect(inr(2562.5)).toContain('2,562.50');
  });

  it('formats large amounts with Indian grouping', () => {
    // 1,00,000 in en-IN (lakh grouping)
    expect(inr(100000)).toContain('1,00,000.00');
  });

  it('starts with the ₹ symbol', () => {
    expect(inr(500)).toMatch(/^₹/);
  });
});

// ── categoryOf() ─────────────────────────────────────────────────────────────

function categoryOf(text = '') {
  const d = (text || '').toLowerCase();
  if (/petrol|fuel|diesel/.test(d))                                                          return 'Fuel';
  if (/safety|glove|shoe|medical|flag|helmet|badge|banner|ppe/.test(d))                     return 'Safety';
  if (/stationery|stationary|file|paper|pen|whitener|stamp|calc|stapler|a4|xerox|print/.test(d)) return 'Stationery';
  if (/pantry|sweet|food|sugar|tea|poha|zeera|mixture|coconut|biscuit|snack/.test(d))       return 'Pantry';
  if (/electric|bill|power|utility|mobile|recharge|internet/.test(d))                       return 'Utilities';
  if (/transport|bus|ticket|charges|auto|cab|uber|ola/.test(d))                             return 'Transport';
  return 'Materials';
}

describe('categoryOf() — purchase category auto-detection', () => {
  // Fuel
  it('detects Fuel from "petrol"',  () => expect(categoryOf('Petrol for generator')).toBe('Fuel'));
  it('detects Fuel from "diesel"',  () => expect(categoryOf('HSD diesel 10L')).toBe('Fuel'));
  it('detects Fuel from "fuel"',    () => expect(categoryOf('Fuel charges')).toBe('Fuel'));

  // Safety
  it('detects Safety from "safety gloves"', () => expect(categoryOf('Safety Gloves x10')).toBe('Safety'));
  it('detects Safety from "helmet"',        () => expect(categoryOf('Helmet ISI')).toBe('Safety'));
  it('detects Safety from "ppe"',           () => expect(categoryOf('PPE kit')).toBe('Safety'));
  it('detects Safety from "medical"',       () => expect(categoryOf('Medical first aid')).toBe('Safety'));

  // Stationery
  it('detects Stationery from "stationery"', () => expect(categoryOf('Stationery items')).toBe('Stationery'));
  it('detects Stationery from "pen"',        () => expect(categoryOf('Ball pen x12')).toBe('Stationery'));
  it('detects Stationery from "A4"',         () => expect(categoryOf('A4 paper ream')).toBe('Stationery'));
  it('detects Stationery from "xerox"',      () => expect(categoryOf('Xerox copies')).toBe('Stationery'));

  // Pantry
  it('detects Pantry from "tea"',     () => expect(categoryOf('Tea bags')).toBe('Pantry'));
  it('detects Pantry from "biscuit"', () => expect(categoryOf('Biscuit packet')).toBe('Pantry'));
  it('detects Pantry from "food"',    () => expect(categoryOf('Food for workers')).toBe('Pantry'));

  // Transport
  it('detects Transport from "bus"',      () => expect(categoryOf('Bus ticket')).toBe('Transport'));
  it('detects Transport from "auto"',     () => expect(categoryOf('Auto charges')).toBe('Transport'));
  it('detects Transport from "transport"',() => expect(categoryOf('Transport cost')).toBe('Transport'));

  // Utilities
  it('detects Utilities from "mobile recharge"', () => expect(categoryOf('Mobile recharge')).toBe('Utilities'));
  it('detects Utilities from "electric"',        () => expect(categoryOf('Electric bill')).toBe('Utilities'));
  it('detects Utilities from "internet"',        () => expect(categoryOf('Internet charges')).toBe('Utilities'));

  // Materials (fallback)
  it('returns Materials for unknown items',    () => expect(categoryOf('Iron rods 16mm')).toBe('Materials'));
  it('returns Materials for empty string',     () => expect(categoryOf('')).toBe('Materials'));
  it('returns Materials for null/undefined',   () => {
    expect(categoryOf(null)).toBe('Materials');
    expect(categoryOf(undefined)).toBe('Materials');
  });

  // Case-insensitive
  it('is case-insensitive', () => {
    expect(categoryOf('PETROL')).toBe('Fuel');
    expect(categoryOf('SAFETY GLOVES')).toBe('Safety');
  });
});

// ── dupInvoices logic ─────────────────────────────────────────────────────────
// Mirrors the useMemo in StoresPettyCashPage — tested as a pure function

function buildDupInvoices(entries) {
  const map = {};
  entries.forEach(e => {
    if (e.invoice_no && e.invoice_no !== '–') {
      map[e.invoice_no] = map[e.invoice_no] || [];
      map[e.invoice_no].push(e.id);
    }
  });
  return Object.fromEntries(Object.entries(map).filter(([, ids]) => ids.length > 1));
}

describe('buildDupInvoices() — duplicate invoice detection', () => {
  it('returns empty object when no entries', () => {
    expect(buildDupInvoices([])).toEqual({});
  });

  it('returns empty object when all invoices are unique', () => {
    const entries = [
      { id: '1', invoice_no: '1001' },
      { id: '2', invoice_no: '1002' },
      { id: '3', invoice_no: '1003' },
    ];
    expect(buildDupInvoices(entries)).toEqual({});
  });

  it('flags invoice that appears twice', () => {
    const entries = [
      { id: '1', invoice_no: '9001' },
      { id: '2', invoice_no: '9001' },
      { id: '3', invoice_no: '1002' },
    ];
    const result = buildDupInvoices(entries);
    expect(result).toHaveProperty('9001');
    expect(result['9001']).toHaveLength(2);
    expect(result).not.toHaveProperty('1002');
  });

  it('flags invoice that appears three times', () => {
    const entries = [
      { id: '1', invoice_no: 'X' },
      { id: '2', invoice_no: 'X' },
      { id: '3', invoice_no: 'X' },
    ];
    expect(buildDupInvoices(entries)['X']).toHaveLength(3);
  });

  it('ignores entries with null invoice_no', () => {
    const entries = [
      { id: '1', invoice_no: null },
      { id: '2', invoice_no: null },
    ];
    expect(buildDupInvoices(entries)).toEqual({});
  });

  it('ignores entries with empty string invoice_no', () => {
    const entries = [
      { id: '1', invoice_no: '' },
      { id: '2', invoice_no: '' },
    ];
    expect(buildDupInvoices(entries)).toEqual({});
  });

  it('ignores entries with em-dash placeholder "–"', () => {
    const entries = [
      { id: '1', invoice_no: '–' },
      { id: '2', invoice_no: '–' },
    ];
    expect(buildDupInvoices(entries)).toEqual({});
  });

  it('treats invoice numbers as case-sensitive strings', () => {
    const entries = [
      { id: '1', invoice_no: 'abc' },
      { id: '2', invoice_no: 'ABC' },
    ];
    expect(buildDupInvoices(entries)).toEqual({});
  });

  it('returns correct ids array for each duplicate', () => {
    const entries = [
      { id: 'e1', invoice_no: '500' },
      { id: 'e2', invoice_no: '500' },
    ];
    const result = buildDupInvoices(entries);
    expect(result['500']).toContain('e1');
    expect(result['500']).toContain('e2');
  });
});

// ── Running balance calculation ───────────────────────────────────────────────
// Mirrors the entriesWithBal useMemo

function computeRunningBalance(entries, totalReceived) {
  let bal = totalReceived;
  return [...entries]
    .sort((a, b) => a.entry_date < b.entry_date ? -1 : a.entry_date > b.entry_date ? 1 : a.sl_no - b.sl_no)
    .map(r => { if (r.status === 'Approved') bal -= Number(r.amount); return { ...r, runBalance: bal }; });
}

describe('computeRunningBalance() — petty cash ledger balance', () => {
  const received = 50000;

  it('returns 50000 when no approved entries', () => {
    const result = computeRunningBalance(
      [{ id: '1', entry_date: '2026-06-01', sl_no: 1, status: 'Pending', amount: 1000 }],
      received
    );
    expect(result[0].runBalance).toBe(50000);
  });

  it('deducts approved entry amounts from balance', () => {
    const entries = [
      { id: '1', entry_date: '2026-06-01', sl_no: 1, status: 'Approved', amount: 5000 },
      { id: '2', entry_date: '2026-06-02', sl_no: 2, status: 'Approved', amount: 3000 },
    ];
    const result = computeRunningBalance(entries, received);
    expect(result[0].runBalance).toBe(45000); // 50000 - 5000
    expect(result[1].runBalance).toBe(42000); // 45000 - 3000
  });

  it('does not deduct rejected entries', () => {
    const entries = [
      { id: '1', entry_date: '2026-06-01', sl_no: 1, status: 'Rejected', amount: 10000 },
    ];
    const result = computeRunningBalance(entries, received);
    expect(result[0].runBalance).toBe(50000);
  });

  it('sorts entries chronologically before computing balance', () => {
    const entries = [
      { id: '2', entry_date: '2026-06-03', sl_no: 2, status: 'Approved', amount: 2000 },
      { id: '1', entry_date: '2026-06-01', sl_no: 1, status: 'Approved', amount: 8000 },
    ];
    const result = computeRunningBalance(entries, received);
    // entry 1 (June 1) should come first
    expect(result[0].id).toBe('1');
    expect(result[0].runBalance).toBe(42000); // 50000 - 8000
    expect(result[1].runBalance).toBe(40000); // 42000 - 2000
  });

  it('allows negative balance when overspent', () => {
    const entries = [
      { id: '1', entry_date: '2026-06-01', sl_no: 1, status: 'Approved', amount: 60000 },
    ];
    const result = computeRunningBalance(entries, received);
    expect(result[0].runBalance).toBe(-10000);
  });
});
