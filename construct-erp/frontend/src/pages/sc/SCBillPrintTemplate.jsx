import React, { forwardRef } from 'react';
import { safeInr as inr, safeDate, PrintPage, PrintFooter } from '../qs/PrintComponents';
import bcimLogo from '../../assets/bcim-logo.png';

const num = (v) => parseFloat(v || 0);
const pct = (v) => `${parseFloat(v || 0).toFixed(1)}%`;

// ─── Header ───────────────────────────────────────────────────────────────────
const Header = ({ bill }) => (
  <div style={{ borderBottom: '2px solid #0f2044', paddingBottom: 0 }}>
    {/* Navy top bar */}
    <div style={{ background: '#0f2044', height: 8 }} />
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 28px 12px' }}>
      {/* Left: logo + company */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <img src={bcimLogo} alt="BCIM" style={{ width: 52, height: 52, objectFit: 'contain' }} />
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, color: '#0f2044', letterSpacing: '-0.3px', lineHeight: 1.1 }}>
            BCIM Engineering Private Limited
          </div>
          <div style={{ fontSize: 9, color: '#64748b', marginTop: 3, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
            Construction ERP · Subcontractor Payment Certificate
          </div>
        </div>
      </div>
      {/* Right: bill no + status */}
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: 9, color: '#64748b', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>
          Running Account Bill
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#0f2044', fontFamily: 'monospace', lineHeight: 1 }}>
          {bill.bill_number || '---'}
        </div>
        <div style={{
          display: 'inline-block', marginTop: 5, padding: '2px 10px',
          background: bill.status === 'approved' ? '#dcfce7' : bill.status === 'submitted' ? '#dbeafe' : '#f1f5f9',
          color: bill.status === 'approved' ? '#166534' : bill.status === 'submitted' ? '#1e40af' : '#475569',
          borderRadius: 20, fontSize: 8, fontWeight: 700, letterSpacing: '0.16em', textTransform: 'uppercase',
        }}>
          {bill.status || 'Draft'}
        </div>
      </div>
    </div>
  </div>
);

// ─── Reference strip ──────────────────────────────────────────────────────────
const RefStrip = ({ items }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`,
    borderBottom: '1px solid #e2e8f0', background: '#f8fafc',
  }}>
    {items.map((it, i) => (
      <div key={i} style={{
        padding: '8px 12px',
        borderRight: i < items.length - 1 ? '1px solid #e2e8f0' : 'none',
      }}>
        <div style={{ fontSize: 7.5, color: '#94a3b8', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 2 }}>
          {it.label}
        </div>
        <div style={{ fontSize: 10, fontWeight: 600, color: '#1e293b', lineHeight: 1.2 }}>{it.value || '---'}</div>
      </div>
    ))}
  </div>
);

// ─── Section header ───────────────────────────────────────────────────────────
const SecHead = ({ title }) => (
  <div style={{ padding: '8px 28px 4px', display: 'flex', alignItems: 'center', gap: 8 }}>
    <div style={{ width: 3, height: 14, background: '#0f2044', borderRadius: 2 }} />
    <div style={{ fontSize: 8.5, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: '#334155' }}>
      {title}
    </div>
  </div>
);

// ─── BOQ Items table ──────────────────────────────────────────────────────────
const ItemsTable = ({ items }) => {
  const th = {
    background: '#0f2044', color: '#ffffff', fontSize: 8, fontWeight: 700,
    letterSpacing: '0.14em', textTransform: 'uppercase', padding: '7px 10px',
  };
  return (
    <div style={{ margin: '0 28px', borderRadius: 6, overflow: 'hidden', border: '1px solid #cbd5e1' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
        <thead>
          <tr>
            <th style={{ ...th, width: 30, textAlign: 'center' }}>Sr</th>
            <th style={{ ...th, textAlign: 'left' }}>Description of Work</th>
            <th style={{ ...th, width: 40, textAlign: 'center' }}>Unit</th>
            <th style={{ ...th, width: 55, textAlign: 'right' }}>Prev Qty</th>
            <th style={{ ...th, width: 55, textAlign: 'right' }}>Curr Qty</th>
            <th style={{ ...th, width: 70, textAlign: 'right' }}>Rate (Rs)</th>
            <th style={{ ...th, width: 80, textAlign: 'right' }}>Amount (Rs)</th>
          </tr>
        </thead>
        <tbody>
          {(items || []).map((it, i) => {
            const qty   = num(it.current_qty ?? it.qs_qty);
            const rate  = num(it.rate);
            const amt   = num(it.qs_amount || qty * rate);
            const prev  = num(it.prev_certified_qty);
            const isAlt = i % 2 !== 0;
            return (
              <tr key={i} style={{ background: isAlt ? '#f8fafc' : '#ffffff' }}>
                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#94a3b8', fontWeight: 600, borderBottom: '1px solid #f1f5f9' }}>
                  {it.sr_no || i + 1}
                </td>
                <td style={{ padding: '6px 10px', borderBottom: '1px solid #f1f5f9' }}>
                  <div style={{ fontWeight: 600, color: '#1e293b', lineHeight: 1.3 }}>{it.description || '---'}</div>
                  {it.item_code && (
                    <div style={{ fontSize: 7.5, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{it.item_code}</div>
                  )}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'center', color: '#475569', borderBottom: '1px solid #f1f5f9', textTransform: 'uppercase', fontSize: 8 }}>
                  {it.unit || '---'}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#94a3b8', borderBottom: '1px solid #f1f5f9' }}>
                  {prev > 0 ? prev.toFixed(3) : '—'}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 600, color: '#0f2044', borderBottom: '1px solid #f1f5f9' }}>
                  {qty.toFixed(3)}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', color: '#475569', borderBottom: '1px solid #f1f5f9' }}>
                  {rate.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '6px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#1e293b', borderBottom: '1px solid #f1f5f9' }}>
                  {amt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: '#0f2044' }}>
            <td colSpan={6} style={{ padding: '8px 10px', textAlign: 'right', color: '#94a3b8', fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
              Gross Work Amount
            </td>
            <td style={{ padding: '8px 10px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#ffffff', fontSize: 11 }}>
              {num((items || []).reduce((s, it) => s + num(it.qs_amount || num(it.current_qty ?? it.qs_qty) * num(it.rate)), 0))
                .toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

// ─── Abstract / financial waterfall ──────────────────────────────────────────
const Abstract = ({ data }) => {
  const gross      = num(data.gross_amount);
  const cgst       = num(data.gst_amount) / 2;
  const sgst       = cgst;
  const igst       = num(data.is_igst) ? num(data.gst_amount) : 0;
  const grossWGst  = gross + num(data.gst_amount);
  const advRec     = num(data.mobilization_advance_recovery);
  const steel      = num(data.material_recovery_steel);
  const cement     = num(data.material_recovery_cement);
  const retention  = num(data.retention_amount);
  const tds        = num(data.tds_amount);
  const other      = num(data.other_deductions);
  const netPayable = num(data.net_payable) || (grossWGst - advRec - steel - cement - retention - tds - other);

  const isIgst = num(data.gst_amount) > 0 && data.is_igst;

  const rows = [
    { label: 'Gross Work Amount (A)', value: gross, bold: true, indent: false, style: 'add' },
    ...(isIgst
      ? [{ label: `Add: IGST @ ${pct(data.gst_rate)}`, value: num(data.gst_amount), indent: true, style: 'add' }]
      : [
          { label: `Add: CGST @ ${pct(num(data.gst_rate) / 2)}`, value: cgst, indent: true, style: 'add' },
          { label: `Add: SGST @ ${pct(num(data.gst_rate) / 2)}`, value: sgst, indent: true, style: 'add' },
        ]),
    { label: 'Gross Value with GST (B)', value: grossWGst, bold: true, style: 'total' },
    ...(advRec > 0 ? [{ label: 'Less: Mobilisation Advance Recovery', value: advRec, indent: true, style: 'deduct' }] : []),
    ...(steel > 0  ? [{ label: 'Less: Steel Advance Recovery', value: steel, indent: true, style: 'deduct' }] : []),
    ...(cement > 0 ? [{ label: 'Less: Cement Recovery', value: cement, indent: true, style: 'deduct' }] : []),
    ...(retention > 0 ? [{ label: `Less: Retention Money @ ${pct(data.retention_percent)}`, value: retention, indent: true, style: 'deduct' }] : []),
    ...(tds > 0    ? [{ label: `Less: TDS @ ${pct(data.tds_rate || 2)}`, value: tds, indent: true, style: 'deduct' }] : []),
    ...(other > 0  ? [{ label: 'Less: Other Deductions', value: other, indent: true, style: 'deduct' }] : []),
  ];

  return (
    <div style={{ margin: '0 28px', display: 'grid', gridTemplateColumns: '1fr 280px', gap: 10, alignItems: 'start' }}>
      {/* Deduction waterfall */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ background: '#f8fafc', padding: '6px 12px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#475569' }}>
            Bill Abstract
          </div>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{
                  padding: '5px 12px 5px ' + (r.indent ? '24px' : '12px'),
                  color: r.bold ? '#1e293b' : r.style === 'deduct' ? '#475569' : '#334155',
                  fontWeight: r.bold ? 700 : 400,
                  fontSize: r.bold ? 9.5 : 9,
                }}>
                  {r.label}
                </td>
                <td style={{ padding: '5px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: r.bold ? 700 : 500, color: r.style === 'deduct' ? '#dc2626' : '#1e293b', whiteSpace: 'nowrap' }}>
                  {r.style === 'deduct' ? `(${inr(r.value)})` : inr(r.value)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ background: '#0f2044' }}>
              <td style={{ padding: '10px 12px', color: '#e2e8f0', fontWeight: 700, fontSize: 10, letterSpacing: '0.08em' }}>
                Net Amount Payable
              </td>
              <td style={{ padding: '10px 12px', textAlign: 'right', fontFamily: 'monospace', fontWeight: 700, color: '#ffffff', fontSize: 13, whiteSpace: 'nowrap' }}>
                {inr(netPayable)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Certification box */}
      <div style={{ border: '1px solid #e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
        <div style={{ background: '#f8fafc', padding: '6px 12px', borderBottom: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: '#475569' }}>
            Certification Details
          </div>
        </div>
        <div style={{ padding: '8px 12px' }}>
          {[
            { label: 'Prepared By', value: data.submitted_by_name },
            { label: 'Verified By', value: data.verified_by_name },
            { label: 'Approved By', value: data.approved_by_name },
          ].map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: i < 2 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: 8, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em' }}>{r.label}</span>
              <span style={{ fontSize: 9, fontWeight: 600, color: '#334155' }}>{r.value || '---'}</span>
            </div>
          ))}
        </div>
        {/* Signature area */}
        <div style={{ borderTop: '1px solid #e2e8f0', padding: '10px 12px 6px' }}>
          <div style={{ fontSize: 7.5, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 32 }}>
            Authorised Signatory
          </div>
          <div style={{ borderTop: '1px solid #334155', paddingTop: 4 }}>
            <div style={{ fontSize: 8, color: '#475569' }}>For BCIM Engineering Pvt Ltd</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Signature row ────────────────────────────────────────────────────────────
const SigRow = ({ names }) => (
  <div style={{ margin: '10px 28px 0', display: 'grid', gridTemplateColumns: `repeat(${names.length}, 1fr)`, gap: 12 }}>
    {names.map((n, i) => (
      <div key={i} style={{ textAlign: 'center' }}>
        <div style={{ borderTop: '1px solid #334155', paddingTop: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 600, color: '#1e293b' }}>{n.name || '---'}</div>
          <div style={{ fontSize: 8, color: '#94a3b8', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>{n.role}</div>
          {n.date && <div style={{ fontSize: 7.5, color: '#94a3b8', marginTop: 1 }}>Date: {safeDate(n.date)}</div>}
        </div>
      </div>
    ))}
  </div>
);

// ─── Main template ────────────────────────────────────────────────────────────
const SCBillPrintTemplate = forwardRef(({ data }, ref) => {
  if (!data) return null;

  const refItems = [
    { label: 'Bill Date',    value: safeDate(data.bill_date) },
    { label: 'Work Order',   value: data.contract_number || data.wo_number || '---' },
    { label: 'Bill Type',    value: 'Running Account Bill' },
    { label: 'Bill Period',  value: data.bill_period_from ? `${safeDate(data.bill_period_from)} – ${safeDate(data.bill_period_to)}` : '---' },
    { label: 'Project',      value: data.project_name || '---' },
  ];

  const contractorItems = [
    { label: 'Subcontractor',    value: data.contractor_name || data.sc_name || '---' },
    { label: 'SC Code',          value: data.sc_code || '---' },
    { label: 'GSTIN',            value: data.sc_gstin || '---' },
    { label: 'Invoice No.',      value: data.invoice_number || '---' },
  ];

  return (
    <div ref={ref} className="bg-white">
      <PrintPage orientation="portrait">
        <Header bill={data} />
        <RefStrip items={refItems} />
        <div style={{ height: 8 }} />

        <SecHead title="Subcontractor Details" />
        <RefStrip items={contractorItems} />
        <div style={{ height: 10 }} />

        <SecHead title="BOQ Items — This Bill" />
        <div style={{ height: 4 }} />
        <ItemsTable items={data.items || []} />
        <div style={{ height: 12 }} />

        <SecHead title="Financial Abstract" />
        <div style={{ height: 4 }} />
        <Abstract data={data} />
        <div style={{ height: 12 }} />

        <SigRow names={[
          { name: data.submitted_by_name, role: 'Prepared By / QS Engineer', date: data.created_at },
          { name: data.verified_by_name,  role: 'Checked By / Project Manager', date: data.verified_at },
          { name: data.approved_by_name,  role: 'Approved By / Management', date: data.approved_at },
          { name: '', role: 'Subcontractor' },
        ]} />
        <div style={{ height: 10 }} />

        <PrintFooter />
      </PrintPage>
    </div>
  );
});

SCBillPrintTemplate.displayName = 'SCBillPrintTemplate';
export default SCBillPrintTemplate;
