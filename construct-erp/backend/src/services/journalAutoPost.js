// src/services/journalAutoPost.js — auto-post journal entries for accounting transactions
const { pool } = require('../config/database');
const n = (v) => parseFloat(v) || 0;

// Entries tied to a project get their own continuous per-project sequence
// (<ProjectCode>/JE/NNNN); entries with no project (e.g. company-wide payroll,
// HO petty cash) keep the original company-wide JE/YYYY/NNNN scheme.
async function nextEntryNo(client, companyId, projectId) {
  if (projectId) {
    const p = await client.query(`SELECT project_code FROM projects WHERE id = $1`, [projectId]);
    const projectCode = p.rows[0]?.project_code;
    if (projectCode) {
      const r = await client.query(
        `SELECT COUNT(*) FROM journal_entries WHERE company_id = $1 AND project_id = $2`,
        [companyId, projectId]
      );
      const seq = String(parseInt(r.rows[0].count) + 1).padStart(4, '0');
      return `${projectCode}/JE/${seq}`;
    }
  }
  const yr = new Date().getFullYear();
  const r = await client.query(
    `SELECT COUNT(*) FROM journal_entries WHERE company_id = $1 AND project_id IS NULL AND EXTRACT(YEAR FROM created_at) = $2`,
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
 * Returns the journal_entry id, or null if COA is missing or lines don't balance.
 * Never throws — auto-posting must never block the parent transaction.
 *
 * @param {object} client - pg transaction client
 * @param {object} opts
 * @param {string} opts.companyId
 * @param {string} opts.userId
 * @param {string} opts.entryDate
 * @param {string} [opts.projectId] - when set, entry_no becomes <ProjectCode>/JE/NNNN
 *   on a sequence scoped to that project instead of the company-wide JE/YYYY/NNNN one
 * @param {string} [opts.reference]
 * @param {string} [opts.narration]
 * @param {string} [opts.source]  - 'auto_payment' | 'auto_invoice' | 'auto_petty_cash' | 'auto_recurring' | 'manual'
 * @param {Array<{code: string, debit?: number, credit?: number, description?: string}>} opts.lines
 */
async function postAutoJournal(client, { companyId, userId, entryDate, projectId, reference, narration, source, lines }) {
  try {
    const resolved = [];
    for (const l of lines) {
      const debit = n(l.debit), credit = n(l.credit);
      if (!(debit > 0) && !(credit > 0)) continue;
      const accountId = await getAccountId(client, companyId, l.code);
      if (!accountId) return null; // COA not seeded for this code — skip silently
      resolved.push({ account_id: accountId, debit, credit, description: l.description || null });
    }
    if (resolved.length < 2) return null;

    const totalDebit  = resolved.reduce((s, l) => s + l.debit, 0);
    const totalCredit = resolved.reduce((s, l) => s + l.credit, 0);
    if (Math.abs(totalDebit - totalCredit) > 0.01 || totalDebit === 0) return null;

    const entry_no = await nextEntryNo(client, companyId, projectId);
    const r = await client.query(
      `INSERT INTO journal_entries (company_id, entry_no, entry_date, project_id, reference, narration, status, source, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,'posted',$7,$8) RETURNING id`,
      [companyId, entry_no, entryDate, projectId || null, reference || null, narration || null, source || 'auto', userId]
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

/**
 * Standalone version — opens its own DB client when there's no parent transaction.
 * Use this in routes that don't use withTransaction (e.g. petty cash approval).
 */
async function postAutoJournalStandalone(opts) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const jeId = await postAutoJournal(client, opts);
    await client.query('COMMIT');
    return jeId;
  } catch (_) {
    await client.query('ROLLBACK').catch(() => {});
    return null;
  } finally {
    client.release();
  }
}

module.exports = { postAutoJournal, postAutoJournalStandalone, nextEntryNo };
