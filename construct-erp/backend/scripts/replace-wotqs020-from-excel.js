require('dotenv').config();

const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');
const { v4: uuid } = require('uuid');
const { pool } = require('../src/config/database');

const SOURCE_FILE = process.argv[2] || 'C:/Users/BCIMIT/Downloads/work order copies - TQS/WOTQS020-Business Access Technologies.xlsx';
const UPLOADS_DIR = path.join(__dirname, '../uploads/documents');

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();
const titleCase = (value) => clean(value).toLowerCase().replace(/\b[a-z]/g, (char) => char.toUpperCase());
const n = (value) => {
  if (value == null || value === '') return 0;
  const raw = String(value).replace(/[₹,\s]/g, '').replace(/-/g, '0');
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : 0;
};

function excelDate(value) {
  const text = clean(value);
  const match = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, '0');
  const month = match[2].padStart(2, '0');
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${month}-${day}`;
}

function findValue(rows, label) {
  const wanted = label.toLowerCase();
  for (const row of rows) {
    const idx = row.findIndex((cell) => clean(cell).toLowerCase().replace(/\s+/g, ' ').includes(wanted));
    if (idx >= 0) {
      for (let c = idx + 1; c < row.length; c += 1) {
        const value = clean(row[c]);
        if (value) return value;
      }
    }
  }
  return '';
}

function parseItems(rows) {
  const headerIdx = rows.findIndex((row) => clean(row[0]).toLowerCase() === 'sl no' && clean(row[1]).toLowerCase().includes('description'));
  if (headerIdx < 0) throw new Error('Line item header not found in Excel');

  const items = [];
  for (let r = headerIdx + 1; r < rows.length; r += 1) {
    const row = rows[r];
    const marker = clean(row[3] || row[0]).toLowerCase();
    if (marker === 'total' || marker.includes('gst @') || marker.includes('net total')) break;
    if (!clean(row[0]) || !clean(row[1])) continue;

    const qtyText = clean(row[4]);
    const quantity = /^r\/?o$/i.test(qtyText) ? 0 : n(qtyText);
    const rate = n(row[5]);
    const amount = n(row[6]);
    items.push({
      description: clean(row[1]),
      unit: clean(row[3]) || 'LS',
      quantity,
      rate,
      amount,
      remarks: /^r\/?o$/i.test(qtyText) ? 'Quantity as per actual / running order' : null,
    });
  }
  return items;
}

function parseTerms(rows) {
  const start = rows.findIndex((row) => clean(row[0]).toLowerCase().startsWith('terms'));
  const terms = [];
  for (let r = Math.max(0, start + 1); r < rows.length; r += 1) {
    const row = rows[r];
    const no = clean(row[0]);
    const text = clean(row[1] || row[0]);
    if (!text) continue;
    if (/checked by/i.test(text)) continue;
    if (/^director$/i.test(text) || /managing director/i.test(text)) continue;
    if (/^\d+$/.test(no)) terms.push(`${no}. ${text}`);
    else if (terms.length && text.length > 20) terms.push(text);
  }
  return terms.join('\n');
}

function amountBeside(rows, label) {
  const wanted = label.toLowerCase();
  const row = rows.find((r) => r.some((cell) => clean(cell).toLowerCase() === wanted));
  if (!row) return 0;
  for (let c = row.length - 1; c >= 0; c -= 1) {
    const amount = n(row[c]);
    if (amount) return amount;
  }
  return 0;
}

function parseWorkbook(file) {
  const wb = XLSX.readFile(file, { cellDates: false });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

  const woNumber = findValue(rows, 'Work Order No').toUpperCase();
  const woDate = excelDate(findValue(rows, 'Work Order Date'));
  const vendorName = titleCase(clean(rows[7]?.[3] || '').replace(/^M\/s\.\s*/i, ''));
  const address = [rows[8]?.[3], rows[9]?.[3]].map(clean).filter(Boolean).join(', ');
  const email = (clean(rows[10]?.[3]).match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i) || [''])[0];
  const contactLine = clean(rows[11]?.[3]);
  const contactPerson = clean(contactLine.replace(/^Contact Person:\s*/i, '').replace(/\d[\d\s]+$/, ''));
  const phone = (contactLine.match(/(\d[\d\s]{8,}\d)/) || [''])[0].replace(/\s+/g, '');
  const gstNumber = clean(rows[16]?.[3]);
  const panNumber = clean(rows[17]?.[3]);
  const projectName = findValue(rows, 'Project Name');
  const placeRows = [rows[19]?.[3], rows[20]?.[3], rows[21]?.[3]].map(clean).filter(Boolean);
  const bcimContact = clean(rows[22]?.[3]).replace(/^Contact Person BCIM:\s*/i, '');
  const bcimPhone = clean(rows[23]?.[3]).replace(/^Contact Number:\s*/i, '');
  const narration = clean((rows.find((row) => clean(row[0]).startsWith('Narration:')) || [])[0]).replace(/^Narration:\s*/i, '');
  const items = parseItems(rows);
  const basicAmount = amountBeside(rows, 'TOTAL') || items.reduce((sum, item) => sum + item.amount, 0);
  const gstAmount = amountBeside(rows, 'GST @ 18%');
  const netTotal = amountBeside(rows, 'NET TOTAL') || basicAmount + gstAmount;
  const terms = parseTerms(rows);

  if (woNumber !== 'WOTQS020') throw new Error(`Expected WOTQS020, found ${woNumber || 'blank'}`);
  if (!vendorName) throw new Error('Vendor name not found');
  if (!items.length) throw new Error('No line items parsed');

  return {
    woNumber,
    woDate,
    vendorName,
    address,
    email,
    contactPerson,
    phone,
    gstNumber,
    panNumber,
    projectName,
    placeOfWork: placeRows.join(' '),
    bcimContact,
    bcimPhone,
    narration,
    basicAmount,
    gstAmount,
    netTotal,
    terms,
    items,
  };
}

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) throw new Error(`Excel file not found: ${SOURCE_FILE}`);
  const data = parseWorkbook(SOURCE_FILE);
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const woRes = await client.query(
      `SELECT *
         FROM work_orders
        WHERE UPPER(TRIM(wo_number)) = $1
        FOR UPDATE`,
      [data.woNumber]
    );
    if (!woRes.rows.length) throw new Error(`${data.woNumber} not found in work_orders`);
    const wo = woRes.rows[0];

    const userRes = await client.query(
      `SELECT id, company_id FROM users WHERE role = 'super_admin' ORDER BY created_at LIMIT 1`
    );
    if (!userRes.rows.length) throw new Error('No super_admin user found');
    const { id: userId, company_id: companyId } = userRes.rows[0];

    let vendorId = wo.vendor_id;
    if (!vendorId) {
      const vendorCode = `VEN-WOTQS020`;
      const created = await client.query(
        `INSERT INTO vendors (company_id, vendor_code, name, vendor_type, contact_person, phone, email, address, state, gstin, pan, gst_number, pan_number, is_active)
         VALUES ($1,$2,$3,'subcontractor',$4,$5,$6,$7,'Karnataka',$8,$9,$8,$9,TRUE)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [companyId, vendorCode, data.vendorName, data.contactPerson || data.vendorName, data.phone || null, data.email || null, data.address || null, data.gstNumber || null, data.panNumber || null]
      );
      vendorId = created.rows[0]?.id;
      if (!vendorId) {
        const found = await client.query(`SELECT id FROM vendors WHERE company_id=$1 AND LOWER(TRIM(name))=LOWER(TRIM($2)) LIMIT 1`, [companyId, data.vendorName]);
        vendorId = found.rows[0]?.id;
      }
    }

    if (vendorId) {
      await client.query(
        `UPDATE vendors
            SET name = $2,
                contact_person = COALESCE(NULLIF($3,''), contact_person),
                phone = COALESCE(NULLIF($4,''), phone),
                email = COALESCE(NULLIF($5,''), email),
                address = COALESCE(NULLIF($6,''), address),
                gstin = COALESCE(NULLIF($7,''), gstin),
                gst_number = COALESCE(NULLIF($7,''), gst_number),
                pan = COALESCE(NULLIF($8,''), pan),
                pan_number = COALESCE(NULLIF($8,''), pan_number),
                vendor_type = COALESCE(vendor_type, 'subcontractor'),
                vendor_category = COALESCE(vendor_category, 'subcontractor'),
                updated_at = NOW()
          WHERE id = $1`,
        [vendorId, data.vendorName, data.contactPerson, data.phone, data.email, data.address, data.gstNumber, data.panNumber]
      );
    }

    const scopeOfWork = [
      `Narration: ${data.narration}`,
      `Project: ${data.projectName}`,
      `Place of Work: ${data.placeOfWork}`,
      `BCIM Contact: ${data.bcimContact}`,
      `Contact Number: ${data.bcimPhone}`,
      `Source Excel: ${path.basename(SOURCE_FILE)}`,
      `Basic: ${data.basicAmount.toFixed(2)}`,
      `GST @ 18%: ${data.gstAmount.toFixed(2)}`,
      `Net Total: ${data.netTotal.toFixed(2)}`,
    ].filter((line) => !line.endsWith(': ') && !line.endsWith(':')).join('\n');

    await client.query(
      `UPDATE work_orders
          SET vendor_id = COALESCE($2, vendor_id),
              wo_date = $3,
              subject = $4,
              work_description = $4,
              scope_of_work = $5,
              terms_conditions = $6,
              total_value = $7,
              contract_amount = $7,
              status = 'approved',
              updated_at = NOW()
        WHERE id = $1`,
      [wo.id, vendorId, data.woDate, data.narration || 'Hiring of Printer for TQS, Yelahanka, Bangalore', scopeOfWork, data.terms, data.netTotal]
    );

    const oldItems = await client.query(`SELECT COUNT(*)::int AS count FROM work_order_items WHERE wo_id = $1`, [wo.id]);
    await client.query(`DELETE FROM work_order_items WHERE wo_id = $1`, [wo.id]);
    for (const item of data.items) {
      await client.query(
        `INSERT INTO work_order_items (wo_id, description, unit, quantity, rate, remarks)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [wo.id, item.description, item.unit, item.quantity, item.rate, item.remarks]
      );
    }

    const oldDocs = await client.query(
      `DELETE FROM documents WHERE module = 'work_order' AND module_record_id = $1 RETURNING id, file_name`,
      [wo.id]
    );

    const destName = `${uuid()}.xlsx`;
    fs.copyFileSync(SOURCE_FILE, path.join(UPLOADS_DIR, destName));
    const fileSize = fs.statSync(SOURCE_FILE).size;
    await client.query(
      `INSERT INTO documents
         (company_id, project_id, module, module_record_id, file_name, file_type, file_size, local_url, tags, uploaded_by,
          doc_number, doc_title, doc_type, status, metadata)
       VALUES ($1,$2,'work_order',$3,$4,'xlsx',$5,$6,$7,$8,$9,$10,'work_order','approved',$11)`,
      [
        companyId,
        wo.project_id,
        wo.id,
        path.basename(SOURCE_FILE),
        fileSize,
        `/uploads/documents/${destName}`,
        ['work-order', 'wotqs', 'excel'],
        userId,
        data.woNumber,
        `${data.woNumber} - ${data.vendorName}`,
        JSON.stringify({ source_path: SOURCE_FILE, replaced_old_documents: oldDocs.rows.map((doc) => doc.file_name) }),
      ]
    );

    await client.query('COMMIT');
    console.log(JSON.stringify({
      wo_number: data.woNumber,
      vendor: data.vendorName,
      wo_date: data.woDate,
      old_items_deleted: oldItems.rows[0].count,
      new_items_inserted: data.items.length,
      old_documents_removed: oldDocs.rows.map((doc) => doc.file_name),
      total_value: data.netTotal,
      items: data.items,
    }, null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
