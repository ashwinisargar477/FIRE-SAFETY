'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { QrCode as QRIcon, Download } from 'lucide-react';

import { formatManufacturingYear } from '@/lib/manufacturingYear';
import { downloadGenerateQrExcel } from '@/lib/exportGenerateQrToExcel';
import ExtinguisherQrViewModal, { type ExtinguisherQrModalData } from '@/components/ExtinguisherQrViewModal';

const PAGE_SIZE = 10;

const thStyle: React.CSSProperties = {
  padding: '1rem',
  fontWeight: 600,
  color: 'var(--text-secondary)',
  position: 'sticky',
  top: 0,
  zIndex: 2,
  backgroundColor: 'var(--bg-main)',
};

function isPastDue(nextUt: string) {
  const t = new Date(nextUt);
  if (Number.isNaN(t.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  t.setHours(0, 0, 0, 0);
  return t.getTime() <= today.getTime();
}

export default function GenerateQrPage() {
  const [rows, setRows] = useState<ExtinguisherQrModalData[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedQr, setSelectedQr] = useState<ExtinguisherQrModalData | null>(null);
  const [mounted, setMounted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastIsError, setToastIsError] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const r = await fetch('/api/extinguishers', { cache: 'no-store' });
        if (!r.ok) throw new Error('Failed to load');
        const data = (await r.json()) as ExtinguisherQrModalData[];
        if (!cancelled) setRows(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setRows([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [rows.length]);

  useEffect(() => {
    if (!toastMessage) {
      setToastIsError(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setToastMessage('');
      setToastIsError(false);
    }, 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleExportExcel = useCallback(() => {
    if (rows.length === 0) {
      setToastMessage('Nothing to export.');
      setToastIsError(true);
      return;
    }
    setExportBusy(true);
    try {
      downloadGenerateQrExcel(rows);
      setToastMessage(`Exported ${rows.length.toLocaleString('en-IN')} row(s) to Excel.`);
      setToastIsError(false);
    } catch {
      setToastMessage('Could not create Excel file. Please try again.');
      setToastIsError(true);
    } finally {
      setExportBusy(false);
    }
  }, [rows]);

  const handleInspectionSaved = useCallback(async () => {
    try {
      const r = await fetch('/api/extinguishers', { cache: 'no-store' });
      if (!r.ok) return;
      const data = (await r.json()) as ExtinguisherQrModalData[];
      const arr = Array.isArray(data) ? data : [];
      setRows(arr);
      if (arr.some((e) => Boolean(e.inspectionPending))) {
        void fetch('/api/extinguishers/inspection-pending-notify', { method: 'POST' }).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, []);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const pageRows = rows.slice(start, start + PAGE_SIZE);

  return (
    <div className="animate-fade-in">
      <div
        className="flex-between"
        style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}
      >
        <h1 style={{ fontSize: '2rem', color: 'var(--color-secondary)', margin: 0 }}>Generate QR</h1>
        <button
          type="button"
          className="btn btn-primary"
          disabled={loading || exportBusy || rows.length === 0}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
          onClick={handleExportExcel}
        >
          <Download size={18} aria-hidden />
          {exportBusy ? 'Exporting…' : 'Export to Excel'}
        </button>
      </div>

      <ExtinguisherQrViewModal
        ext={selectedQr}
        onClose={() => setSelectedQr(null)}
        onToast={(message, isError) => {
          setToastMessage(message);
          setToastIsError(isError);
        }}
        onInspectionSaved={handleInspectionSaved}
      />

      <div className="card ext-table-scroll" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={thStyle}>Unique Serial Number</th>
              <th style={thStyle}>Plant</th>
              <th style={thStyle}>Make</th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Media</th>
              <th style={thStyle}>Capacity</th>
              <th style={thStyle}>Location with Elevation</th>
              <th style={thStyle}>Last UT test Date</th>
              <th style={thStyle}>Manufacturing year</th>
              <th style={thStyle}>Hydraulic test due Date</th>
              <th style={thStyle}>Hydraulic due</th>
              <th style={{ ...thStyle, lineHeight: 1.35 }}>
                Inspection
                <span
                  style={{
                    display: 'block',
                    fontWeight: 500,
                    fontSize: '0.72rem',
                    color: 'var(--text-muted)',
                    marginTop: 4,
                  }}
                >
                  pending if none in 3 months
                </span>
              </th>
              <th style={thStyle}>QR code</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((ext) => (
              <tr key={ext.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{ext.id}</td>
                <td style={{ padding: '1rem' }}>
                  {ext.plant}
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    {ext.companyCode} / {ext.plantCode}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>{ext.make}</td>
                <td style={{ padding: '1rem' }}>{ext.type}</td>
                <td style={{ padding: '1rem' }}>{ext.media}</td>
                <td style={{ padding: '1rem' }}>{ext.capacity}</td>
                <td style={{ padding: '1rem' }}>{ext.locationWithElevation}</td>
                <td style={{ padding: '1rem' }}>{new Date(ext.lastUtTestDate).toLocaleDateString('en-GB')}</td>
                <td style={{ padding: '1rem' }}>{formatManufacturingYear(ext.manufacturingDate)}</td>
                <td
                  style={{
                    padding: '1rem',
                    color: ext.archivedAt || !isPastDue(ext.nextUtTestDate) ? undefined : '#B45309',
                    fontWeight: !ext.archivedAt && isPastDue(ext.nextUtTestDate) ? 600 : undefined,
                  }}
                >
                  {new Date(ext.nextUtTestDate).toLocaleDateString('en-GB')}
                </td>
                <td
                  style={{
                    padding: '1rem',
                    color:
                      ext.archivedAt || !ext.hydraulicDueDate || !isPastDue(ext.hydraulicDueDate)
                        ? undefined
                        : '#0E7490',
                    fontWeight:
                      !ext.archivedAt && ext.hydraulicDueDate && isPastDue(ext.hydraulicDueDate) ? 600 : undefined,
                  }}
                >
                  {ext.hydraulicDueDate ? new Date(ext.hydraulicDueDate).toLocaleDateString('en-GB') : '—'}
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'top' }}>
                  {ext.archivedAt ? (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  ) : ext.inspectionPending ? (
                    <div>
                      <span
                        style={{
                          display: 'inline-block',
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          color: '#B45309',
                          background: 'rgba(180, 83, 9, 0.12)',
                          borderRadius: 6,
                          padding: '0.2rem 0.45rem',
                        }}
                      >
                        Inspection pending
                      </span>
                      {ext.lastInspectionAt ? (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
                          Last: {new Date(ext.lastInspectionAt).toLocaleDateString('en-GB')}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 6 }}>
                          No inspection on record
                        </div>
                      )}
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '0.82rem', color: '#065F46', fontWeight: 600 }}>Up to date</span>
                      {ext.lastInspectionAt ? (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          Last: {new Date(ext.lastInspectionAt).toLocaleDateString('en-GB')}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: 4 }}>
                          New install (within 3 mo.)
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => setSelectedQr(ext)}
                  >
                    <QRIcon size={16} aria-hidden /> View QR
                  </button>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={13} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={13} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No extinguishers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!loading && rows.length > 0 ? (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '0.9rem',
            gap: '0.75rem',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            Showing {rows.length === 0 ? 0 : start + 1}-{Math.min(start + PAGE_SIZE, rows.length)} of {rows.length}
          </div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <button
              type="button"
              className="btn btn-outline"
              disabled={safePage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
            >
              Prev
            </button>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', minWidth: 78, textAlign: 'center' }}>
              Page {safePage}/{totalPages}
            </span>
            <button
              type="button"
              className="btn btn-outline"
              disabled={safePage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
            >
              Next
            </button>
          </div>
        </div>
      ) : null}

      {toastMessage && mounted
        ? createPortal(
            <div
              role="status"
              aria-live="polite"
              style={{
                position: 'fixed',
                top: 16,
                right: 16,
                zIndex: 100050,
                background: toastIsError ? '#991B1B' : '#065F46',
                color: toastIsError ? '#FEF2F2' : '#ECFDF5',
                border: toastIsError ? '1px solid #FCA5A5' : '1px solid #10B981',
                borderRadius: 10,
                padding: '0.7rem 0.9rem',
                fontSize: '0.85rem',
                boxShadow: toastIsError
                  ? '0 12px 28px rgba(153, 27, 27, 0.35)'
                  : '0 12px 28px rgba(6, 95, 70, 0.35)',
                maxWidth: 360,
                pointerEvents: 'none',
              }}
            >
              {toastMessage}
            </div>,
            document.body
          )
        : null}

      <style>{`
        .modal-open-extinguishers aside {
          display: none !important;
        }
        .modal-open-extinguishers .main-content {
          margin-left: 0 !important;
          width: 100vw !important;
        }
        .modal-open-extinguishers {
          overflow: hidden;
        }
      `}</style>
    </div>
  );
}
