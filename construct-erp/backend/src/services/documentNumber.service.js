const DOC_NUMBER_TARGETS = {
  purchase_orders: { column: 'po_number', prefix: 'PODQS' },
  work_orders: { column: 'wo_number', prefix: 'WODQS' },
};

async function getNextDqsNumber(client, targetName) {
  const target = DOC_NUMBER_TARGETS[targetName];
  if (!target) throw new Error(`Unsupported document number target: ${targetName}`);

  await client.query(`LOCK TABLE ${targetName} IN SHARE ROW EXCLUSIVE MODE`);

  const result = await client.query(
    `SELECT COALESCE(MAX((substring(UPPER(TRIM(${target.column})) FROM $1))::int), 0) + 1 AS next_seq
     FROM ${targetName}
     WHERE UPPER(TRIM(${target.column})) ~ $2`,
    [`^${target.prefix}0*([0-9]+)$`, `^${target.prefix}0*[0-9]+$`]
  );

  const nextSeq = Number(result.rows[0]?.next_seq || 1);
  return `${target.prefix}${String(nextSeq).padStart(3, '0')}`;
}

module.exports = { getNextDqsNumber };
