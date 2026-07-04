// src/pages/sc/mb/SCMeasurementBook.jsx — Sub Con Measurement Book (reuses the
// client RA billing Measurement Book print template unmodified).
//
// Scoped by wo_id (Sub Con billing is Work-Order based, not project-BOQ based).
// Fetches the WO + its items, the project (for client/site fields), and the
// APPROVED sc_mb_entries for this WO, reshapes them via scMbAdapters, and hands
// them to the exact same MBCover / MBMeasurementDetail / MBAbstract /
// MBPrintDocument components the client side uses — no forked print layout.

import React, { useState, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useReactToPrint } from 'react-to-print';
import { FileText, Ruler, Table2, ChevronLeft, Send, Loader2, AlertCircle, Printer, Download } from 'lucide-react';
import dayjs from 'dayjs';

import { scAPI, projectAPI } from '../../../api/client';
import MBCover             from '../../qs/mb/MBCover';
import MBMeasurementDetail from '../../qs/mb/MBMeasurementDetail';
import MBAbstract          from '../../qs/mb/MBAbstract';
import MBPrintDocument     from '../../qs/mb/MBPrintDocument';
import { adaptWoItemsToBoqItems, adaptMbEntriesToMeasurements } from './scMbAdapters';

// ── STATUS BADGE (cosmetic only — mirrors the client MB's local toggle) ──────
const STATUSES = ['Draft', 'Site Check', 'QS Review', 'Approved', 'Billed'];

function StatusBar({ current, onChange }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto">
      {STATUSES.map((s, i) => {
        const idx  = STATUSES.indexOf(current);
        const done = i < idx;
        const active = s === current;
        return (
          <button
            key={s}
            onClick={() => onChange(s)}
            className={[
              'px-3 py-1.5 text-xs font-medium whitespace-nowrap border-y border-r first:border-l first:rounded-l-lg last:rounded-r-lg transition-colors',
              active ? 'bg-blue-600 text-white border-blue-600' :
              done   ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                       'bg-white text-slate-900 font-medium border-slate-200 hover:bg-slate-50',
            ].join(' ')}
          >
            {i + 1}. {s}
          </button>
        );
      })}
    </div>
  );
}

const TABS = [
  { key: 'cover',        label: 'Cover Sheet',  Icon: FileText },
  { key: 'measurements', label: 'Measurements', Icon: Ruler    },
  { key: 'abstract',     label: 'Abstract',     Icon: Table2   },
];

export default function SCMeasurementBook({ wo_id, onClose, onRaiseBill }) {
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState('cover');
  const [mbStatus,  setMbStatus]  = useState('Draft');

  const [coverData, setCoverData] = useState({
    ra_bill_no:       '',
    invoice_ref:      '',
    bill_period_from: '',
    bill_period_to:   '',
    date_of_invoice:  dayjs().format('YYYY-MM-DD'),
    package_desc:     '',
    prepared_by:      '',
    checked_by:       '',
    approved_by:      '',
  });

  const [deductions] = useState({
    retentionPct:   5,
    mobAdvance:     0,
    steelRecovery:  0,
    adhocDeduction: 0,
  });

  const printRef = useRef(null);

  // ── API Queries ──────────────────────────────────────────────────────────
  const {
    data: woDetail,
    isLoading: loadingWO,
    isError: errorWO,
  } = useQuery({
    queryKey:  ['sc-mb-wo-detail', wo_id],
    queryFn:   () => scAPI.getWO(wo_id).then(r => r.data?.data),
    enabled:   !!wo_id,
    staleTime: 0,
  });

  const {
    data: project,
    isLoading: loadingProject,
  } = useQuery({
    queryKey:  ['project', woDetail?.project_id],
    queryFn:   () => projectAPI.get(woDetail.project_id).then(r => r.data?.data || r.data),
    enabled:   !!woDetail?.project_id,
    staleTime: 60_000,
  });

  const {
    data: mbEntries = [],
    isLoading: loadingMB,
  } = useQuery({
    queryKey:  ['sc-mb-approved', wo_id],
    queryFn:   () => scAPI.listMB({ wo_id, status: 'approved' }).then(r => r.data?.data || []),
    enabled:   !!wo_id,
    staleTime: 30_000,
  });

  // ── Adapt SC data into the client MB components' expected shapes ─────────
  const boqItems = useMemo(() => adaptWoItemsToBoqItems(woDetail?.items || []), [woDetail]);
  const measurements = useMemo(() => adaptMbEntriesToMeasurements(mbEntries), [mbEntries]);

  const projectForCover = useMemo(() => ({
    ...(project || {}),
    work_order_number: woDetail?.wo_number,
  }), [project, woDetail]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `MB_${woDetail?.wo_number || 'Draft'}_${woDetail?.sc_name || 'SubCon'}`,
  });

  const handleRaiseBill = () => {
    if (onRaiseBill) { onRaiseBill(wo_id); return; }
    navigate(`/sc/bill-preparation?wo_id=${wo_id}&open=1`);
  };

  const isLoading = loadingWO || loadingProject || loadingMB;

  if (!wo_id) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-400">
        <AlertCircle className="w-5 h-5 mr-2" />
        No work order selected.
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">

      {/* ── Top bar ── */}
      <div className="bg-[#1F3864] text-white px-6 py-3 flex items-center justify-between shadow-lg flex-shrink-0">
        <div className="flex items-center gap-3">
          {onClose && (
            <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <p className="text-[10px] tracking-widest text-blue-300 uppercase">Measurement Book — Sub Con</p>
            <h1 className="text-lg font-medium leading-tight">
              {loadingWO ? 'Loading…' : `${woDetail?.wo_number} · ${woDetail?.sc_name}`}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <StatusBar current={mbStatus} onChange={setMbStatus} />

          <button onClick={handlePrint} disabled={isLoading} title="Print Measurement Book"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-white/20">
            <Printer className="w-4 h-4" /> Print
          </button>

          <button onClick={handlePrint} disabled={isLoading} title="Download as PDF"
            className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors border border-white/20">
            <Download className="w-4 h-4" /> Download PDF
          </button>

          <button onClick={handleRaiseBill} disabled={isLoading}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Send className="w-4 h-4" /> Raise Bill for this WO
          </button>
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div className="bg-white border-b border-slate-200 px-6 flex-shrink-0">
        <div className="flex gap-1">
          {TABS.map(({ key, label, Icon }) => (
            <button key={key} onClick={() => setActiveTab(key)}
              className={[
                'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === key
                  ? 'border-blue-600 text-blue-700'
                  : 'border-transparent text-slate-900 font-medium hover:text-slate-900 hover:border-slate-300',
              ].join(' ')}>
              <Icon className="w-4 h-4" /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex-1 flex items-center justify-center text-slate-900 font-medium gap-2">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading measurement book data…
        </div>
      ) : errorWO ? (
        <div className="flex-1 flex items-center justify-center text-red-500 gap-2">
          <AlertCircle className="w-5 h-5" /> Failed to load work order. Please check the WO ID.
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          {activeTab === 'cover' && (
            <MBCover data={coverData} onChange={setCoverData} project={projectForCover} />
          )}

          {activeTab === 'measurements' && (
            <MBMeasurementDetail boqItems={boqItems} measurements={measurements} />
          )}

          {activeTab === 'abstract' && (
            <MBAbstract
              projectMeta={{
                workOrderNo: woDetail?.wo_number || '—',
                raBillNo:    coverData.ra_bill_no || '—',
                projectName: project?.name || '—',
              }}
              boqItems={boqItems}
              measurements={measurements}
              voItems={[]}
              initialDeductions={deductions}
              onAbstractComputed={() => {}}
              onDeductionsChange={() => {}}
            />
          )}
        </div>
      )}

      {/* Hidden print document — rendered off-screen, captured by react-to-print */}
      <div style={{ position: 'absolute', top: '-9999px', left: '-9999px', width: '297mm' }}>
        <MBPrintDocument
          ref={printRef}
          cover={coverData}
          project={projectForCover}
          boqItems={boqItems}
          measurements={measurements}
          voItems={[]}
          deductions={deductions}
        />
      </div>
    </div>
  );
}
