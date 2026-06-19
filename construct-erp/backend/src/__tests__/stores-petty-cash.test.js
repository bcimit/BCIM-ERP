const request = require('supertest');
const jwt     = require('jsonwebtoken');

jest.mock('../config/database', () => ({
  query:           jest.fn().mockResolvedValue({ rows: [] }),
  withTransaction: jest.fn(),
  pool:            { query: jest.fn().mockResolvedValue({ rows: [] }), on: jest.fn() },
}));

const { query, withTransaction } = require('../config/database');
const app = require('../server');

const JWT_SECRET = process.env.JWT_SECRET;

const makeToken = (role = 'store_keeper') =>
  jwt.sign({ id: 'user-1', role, company_id: 'co-1' }, JWT_SECRET, { expiresIn: '1h' });

const activeUser = (role = 'store_keeper') => ({
  id: 'user-1', role, company_id: 'co-1', is_active: true,
});

const sampleEntry = {
  id: 'entry-1', sl_no: 1, company_id: 'co-1', project_id: 'proj-1',
  entry_date: '2026-06-15', supplier: 'Ponam Hardware', invoice_no: '49045',
  amount: 2562, status: 'Pending', bill_file_url: null, bill_file_name: null,
  project_name: 'Yelahanka', created_by_name: 'Store Keeper',
  items: [{ id: 'item-1', material_name: 'Safety Gloves', unit: "NO'S", quantity: 10 }],
};

const sampleReceipt = {
  id: 'rec-1', company_id: 'co-1', project_id: 'proj-1',
  receipt_date: '2026-06-01', amount: 50000,
  received_by: 'Site Incharge', voucher_no: 'HO-PC-001',
};

// Helper: mock authenticate + one or more query calls
const auth = (role = 'store_keeper') =>
  query.mockResolvedValueOnce({ rows: [activeUser(role)] });

// Mock withTransaction to execute the callback with a mock client
const mockTx = (...clientResponses) => {
  withTransaction.mockImplementationOnce(async (fn) => {
    const client = { query: jest.fn() };
    clientResponses.forEach(r => client.query.mockResolvedValueOnce(r));
    return fn(client);
  });
};

// Mock getEntry (called after write operations — 2 queries: entry row + items)
const mockGetEntry = (entry = sampleEntry) => {
  query
    .mockResolvedValueOnce({ rows: [entry] })
    .mockResolvedValueOnce({ rows: entry.items || [] });
};

beforeEach(() => {
  jest.resetAllMocks();
  // After reset, restore safe defaults so background async IIFEs don't throw
  query.mockResolvedValue({ rows: [] });
  withTransaction.mockImplementation(async (fn) => {
    const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
    return fn(client);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// LOCAL PURCHASE ENTRIES
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/stores-petty-cash/entries', () => {
  it('returns entry list for authenticated user', async () => {
    auth();
    query
      .mockResolvedValueOnce({ rows: [sampleEntry] })
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ total_amount: '2562' }] });

    const res = await request(app)
      .get('/api/v1/stores-petty-cash/entries')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].supplier).toBe('Ponam Hardware');
    expect(res.body.total).toBe(1);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/stores-petty-cash/entries');
    expect(res.status).toBe(401);
  });

  it('filters by project_id, status, and search', async () => {
    auth();
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [{ total_amount: '0' }] });

    const res = await request(app)
      .get('/api/v1/stores-petty-cash/entries?project_id=proj-1&status=Approved&search=gloves')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    const sql = query.mock.calls[1][0];
    expect(sql).toContain('e.project_id');
    expect(sql).toContain('e.status');
  });
});

// ─── POST /entries ────────────────────────────────────────────────────────────

describe('POST /api/v1/stores-petty-cash/entries', () => {
  const validPayload = {
    entry_date: '2026-06-15', supplier: 'Ponam Hardware',
    invoice_no: '49045', amount: 2562,
    items: [{ material_name: 'Safety Gloves', unit: "NO'S", quantity: 10 }],
  };

  it('creates entry and returns 201', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [] }); // duplicate check → no match
    mockTx(
      { rows: [{ last: '0' }] },              // nextSlNo
      { rows: [{ id: 'entry-1' }] },          // INSERT entry
      { rows: [] },                            // INSERT item
    );
    mockGetEntry();

    const res = await request(app)
      .post('/api/v1/stores-petty-cash/entries')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(validPayload);

    expect(res.status).toBe(201);
    expect(res.body.data.supplier).toBe('Ponam Hardware');
  });

  it('returns 409 DUPLICATE_INVOICE when invoice already exists', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [{ id: 'old-entry', sl_no: 3, supplier: 'Old Vendor', entry_date: '2026-05-01' }] });

    const res = await request(app)
      .post('/api/v1/stores-petty-cash/entries')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(validPayload);

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('DUPLICATE_INVOICE');
    expect(res.body.existing.sl_no).toBe(3);
  });

  it('bypasses duplicate check when force=true is sent', async () => {
    auth();
    // No duplicate query should run because force=true
    mockTx(
      { rows: [{ last: '2' }] },
      { rows: [{ id: 'entry-2' }] },
      { rows: [] },
    );
    mockGetEntry({ ...sampleEntry, id: 'entry-2', sl_no: 3 });

    const res = await request(app)
      .post('/api/v1/stores-petty-cash/entries')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...validPayload, force: true });

    expect(res.status).toBe(201);
    // Duplicate check query was NOT called (only auth + getEntry queries use main `query`)
    const callSqls = query.mock.calls.map(c => c[0]);
    expect(callSqls.some(sql => sql && sql.includes('invoice_no=$2') && !sql.includes('id !=')))
      .toBe(false);
  });

  it('returns 400 when supplier is missing', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/stores-petty-cash/entries')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ entry_date: '2026-06-15', items: [{ material_name: 'Gloves' }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/supplier/i);
  });

  it('returns 400 when entry_date is missing', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/stores-petty-cash/entries')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ supplier: 'Test', items: [{ material_name: 'Gloves' }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/entry_date/i);
  });

  it('returns 400 when no material items provided', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/stores-petty-cash/entries')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ entry_date: '2026-06-15', supplier: 'Test', items: [] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/material/i);
  });

  it('skips duplicate check for null/empty invoice_no', async () => {
    auth();
    mockTx(
      { rows: [{ last: '0' }] },
      { rows: [{ id: 'entry-1' }] },
      { rows: [] },
    );
    mockGetEntry({ ...sampleEntry, invoice_no: null });

    const res = await request(app)
      .post('/api/v1/stores-petty-cash/entries')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ ...validPayload, invoice_no: '' });

    expect(res.status).toBe(201);
  });
});

// ─── PUT /entries/:id ─────────────────────────────────────────────────────────

describe('PUT /api/v1/stores-petty-cash/entries/:id', () => {
  const updatePayload = {
    entry_date: '2026-06-15', supplier: 'Ponam Hardware',
    invoice_no: '49045', amount: 3000,
    items: [{ material_name: 'Safety Gloves', unit: "NO'S", quantity: 12 }],
  };

  it('updates entry and returns 200', async () => {
    auth();
    // getEntry (existence check)
    query
      .mockResolvedValueOnce({ rows: [sampleEntry] })
      .mockResolvedValueOnce({ rows: sampleEntry.items });
    // duplicate check → no other entry with same invoice (empty = self excluded)
    query.mockResolvedValueOnce({ rows: [] });
    // withTransaction
    mockTx(
      { rows: [] },  // UPDATE entry
      { rows: [] },  // DELETE old items
      { rows: [] },  // INSERT new item
    );
    mockGetEntry({ ...sampleEntry, amount: 3000 });

    const res = await request(app)
      .put('/api/v1/stores-petty-cash/entries/entry-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
  });

  it('returns 409 when another entry already uses the invoice_no', async () => {
    auth();
    query
      .mockResolvedValueOnce({ rows: [sampleEntry] })
      .mockResolvedValueOnce({ rows: sampleEntry.items });
    // duplicate check → another entry has same invoice
    query.mockResolvedValueOnce({ rows: [{ id: 'other-entry', sl_no: 7, supplier: 'Different', entry_date: '2026-04-01' }] });

    const res = await request(app)
      .put('/api/v1/stores-petty-cash/entries/entry-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(updatePayload);

    expect(res.status).toBe(409);
    expect(res.body.errorCode).toBe('DUPLICATE_INVOICE');
  });

  it('does not flag 409 for own invoice_no when updating', async () => {
    auth();
    query
      .mockResolvedValueOnce({ rows: [sampleEntry] })
      .mockResolvedValueOnce({ rows: sampleEntry.items });
    query.mockResolvedValueOnce({ rows: [] }); // duplicate check with AND id != 'entry-1' → empty
    mockTx({ rows: [] }, { rows: [] }, { rows: [] });
    mockGetEntry(sampleEntry);

    const res = await request(app)
      .put('/api/v1/stores-petty-cash/entries/entry-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(updatePayload);

    expect(res.status).toBe(200);
  });

  it('returns 404 for non-existent entry', async () => {
    auth();
    query
      .mockResolvedValueOnce({ rows: [] })  // getEntry → not found
      .mockResolvedValueOnce({ rows: [] }); // items (empty)

    const res = await request(app)
      .put('/api/v1/stores-petty-cash/entries/bad-id')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send(updatePayload);

    expect(res.status).toBe(404);
  });
});

// ─── PATCH /entries/:id/status ────────────────────────────────────────────────

describe('PATCH /api/v1/stores-petty-cash/entries/:id/status', () => {
  it('approves an entry', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [{ ...sampleEntry, status: 'Approved' }] });

    const res = await request(app)
      .patch('/api/v1/stores-petty-cash/entries/entry-1/status')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'Approved' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Approved');
  });

  it('rejects an entry', async () => {
    auth('admin');
    query.mockResolvedValueOnce({ rows: [{ ...sampleEntry, status: 'Rejected' }] });

    const res = await request(app)
      .patch('/api/v1/stores-petty-cash/entries/entry-1/status')
      .set('Authorization', `Bearer ${makeToken('admin')}`)
      .send({ status: 'Rejected' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Rejected');
  });

  it('returns 400 for invalid status value', async () => {
    auth();
    const res = await request(app)
      .patch('/api/v1/stores-petty-cash/entries/entry-1/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'DONE' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Pending|Approved|Rejected/);
  });

  it('returns 404 when entry not in this company', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [] }); // UPDATE returns nothing

    const res = await request(app)
      .patch('/api/v1/stores-petty-cash/entries/no-such-entry/status')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ status: 'Approved' });

    expect(res.status).toBe(404);
  });
});

// ─── DELETE /entries/:id ──────────────────────────────────────────────────────

describe('DELETE /api/v1/stores-petty-cash/entries/:id', () => {
  it('deletes entry and returns success', async () => {
    auth();
    query
      .mockResolvedValueOnce({ rows: [sampleEntry] })
      .mockResolvedValueOnce({ rows: sampleEntry.items })
      .mockResolvedValueOnce({ rows: [] }); // DELETE

    const res = await request(app)
      .delete('/api/v1/stores-petty-cash/entries/entry-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for non-existent entry', async () => {
    auth();
    query
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/v1/stores-petty-cash/entries/bad-id')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// HO RECEIPTS
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/stores-petty-cash/receipts', () => {
  it('returns receipt list with total_amount', async () => {
    auth();
    query
      .mockResolvedValueOnce({ rows: [sampleReceipt] })
      .mockResolvedValueOnce({ rows: [{ total: '50000' }] });

    const res = await request(app)
      .get('/api/v1/stores-petty-cash/receipts')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.total_amount).toBe(50000);
  });
});

describe('POST /api/v1/stores-petty-cash/receipts', () => {
  it('creates a receipt and returns 201', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [sampleReceipt] });

    const res = await request(app)
      .post('/api/v1/stores-petty-cash/receipts')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ receipt_date: '2026-06-01', amount: 50000, received_by: 'Site Incharge', voucher_no: 'HO-PC-001' });

    expect(res.status).toBe(201);
    expect(res.body.data.voucher_no).toBe('HO-PC-001');
  });

  it('returns 400 when receipt_date is missing', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/stores-petty-cash/receipts')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ amount: 50000 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/receipt_date/i);
  });

  it('returns 400 when amount is zero', async () => {
    auth();
    const res = await request(app)
      .post('/api/v1/stores-petty-cash/receipts')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ receipt_date: '2026-06-01', amount: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/amount/i);
  });
});

describe('PUT /api/v1/stores-petty-cash/receipts/:id', () => {
  it('updates receipt and returns 200', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [{ ...sampleReceipt, amount: 60000 }] });

    const res = await request(app)
      .put('/api/v1/stores-petty-cash/receipts/rec-1')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ receipt_date: '2026-06-01', amount: 60000, received_by: 'PM' });

    expect(res.status).toBe(200);
    expect(res.body.data.amount).toBe(60000);
  });

  it('returns 404 for unknown receipt', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/v1/stores-petty-cash/receipts/bad-id')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ receipt_date: '2026-06-01', amount: 1000 });

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/v1/stores-petty-cash/receipts/:id', () => {
  it('deletes receipt and returns success', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [{ id: 'rec-1' }] });

    const res = await request(app)
      .delete('/api/v1/stores-petty-cash/receipts/rec-1')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 404 for unknown receipt', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/v1/stores-petty-cash/receipts/bad-id')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(404);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BUDGETS
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/stores-petty-cash/budgets', () => {
  it('returns budgets keyed by category', async () => {
    auth();
    query.mockResolvedValueOnce({
      rows: [
        { category: 'Fuel', monthly_cap: '3000' },
        { category: 'Safety', monthly_cap: '12000' },
      ],
    });

    const res = await request(app)
      .get('/api/v1/stores-petty-cash/budgets')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data.Fuel).toBe(3000);
    expect(res.body.data.Safety).toBe(12000);
  });

  it('returns empty object when no budgets set', async () => {
    auth();
    query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/v1/stores-petty-cash/budgets')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toEqual({});
  });
});

describe('PUT /api/v1/stores-petty-cash/budgets', () => {
  it('upserts all category budgets and returns success', async () => {
    auth();
    withTransaction.mockImplementationOnce(async (fn) => {
      const client = { query: jest.fn().mockResolvedValue({ rows: [] }) };
      return fn(client);
    });

    const res = await request(app)
      .put('/api/v1/stores-petty-cash/budgets')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({ budgets: { Fuel: 3000, Safety: 12000, Materials: 15000 } });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('returns 400 when budgets object is missing', async () => {
    auth();
    const res = await request(app)
      .put('/api/v1/stores-petty-cash/budgets')
      .set('Authorization', `Bearer ${makeToken()}`)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/budgets/i);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════════════════════════════════════════════

describe('GET /api/v1/stores-petty-cash/summary', () => {
  it('returns financial summary with cash_in_hand', async () => {
    auth();
    query
      .mockResolvedValueOnce({ rows: [{ total: '45000', count: '18' }] }) // local purchases
      .mockResolvedValueOnce({ rows: [{ total: '5000',  count: '2'  }] }) // advances
      .mockResolvedValueOnce({ rows: [{ total: '70000', count: '3'  }] }) // receipts
      .mockResolvedValueOnce({ rows: [{ count: '3' }] });                 // pending count

    const res = await request(app)
      .get('/api/v1/stores-petty-cash/summary')
      .set('Authorization', `Bearer ${makeToken()}`);

    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.local_purchase_total).toBe(45000);
    expect(d.advance_total).toBe(5000);
    expect(d.receipt_total).toBe(70000);
    expect(d.grand_spent).toBe(50000);          // 45000 + 5000
    expect(d.cash_in_hand).toBe(20000);         // 70000 − 50000
    expect(d.pending_count).toBe(3);
  });

  it('returns 401 when not authenticated', async () => {
    const res = await request(app).get('/api/v1/stores-petty-cash/summary');
    expect(res.status).toBe(401);
  });
});
