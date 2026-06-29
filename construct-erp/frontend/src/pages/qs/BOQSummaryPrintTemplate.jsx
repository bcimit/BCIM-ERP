// src/pages/qs/BOQSummaryPrintTemplate.jsx
// Two-page BOQ print for QS & Billing:
//   Page 1 — BOQ Summary (chapter rollup: Bill Value vs Budgeted value)
//   Page 2 — Full BOQ line items with price, grouped by chapter
// Font matches POPrintTemplate / QS certification ('Times New Roman').
import React from 'react';

const navy = '#0B2E59';
const rust = '#9A3412';
const grayHd = '#C9C9C9';
const blueHd = '#7E93B8';
const totalBg = '#E4EFDC';

// "INR  5,08,23,047" — rounded, no decimals (matches the client's Excel sheet)
const INR = (v) => 'INR  ' + Math.round(Number(v || 0)).toLocaleString('en-IN');
const QTY = (v) => { const x = parseFloat((Number(v || 0)).toFixed(3)); return x || '—'; };
const RATE = (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const S = {
  page:   { fontFamily: "'Times New Roman',Times,serif", color: '#0A0A0A', fontSize: '12px' },
  sheet:  { width: '100%', background: '#fff', padding: '6mm 5mm', boxSizing: 'border-box', pageBreakAfter: 'always' },
  title:  { textAlign: 'center', fontWeight: 'bold', fontSize: '15px', border: '2px solid #000', padding: '8px', letterSpacing: '0.3px' },
  tbl:    { width: '100%', borderCollapse: 'collapse', marginTop: '0' },
  th:     { border: '1px solid #000', padding: '8px 10px', fontWeight: 'bold', fontSize: '13px', textAlign: 'center', background: blueHd },
  thGray: { border: '1px solid #000', padding: '8px 10px', background: grayHd },
  td:     { border: '1px solid #000', padding: '7px 10px', fontSize: '12.5px', verticalAlign: 'middle' },
  tdNo:   { border: '1px solid #000', padding: '7px 8px', fontSize: '12.5px', textAlign: 'center', fontWeight: 'bold' },
  tdVal:  { border: '1px solid #000', padding: '7px 10px', fontSize: '12.5px', textAlign: 'right', whiteSpace: 'nowrap' },
  tdValL: { border: '1px solid #000', padding: '7px 10px', fontSize: '12.5px', whiteSpace: 'nowrap' },
};

// Renders "INR" left-aligned and the number right-aligned within one cell,
// mimicking the screenshot's two-part value column.
function ValCell({ amount, bold, bg }) {
  return (
    <td style={{ ...S.td, padding: 0, background: bg || 'transparent' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 10px', fontWeight: bold ? 'bold' : 'normal' }}>
        <span>INR</span>
        <span style={{ fontVariantNumeric: 'tabular-nums' }}>{Math.round(Number(amount || 0)).toLocaleString('en-IN')}</span>
      </div>
    </td>
  );
}

export default function BOQSummaryPrintTemplate({
  projectName = '',
  subtitle = 'CIVIL WORKS - BOQ',
  chapterRows = [],
  lineItemsByChapter = [],
  totals = { bill: 0, budget: 0, gst: 0, billGrand: 0, budgetGrand: 0 },
  gstPct = 18,
}) {
  return (
    <div style={S.page}>

      {/* ─────────────── PAGE 1 — BOQ SUMMARY ─────────────── */}
      <div style={S.sheet}>
        <table style={S.tbl}>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '48%' }} />
            <col style={{ width: '23%' }} />
            <col style={{ width: '23%' }} />
          </colgroup>

          {/* Banner */}
          <thead>
            <tr>
              <td colSpan={4} style={{ ...S.thGray, textAlign: 'center', fontWeight: 'bold', fontSize: '15px', lineHeight: 1.5 }}>
                {(projectName || 'PROJECT').toUpperCase()}<br />{subtitle}
              </td>
            </tr>
            <tr>
              <td style={S.thGray} /><td style={S.thGray} /><td style={S.thGray} /><td style={S.thGray} />
            </tr>
            <tr>
              <th style={S.th}>S.No</th>
              <th style={{ ...S.th, textAlign: 'left' }}>DESCRIPTION OF WORKS</th>
              <th style={S.th}>Bill Value</th>
              <th style={S.th}>Budgeted value</th>
            </tr>
          </thead>

          <tbody>
            {/* spacer row like the sheet */}
            <tr>
              <td style={S.td}>&nbsp;</td><td style={S.td} /><td style={S.td} /><td style={S.td} />
            </tr>

            {chapterRows.map((c, i) => (
              <tr key={c.chapter_no || i}>
                <td style={S.tdNo}>{i + 1}</td>
                <td style={{ ...S.td, fontWeight: 'bold' }}>{c.name}</td>
                <ValCell amount={c.bill} />
                <ValCell amount={c.budget} />
              </tr>
            ))}

            {/* Total ex-GST */}
            <tr>
              <td style={{ ...S.td, background: totalBg }} />
              <td style={{ ...S.td, fontWeight: 'bold', background: totalBg }}>Total Works Value excluding GST</td>
              <ValCell amount={totals.bill} bold bg={totalBg} />
              <ValCell amount={totals.budget} bold bg={totalBg} />
            </tr>

            {/* GST — bill-side GST applied to both columns (per client sheet) */}
            <tr>
              <td style={S.td} />
              <td style={S.td}>GST {gstPct}%</td>
              <ValCell amount={totals.gst} />
              <ValCell amount={totals.gst} />
            </tr>

            {/* Grand total */}
            <tr>
              <td style={{ ...S.td, background: totalBg }} />
              <td style={{ ...S.td, fontWeight: 'bold', background: totalBg }}>Grand Total Including GST</td>
              <ValCell amount={totals.billGrand} bold bg={totalBg} />
              <ValCell amount={totals.budgetGrand} bold bg={totalBg} />
            </tr>
          </tbody>
        </table>

        <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#555', marginTop: '10px', fontSize: '11px' }}>
          Page 1 — BOQ Summary
        </p>
      </div>

      {/* ─────────────── PAGE 2 — FULL BOQ ITEMS ─────────────── */}
      <div style={{ ...S.sheet, pageBreakAfter: 'auto' }}>
        <div style={{ ...S.title, marginBottom: '8px' }}>
          {(projectName || 'PROJECT').toUpperCase()} — BILL OF QUANTITIES (DETAILED)
        </div>

        <table style={S.tbl}>
          <colgroup>
            <col style={{ width: '6%' }} />
            <col style={{ width: '46%' }} />
            <col style={{ width: '8%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '13%' }} />
            <col style={{ width: '15%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={{ ...S.th, fontSize: '11px' }}>Item</th>
              <th style={{ ...S.th, fontSize: '11px', textAlign: 'left' }}>Description</th>
              <th style={{ ...S.th, fontSize: '11px' }}>Unit</th>
              <th style={{ ...S.th, fontSize: '11px' }}>Qty</th>
              <th style={{ ...S.th, fontSize: '11px' }}>Rate</th>
              <th style={{ ...S.th, fontSize: '11px' }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lineItemsByChapter.map((ch, ci) => (
              <React.Fragment key={ch.chapter_no || ci}>
                <tr>
                  <td colSpan={6} style={{ ...S.td, background: navy, color: '#fff', fontWeight: 'bold', fontSize: '12px', letterSpacing: '0.4px' }}>
                    {ch.chapter_no ? `${ch.chapter_no}. ` : ''}{(ch.name || '').toUpperCase()}
                  </td>
                </tr>
                {ch.items.map((it, ii) => {
                  const amt = Number(it.amount) || (Number(it.quantity || 0) * Number(it.rate || 0));
                  return (
                    <tr key={it.id || ii}>
                      <td style={S.tdNo}>{it.item_no || ii + 1}</td>
                      <td style={{ ...S.td, fontSize: '11.5px', whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{it.description}</td>
                      <td style={{ ...S.tdNo, fontWeight: 'normal' }}>{it.unit || '—'}</td>
                      <td style={S.tdVal}>{QTY(it.quantity)}</td>
                      <td style={S.tdVal}>{RATE(it.rate)}</td>
                      <td style={S.tdVal}>{RATE(amt)}</td>
                    </tr>
                  );
                })}
                <tr>
                  <td colSpan={5} style={{ ...S.tdValL, fontWeight: 'bold', textAlign: 'right', background: totalBg }}>
                    Sub-total — {ch.name}
                  </td>
                  <td style={{ ...S.tdVal, fontWeight: 'bold', background: totalBg }}>
                    {RATE(ch.items.reduce((s, it) => s + (Number(it.amount) || (Number(it.quantity || 0) * Number(it.rate || 0))), 0))}
                  </td>
                </tr>
              </React.Fragment>
            ))}

            <tr>
              <td colSpan={5} style={{ ...S.tdValL, fontWeight: 'bold', textAlign: 'right', background: navy, color: '#fff' }}>
                TOTAL WORKS VALUE (excl. GST)
              </td>
              <td style={{ ...S.tdVal, fontWeight: 'bold', background: navy, color: '#fff' }}>{RATE(totals.bill)}</td>
            </tr>
          </tbody>
        </table>

        <p style={{ textAlign: 'center', fontStyle: 'italic', color: '#555', marginTop: '10px', fontSize: '11px' }}>
          Page 2 — Detailed BOQ Items
        </p>
      </div>
    </div>
  );
}
