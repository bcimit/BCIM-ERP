// src/services/journalAutoPost.js — auto-post journal entries for accounting transactions
const n = (v) => parseFloat(v) || 0;

async function nextEntryNo(client, companyId) {
  const yr = new Date().getFullYear();
  const r = await client.query(
    `SELECT COUNT(*) FROM journal_entries WHERE company_id = $1 AND EXTRACT(YEAR FROM created_at) = $2`,
    [companyId, yr]
  );
  const seq = String(parseInt(r.rows[0].count) + 1).padStart(4, '0');
  return `JE/${yr}/${seq}`;
}

async function getAccountId(client, companyId, code) {
  const r = await client.query(
    `SELECT id FROM chart_of_accounts WHERE company_id = $1 AND code = $2 AND is_active = true`,
    [companyId, code]
  );
  return r.rows[0]?.id || null;
}

/**
 * Posts an auto-generated journal entry within an existing transaction client.
 * Returns the journal_entry id, or null if the Chart of Accounts isn't seeded
 * (missing account codes) or the lines don't balance — auto-posting is best-effort
 * and never blocks the underlying business transaction.
 *
 * @param {object} client - pg transaction client
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} opts.userId
 * @param {string} opts.entryDate
 * @param {string} [opts.reference]
 * @param {string} [opts.narration]
 * @param {Array<{code: string, debit?: number, credit?: number, description?: string}>} opts.lines
 */
async function postAutoJournal(client, { companyId, userId, entryDate, reference, narration, lines }) {
  try {
    const resolved = [];
    for (const l of lines) {
      const debit = n(l.debit), credit = n(l.credit);
      if (!(debit > 0) && !(credit > 0)) continue;
      const accountId = await getAccountId(client, companyId, l.code);
      if (!accountId) return null; // COA not seeded for this code — skip auto-post
      resolved.push({ account_id: accountId, debit, credit, description: l.description || null });
    }
    if (resolved.length < 2) return null;

    const totalDebit  = resolved.reduce((s, l) => s + l.debit, 0);
    const totalCredit = resolved.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01 || totalDebit === 0) return null;

    const entry_no = await nextEntryNo(client, companyId);
    const r = await client.query(
      `INSERT INTO journal_entries (company_id, entry_no, entry_date, reference, narration, status, created_by)
       VALUES ($1,$2,$3,$4,$5,'posted',$6) RETURNING id`,
      [companyId, entry_no, entryDate, reference || null, narration || null, userId]
    );
    const jeId = r.rows[0].id;

    for (let i = 0; i < resolved.length; i++) {
      const l = resolved[i];
      await client.query(
        `INSERT INTO journal_entry_lines (journal_entry_id, account_id, debit, credit, description, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [jeId, l.account_id, l.debit, l.credit, l.description, i + 1]
      );
    }
    return jeId;
  } catch (_) {
    return null; // never fail the parent transaction over auto-posting
  }
}

module.exports = { postAutoJournal };
