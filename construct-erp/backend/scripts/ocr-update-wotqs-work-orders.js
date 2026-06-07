require('dotenv').config();

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');
const { createWorker } = require('../../frontend/node_modules/tesseract.js');
const { pool } = require('../src/config/database');

const DEFAULT_DIR = 'D:/QS SHARE/QS WORKINGS/DQS/WO';
const WO_DIR = process.argv[2] || DEFAULT_DIR;
const TMP_DIR = path.join(os.tmpdir(), 'construct-erp-wotqs-ocr');

function parseFilename(fileName) {
  const base = fileName.replace(/\.pdf$/i, '').trim();
  const match = base.match(/^(WOTQS\d+(?:-A\d+)?)-(.+)$/i);
  if (match) return { woNumber: match[1].toUpperCase(), vendorName: match[2].trim(), fileName };
  const dash = base.indexOf('-');
  return {
    woNumber: (dash > 0 ? base.slice(0, dash) : base).trim().toUpperCase(),
    vendorName: (dash > 0 ? base.slice(dash + 1) : '').trim(),
    fileName,
  };
}

function dedupeRecords(records) {
  const byNumber = new Map();
  for (const record of records) {
    const existing = byNumber.get(record.woNumber);
    if (!existing || record.fileName.trim().length > existing.fileName.trim().length) {
      byNumber.set(record.woNumber, record);
    }
  }
  return [...byNumber.values()].sort((a, b) => a.woNumber.localeCompare(b.woNumber, undefined, { numeric: true }));
}

function renderFirstPage(pdfPath, imagePath) {
  const py = `
import fitz, sys
doc = fitz.open(sys.argv[1])
page = doc[0]
pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=False)
pix.save(sys.argv[2])
`;
  execFileSync('python', ['-c', py, pdfPath, imagePath], { stdio: 'pipe' });
}

function toIsoDate(value) {
  const match = String(value || '').match(/(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{2,4})/);
  if (!match) return null;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${match[2].padStart(2, '0')}-${match[1].padStart(2, '0')}`;
}

function parseAmountToken(token) {
  const cleaned = String(token || '').replace(/[^\d.]/g, '');
  if (!cleaned) return 0;
  return Number.parseFloat(cleaned) || 0;
}

function bestAmountFromLine(line) {
  const tokens = String(line || '').match(/\d[\d,]*(?:\.\d+)?/g) || [];
  const amounts = tokens.map(parseAmountToken).filter((n) => Number.isFinite(n) && n > 0);
  return amounts.length ? amounts[amounts.length - 1] : 0;
}

function extractAmount(text) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const netLine = lines.find((line) => /NET\s+TOTAL/i.test(line));
  if (netLine) {
    const amount = bestAmountFromLine(netLine);
    if (amount) return amount;
  }

  const rupeesIdx = lines.findIndex((line) => /\(Rupees/i.test(line));
  if (rupeesIdx > 0) {
    for (let i = rupeesIdx - 1; i >= Math.max(0, rupeesIdx - 5); i -= 1) {
      const amount = bestAmountFromLine(lines[i]);
      if (amount) return amount;
    }
  }

  const totalLines = lines.filter((line) => /\bTOTAL\b/i.test(line));
  for (let i = totalLines.length - 1; i >= 0; i -= 1) {
    const amount = bestAmountFromLine(totalLines[i]);
    if (amount) return amount;
  }
  return 0;
}

function matchAfter(text, label, fallback = '') {
  const re = new RegExp(`${label}\\s*[:#-]?\\s*([^\\n]+)`, 'i');
  const match = text.match(re);
  return match ? match[1].replace(/\s+/g, ' ').trim() : fallback;
}

function cleanSubject(value, fallback) {
  const subject = String(value || '').replace(/\s+/g, ' ').trim();
  if (!subject || subject.length < 4) return fallback;
  return subject.replace(/[|[\]]/g, '').trim();
}

function parseOcr(text, record) {
  const date =
    toIsoDate(matchAfter(text, 'Work\\s*Order\\s*Date')) ||
    toIsoDate(matchAfter(text, 'Date'));
  const contractor = matchAfter(text, 'Contractor\\s+M\\/s\\.?', record.vendorName);
  const narration = matchAfter(text, 'Narration', '');
  const projectName = matchAfter(text, 'Project\\s*Name', 'TQS');
  const placeOfWork = matchAfter(text, 'Place\\s*of\\s*Work', '');
  const contactPerson = matchAfter(text, 'Contact\\s*Person\\s*BCIM', '');
  const contactNumber = matchAfter(text, 'Contact\\s*Number', '');
  const amount = extractAmount(text);
  const subject = cleanSubject(narration, `${/-A\d+$/i.test(record.woNumber) ? 'Amended WO' : 'Work Order'} - ${contractor || record.vendorName}`);

  const scopeParts = [
    narration ? `Narration: ${narration}` : '',
    projectName ? `Project: ${projectName}` : '',
    placeOfWork ? `Place of Work: ${placeOfWork}` : '',
    contactPerson ? `BCIM Contact: ${contactPerson}` : '',
    contactNumber ? `Contact Number: ${contactNumber}` : '',
    `Source PDF: ${record.fileName}`,
  ].filter(Boolean);

  return {
    woNumber: record.woNumber,
    date,
    contractor,
    amount,
    subject,
    scope: scopeParts.join('\n'),
    rawText: text,
  };
}

async function main() {
  if (!fs.existsSync(WO_DIR)) throw new Error(`WO folder not found: ${WO_DIR}`);
  fs.mkdirSync(TMP_DIR, { recursive: true });

  const records = dedupeRecords(
    fs.readdirSync(WO_DIR)
      .filter((file) => /^WOTQS.*\.pdf$/i.test(file))
      .map(parseFilename)
  );

  const worker = await createWorker('eng');
  const client = await pool.connect();
  const summary = { updated: 0, skipped: 0, no_amount: [], no_date: [], items_created: 0 };

  try {
    await client.query('BEGIN');
    for (const record of records) {
      const pdfPath = path.join(WO_DIR, record.fileName);
      const imagePath = path.join(TMP_DIR, `${record.woNumber}.png`);
      renderFirstPage(pdfPath, imagePath);

      const ocr = await worker.recognize(imagePath);
      const parsed = parseOcr(ocr.data.text || '', record);
      const woRes = await client.query(
        `SELECT id FROM work_orders WHERE UPPER(TRIM(wo_number)) = $1`,
        [record.woNumber]
      );
      if (!woRes.rows.length) {
        summary.skipped += 1;
        continue;
      }

      const woId = woRes.rows[0].id;
      await client.query(
        `UPDATE work_orders
         SET subject = $2,
             work_description = $2,
             scope_of_work = $3,
             start_date = COALESCE($4::date, start_date),
             total_value = CASE WHEN $5::numeric > 0 THEN $5::numeric ELSE total_value END,
             contract_amount = CASE WHEN $5::numeric > 0 THEN $5::numeric ELSE contract_amount END,
             updated_at = NOW()
         WHERE id = $1`,
        [woId, parsed.subject, parsed.scope, parsed.date, parsed.amount]
      );

      const itemCount = await client.query(`SELECT COUNT(*)::int AS count FROM work_order_items WHERE wo_id = $1`, [woId]);
      if (itemCount.rows[0].count === 0 && parsed.amount > 0) {
        await client.query(
          `INSERT INTO work_order_items (wo_id, description, unit, quantity, rate, remarks)
           VALUES ($1, $2, 'LS', 1, $3, 'OCR summary line from scanned work order')`,
          [woId, parsed.subject, parsed.amount]
        );
        summary.items_created += 1;
      }

      if (!parsed.amount) summary.no_amount.push(record.woNumber);
      if (!parsed.date) summary.no_date.push(record.woNumber);
      summary.updated += 1;
      console.log(`${record.woNumber}: date=${parsed.date || '-'} amount=${parsed.amount || 0} subject=${parsed.subject}`);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await worker.terminate();
    await pool.end();
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
