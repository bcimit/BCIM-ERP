// src/pages/tqs/TQSAdvanceVoucherPrint.jsx
// BCIM Payment Certification — Advance Voucher (matches PDF format exactly)
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { tqsAdvanceAPI } from '../../api/client';

const nv   = (v) => parseFloat(v || 0);
const inr  = (v) => nv(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtD = (d) => {
  if (!d) return '';
  try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }); }
  catch { return ''; }
};

// ── Number to words (Indian numbering) ───────────────────────────────────────
const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten',
  'Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
function numToWords(n) {
  if (!n || n <= 0) return 'Zero Rupees Only';
  const c = (num) => {
    if (num === 0) return '';
    if (num < 20)       return ones[num];
    if (num < 100)      return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
    if (num < 1000)     return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 ? ' ' + c(num % 100) : '');
    if (num < 100000)   return c(Math.floor(num / 1000)) + ' Thousand' + (num % 1000 ? ' ' + c(num % 1000) : '');
    if (num < 10000000) return c(Math.floor(num / 100000)) + ' Lakh' + (num % 100000 ? ' ' + c(num % 100000) : '');
    return c(Math.floor(num / 10000000)) + ' Crore' + (num % 10000000 ? ' ' + c(num % 10000000) : '');
  };
  return 'Rupees: ' + c(Math.floor(n)) + ' Only';
}

const printStyles = `
  @media print {
    body * { visibility: hidden !important; }
    #av-wrap, #av-wrap * { visibility: visible !important; }
    #av-wrap {
      position: fixed !important;
      top: 0 !important; left: 0 !important;
      width: 210mm !important;
      height: 297mm !important;
      margin: 0 !important;
      padding: 8mm 10mm !important;
      box-sizing: border-box !important;
      overflow: hidden !important;
      background: white !important;
    }
    .no-print { display: none !important; }
    @page { size: A4 portrait; margin: 0; }
  }
  #av-wrap * {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  body { font-family: Arial, sans-serif; margin: 0; background: #e5e7eb; }
`;

// Dotted line row in claim summary
function ClaimRow({ num, label, value, bold, note, colSpan, highlight }) {
  const cellStyle = {
    padding: '2.5px 4px',
    fontSize: '8.5px',
    borderBottom: '1px solid #d1d5db',
    color: bold ? '#000' : '#1e293b',
    fontWeight: bold ? '800' : '600',
    background: highlight ? '#f0fdf4' : 'transparent',
  };
  return (
    <tr>
      <td style={{ ...cellStyle, width: 16, textAlign: 'right', paddingRight: 6 }}>{num}</td>
      <td style={{ ...cellStyle, width: 200 }}>{label}</td>
      <td style={{ ...cellStyle, width: 120, textAlign: 'right', color: '#64748b', letterSpacing: 1 }}>
        {value !== undefined ? '...........................' : ''}
      </td>
      <td style={{ ...cellStyle, width: 30, textAlign: 'center', fontWeight: 700 }}>Rs.</td>
      <td style={{ ...cellStyle, width: 80, textAlign: 'right', fontWeight: bold ? 900 : 700 }}>
        {value > 0 ? inr(value) : value === 0 && bold ? inr(0) : '-'}
      </td>
      <td style={{ ...cellStyle, color: '#374151', fontStyle: 'italic', paddingLeft: 8, fontSize: '8px' }}>{note || ''}</td>
    </tr>
  );
}

export default function TQSAdvanceVoucherPrint() {
  const { id } = useParams();

  const { data: voucher, isLoading } = useQuery({
    queryKey: ['tqs-advance-print', id],
    queryFn: () => tqsAdvanceAPI.get(id).then(r => r.data?.data ?? r.data),
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    const el = document.createElement('style');
    el.textContent = printStyles;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  }, []);

  if (isLoading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
      <p style={{ color: '#94a3b8', fontSize: 13 }}>Loading...</p>
    </div>
  );

  if (!voucher) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: 'Arial' }}>
      <p style={{ color: '#ef4444', fontSize: 13 }}>Voucher not found</p>
    </div>
  );

  const orderValue    = nv(voucher.order_value);
  const variationValue = nv(voucher.variation_value);
  const finalValue    = orderValue + variationValue;
  const advanceValue  = nv(voucher.advance_value);
  const grossCertified = nv(voucher.gross_certified_till_date) || advanceValue;
  const mobilisationDeduction = nv(voucher.mobilisation_advance_deduction);
  const retentionDeduction = nv(voucher.retention_deduction);
  const otherDeductions = nv(voucher.other_deductions);
  const paidAmount    = nv(voucher.previous_certificates) || nv(voucher.paid_amount);
  const balanceToFinish = nv(voucher.balance_to_finish);
  const outstanding   = nv(voucher.current_net_payment_due) || Math.max(advanceValue - paidAmount - mobilisationDeduction - retentionDeduction - otherDeductions, 0);
  const advPct        = voucher.advance_pct > 0
    ? `${parseFloat(voucher.advance_pct).toFixed(0)}%`
    : advanceValue > 0 && orderValue > 0
      ? `${Math.round((advanceValue / orderValue) * 100)}%`
      : '100%';

  const poWoNum  = voucher.wo_number || voucher.po_number || '—';
  const poWoDate = voucher.voucher_date || voucher.po_date;
  const certNo   = voucher.voucher_number || voucher.sl_number;

  const wrap = {
    width: 794, minHeight: 1123,
    background: '#fff',
    fontFamily: 'Arial, sans-serif',
    margin: '0 auto',
    padding: '28px 36px',
    boxSizing: 'border-box',
    fontSize: 9,
    color: '#1e293b',
  };

  return (
    <>
      {/* ── Screen toolbar ── */}
      <div className="no-print" style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: '#1e293b', padding: '10px 24px',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <button onClick={() => window.history.back()}
          style={{ background: 'transparent', border: '1px solid #475569', color: '#94a3b8', padding: '5px 14px', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>
          ← Back
        </button>
        <span style={{ color: '#94a3b8', fontSize: 12 }}>
          Advance Voucher — {certNo} · {voucher.vendor_name}
        </span>
        <button onClick={() => window.print()}
          style={{ marginLeft: 'auto', background: '#2563eb', border: 'none', color: '#fff', padding: '6px 20px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
          🖨 Print / Save PDF
        </button>
      </div>

      {/* ── Print wrapper ── */}
      <div style={{ paddingTop: 50 }} className="no-print" />
      <div id="av-wrap" style={wrap}>

        {/* ══ TOP HEADER ══════════════════════════════════════════════════════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 10 }}>
          <tbody>
            <tr>
              {/* Left: Logo + company info */}
              <td style={{ verticalAlign: 'top', width: '55%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <img src="/bcim-logo.png" alt="BCIM" style={{ height: 44, objectFit: 'contain' }} />
                </div>
                <table style={{ borderCollapse: 'collapse', fontSize: '8.5px', lineHeight: 1.7 }}>
                  <tbody>
                    <tr>
                      <td style={{ fontWeight: 700, paddingRight: 4, color: '#374151', whiteSpace: 'nowrap' }}>Company Name:</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>BCIM Engineering Pvt Ltd</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, paddingRight: 4, color: '#374151', whiteSpace: 'nowrap', verticalAlign: 'top' }}>Package:</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>{voucher.work_desc || '—'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, paddingRight: 4, color: '#374151', whiteSpace: 'nowrap' }}>Purchase/Work Order No.</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>
                        {poWoNum}{poWoDate ? ` Dt. ${fmtD(poWoDate)}` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, paddingRight: 4, color: '#374151', whiteSpace: 'nowrap' }}>Purchase/Work Order Value:</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>
                        Rs. {orderValue > 0 ? inr(orderValue) : '—'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </td>

              {/* Right: PAYMENT CERTIFICATION box */}
              <td style={{ verticalAlign: 'top', width: '45%' }}>
                <div style={{
                  border: '2px solid #1b2d52', borderRadius: 2,
                  padding: '4px 10px', textAlign: 'center', marginBottom: 8,
                }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#1b2d52', letterSpacing: 1 }}>
                    PAYMENT CERTIFICATION
                  </span>
                </div>
                <table style={{ borderCollapse: 'collapse', fontSize: '8.5px', lineHeight: 1.7, width: '100%' }}>
                  <tbody>
                    <tr>
                      <td colSpan={2} style={{ fontWeight: 800, color: '#111', paddingBottom: 2 }}>
                        PROJECT NAME: {voucher.project_name || '—'}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: '#374151', whiteSpace: 'nowrap', paddingRight: 4 }}>
                        Payment Certification No.:
                      </td>
                      <td style={{ fontWeight: 700, color: '#111' }}>
                        {certNo}{voucher.voucher_date ? ` Dt. ${fmtD(voucher.voucher_date)}` : ''}
                      </td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: '#374151', paddingRight: 4, whiteSpace: 'nowrap' }}>Vendor Name:</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>M/s.{voucher.vendor_name}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: '#374151', paddingRight: 4, whiteSpace: 'nowrap' }}>RA Bill No:</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>{voucher.ra_bill_no || 'Advance'}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: '#374151', paddingRight: 4, whiteSpace: 'nowrap' }}>Date of Proforma Invoice:</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>{voucher.proforma_invoice_date ? fmtD(voucher.proforma_invoice_date) : ''}</td>
                    </tr>
                    <tr>
                      <td style={{ fontWeight: 700, color: '#374151', paddingRight: 4, whiteSpace: 'nowrap' }}>Proforma Invoice Number:</td>
                      <td style={{ fontWeight: 700, color: '#111' }}>{voucher.proforma_invoice_number || ''}</td>
                    </tr>
                  </tbody>
                </table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* ══ CLAIM SUMMARY ═══════════════════════════════════════════════════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 8 }}>
          <thead>
            <tr>
              <th colSpan={6} style={{
                background: '#1b2d52', color: '#fff', fontSize: 9, fontWeight: 800,
                padding: '5px 8px', textAlign: 'left', letterSpacing: 0.5,
              }}>
                Claim Summary
              </th>
            </tr>
          </thead>
          <tbody>
            <ClaimRow num="1"  label="Original Contract value"                   value={orderValue}   note="with Tax" />
            <ClaimRow num="2"  label="Net Change by Variation Orders"             value={variationValue} />
            <ClaimRow num="3"  label="Final Contract Value to Date"               value={finalValue || orderValue}  />
            <ClaimRow num="4"  label={`Advance Certified    ${advPct}`}           value={advanceValue} />
            <ClaimRow num="5"  label="Gross Certified Till date"                  value={grossCertified} />
            <ClaimRow num="6"  label="Deduction of Mobilisation Advance"          value={mobilisationDeduction} />
            <ClaimRow num="7"  label="Deduction of Retention Amount"              value={retentionDeduction} />
            <ClaimRow num="8"  label="Any other Deductions"                       value={otherDeductions} />
            <ClaimRow num="9"  label="Total Net Certified till date"              value={advanceValue - mobilisationDeduction - retentionDeduction - otherDeductions} />
            <ClaimRow num="10" label="Less Previous Certificates for Payments"    value={paidAmount}   note={paidAmount > 0 ? 'Paid along with order' : ''} />
            <ClaimRow num="11" label="Balance to finish"                          value={balanceToFinish} />
            <ClaimRow num="12" label="Current Net Payment Due"                    value={outstanding}  bold note="balance to be paid now" highlight />
          </tbody>
        </table>

        {/* Amount in words */}
        <div style={{
          border: '1px solid #d1d5db', borderTop: 'none',
          padding: '5px 8px', fontSize: '8.5px', fontWeight: 700,
          background: '#f9fafb', marginBottom: 10,
        }}>
          <span style={{ fontWeight: 800 }}>Amount certified in words</span>
          {'    '}
          {voucher.amount_in_words || numToWords(outstanding)}
        </div>

        {/* ══ REMARKS ═════════════════════════════════════════════════════════ */}
        <div style={{ marginBottom: 8 }}>
          <p style={{ fontSize: '8.5px', fontWeight: 800, textDecoration: 'underline', marginBottom: 4 }}>REMARKS:</p>
          <p style={{ fontSize: '8px', fontWeight: 600, color: '#374151', lineHeight: 1.8, margin: 0 }}>
            1. Any Statutory deductions required to be made apart from the above shall be made at Accounts Department<br/>
            2. Payments made to be verified for correctness<br/>
            3. All transactions in Indian Rupees
          </p>
        </div>

        {/* Specific Comments box */}
        <div style={{
          border: '1px solid #374151', padding: '6px 8px', marginBottom: 8, minHeight: 52,
        }}>
          <p style={{ fontSize: '8.5px', fontWeight: 800, marginBottom: 4 }}>
            Any Specific Comments to Accounts Department :
          </p>
          <p style={{ fontSize: '8px', fontWeight: 600, color: '#374151', minHeight: 28 }}>
            {voucher.remarks || ''}
          </p>
        </div>

        {/* NOTE */}
        {(voucher.note || advPct) && (
          <div style={{ marginBottom: 14 }}>
            <p style={{ fontSize: '8.5px', fontWeight: 800, textDecoration: 'underline', marginBottom: 2 }}>NOTE</p>
            <p style={{ fontSize: '8px', fontWeight: 600, color: '#374151' }}>
              {voucher.note || `Payment ${advPct} advance, balance after receiving the material`}
            </p>
          </div>
        )}

        {/* ══ SIGNATURES ══════════════════════════════════════════════════════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 16 }}>
          <tbody>
            <tr>
              {/* Col 1 */}
              <td style={{ width: '33%', verticalAlign: 'top', paddingRight: 16 }}>
                <p style={{ fontSize: '8.5px', fontWeight: 800, marginBottom: 30 }}>Prepared For Payment</p>
                {/* Signature space */}
                <div style={{ borderBottom: '1px solid #374151', marginBottom: 4, height: 30 }} />
                <p style={{ fontSize: '8px', fontWeight: 700, color: '#374151' }}>Date:</p>
                <p style={{ fontSize: '8px', fontWeight: 700, marginTop: 4, fontStyle: 'italic' }}>
                  ({voucher.prepared_by_name || 'Mr. Praveen Parameshwar'})
                </p>
              </td>

              {/* Col 2 */}
              <td style={{ width: '33%', verticalAlign: 'top', paddingRight: 16 }}>
                <p style={{ fontSize: '8.5px', fontWeight: 800, marginBottom: 30 }}>Approved For Payment</p>
                <div style={{ borderBottom: '1px solid #374151', marginBottom: 4, height: 30 }} />
                <p style={{ fontSize: '8px', fontWeight: 700, color: '#374151' }}>Date:</p>
                <p style={{ fontSize: '8px', fontWeight: 800, marginTop: 4 }}>Director</p>
                <p style={{ fontSize: '8px', fontWeight: 700, fontStyle: 'italic' }}>
                  ({voucher.director_name || 'Mr. S.Srinivas Raju'})
                </p>
              </td>

              {/* Col 3 */}
              <td style={{ width: '33%', verticalAlign: 'top' }}>
                <p style={{ fontSize: '8.5px', fontWeight: 800, marginBottom: 30 }}>Approved For Payment</p>
                <div style={{ borderBottom: '1px solid #374151', marginBottom: 4, height: 30 }} />
                <p style={{ fontSize: '8px', fontWeight: 700, color: '#374151' }}>Date:</p>
                <p style={{ fontSize: '8px', fontWeight: 800, marginTop: 4 }}>Managing Director</p>
                <p style={{ fontSize: '8px', fontWeight: 700, fontStyle: 'italic' }}>
                  ({voucher.md_name || 'Mr. Stephen A'})
                </p>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Bottom border line */}
        <div style={{ borderTop: '2px solid #1b2d52', marginTop: 20 }} />

      </div>
    </>
  );
}
