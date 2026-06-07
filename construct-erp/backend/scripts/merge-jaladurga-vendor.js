const { withTransaction, pool } = require('../src/config/database');

const CANONICAL_NAME = 'Sri Jaladurga Enterprises';
const ALIASES = ['sree jaladurga enterprises', 'sri jaladurga enterprises'];

const qIdent = (value) => `"${String(value).replace(/"/g, '""')}"`;

async function main() {
  const summary = await withTransaction(async (client) => {
    const vendorRes = await client.query(`
      SELECT id, company_id, vendor_code, name, is_active, created_at
      FROM vendors
      WHERE LOWER(BTRIM(name)) = ANY($1::text[])
      ORDER BY company_id, is_active DESC, created_at ASC
      FOR UPDATE
    `, [ALIASES]);

    if (!vendorRes.rows.length) {
      return { message: 'No Jaladurga vendor records found', companies: [] };
    }

    const fkRes = await client.query(`
      SELECT tc.table_schema, tc.table_name, kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = tc.constraint_name
       AND kcu.table_schema = tc.table_schema
      JOIN information_schema.constraint_column_usage ccu
        ON ccu.constraint_name = tc.constraint_name
       AND ccu.table_schema = tc.table_schema
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND ccu.table_schema = 'public'
        AND ccu.table_name = 'vendors'
        AND ccu.column_name = 'id'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `);

    const textRes = await client.query(`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name = 'vendor_name'
        AND data_type IN ('text', 'character varying', 'character')
      ORDER BY table_name
    `);

    const byCompany = new Map();
    for (const vendor of vendorRes.rows) {
      const key = vendor.company_id || 'no-company';
      if (!byCompany.has(key)) byCompany.set(key, []);
      byCompany.get(key).push(vendor);
    }

    const companies = [];
    for (const [companyId, vendors] of byCompany.entries()) {
      const canonical =
        vendors.find(v => String(v.name || '').trim().toLowerCase() === 'sri jaladurga enterprises' && v.is_active) ||
        vendors.find(v => v.is_active) ||
        vendors[0];
      const duplicates = vendors.filter(v => v.id !== canonical.id);
      const duplicateIds = duplicates.map(v => v.id);

      await client.query(
        `UPDATE vendors SET name = $1, is_active = TRUE, updated_at = NOW() WHERE id = $2`,
        [CANONICAL_NAME, canonical.id]
      );

      let fkRows = 0;
      if (duplicateIds.length) {
        for (const ref of fkRes.rows) {
          const sql = `UPDATE ${qIdent(ref.table_schema)}.${qIdent(ref.table_name)}
                       SET ${qIdent(ref.column_name)} = $1
                       WHERE ${qIdent(ref.column_name)} = ANY($2::uuid[])`;
          const updated = await client.query(sql, [canonical.id, duplicateIds]);
          fkRows += updated.rowCount || 0;
        }

        await client.query(
          `UPDATE vendors SET is_active = FALSE, updated_at = NOW() WHERE id = ANY($1::uuid[])`,
          [duplicateIds]
        );
      }

      let textRows = 0;
      for (const col of textRes.rows) {
        const sql = `UPDATE ${qIdent(col.table_schema)}.${qIdent(col.table_name)}
                     SET ${qIdent(col.column_name)} = $1
                     WHERE LOWER(BTRIM(${qIdent(col.column_name)})) = ANY($2::text[])`;
        const updated = await client.query(sql, [CANONICAL_NAME, ALIASES]);
        textRows += updated.rowCount || 0;
      }

      companies.push({
        company_id: companyId,
        canonical_id: canonical.id,
        merged_vendor_ids: duplicateIds,
        fk_rows_updated: fkRows,
        vendor_name_rows_updated: textRows,
      });
    }

    return { message: 'Jaladurga vendor merge completed', companies };
  });

  console.log(JSON.stringify(summary, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
