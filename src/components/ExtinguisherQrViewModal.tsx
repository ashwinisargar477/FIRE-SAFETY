'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import QRCode from 'react-qr-code';
import { X, AlertTriangle, ClipboardCheck } from 'lucide-react';

import { buildIssueReporterPayload } from '@/lib/sessionUser';
import { formatManufacturingYear } from '@/lib/manufacturingYear';
import FireClassReferenceBlock from '@/components/FireClassReferenceBlock';

/** Same shape as extinguisher rows from `/api/extinguishers`. */
export type ExtinguisherQrModalData = {
  id: string;
  division: string;
  subDivision: string;
  zone: string;
  plantOffice: string;
  plantId: number | null;
  companyCode: string;
  plantCode: string;
  plant: string;
  showStatus: string;
  region: string;
  plant_unit: string;
  cluster: string;
  company_name: string;
  make: string;
  type: string;
  media: string;
  capacity: string;
  locationWithElevation: string;
  lastUtTestDate: string;
  manufacturingDate: string;
  nextUtTestDate: string;
  hydraulicDueDate?: string | null;
  installedBy: string;
  installedDate: string;
  archivedAt?: string | null;
  archivedReason?: string | null;
  lastInspectionAt?: string | null;
  inspectionPending?: boolean;
};

type ExtinguisherInspection = {
  inspectionId: number;
  extinguisherId: string;
  status: string;
  remark: string | null;
  inspectedBy: string;
  inspectedAt: string;
};

function buildQrValue(ext: ExtinguisherQrModalData): string {
  return [
    'NUVOCO FIRE SAFETY - EXTINGUISHER',
    `Division: ${ext.division}`,
    `Sub Division: ${ext.subDivision}`,
    `Zone: ${ext.zone}`,
    `Plant/Office: ${ext.plantOffice}`,
    `Unique Serial Number: ${ext.id}`,
    `Plant ID: ${ext.plantId ?? 'N/A'}`,
    `Plant: ${ext.plant}`,
    `Company Code: ${ext.companyCode}`,
    `Plant Code: ${ext.plantCode}`,
    `Plant Status: ${ext.showStatus}`,
    `Region: ${ext.region}`,
    `Plant Unit: ${ext.plant_unit}`,
    `Cluster: ${ext.cluster}`,
    `Company Name: ${ext.company_name}`,
    `Make: ${ext.make}`,
    `Type: ${ext.type}`,
    `Media: ${ext.media}`,
    `Capacity: ${ext.capacity}`,
    `Location with Elevation: ${ext.locationWithElevation}`,
    `Last UT test Date: ${ext.lastUtTestDate}`,
    `Manufacturing year: ${formatManufacturingYear(ext.manufacturingDate)}`,
    `Hydraulic test due: ${ext.hydraulicDueDate ?? 'N/A'}`,
    `Hydraulic test due Date: ${ext.nextUtTestDate}`,
    `Installed By: ${ext.installedBy}`,
    `Installed Date: ${new Date(ext.installedDate).toLocaleString('en-GB')}`,
  ].join('\n');
}

function buildEmptyCylinderMailto(
  ext: ExtinguisherQrModalData,
  reporterText: string,
  reporterEmail: string | null,
  note: string
): string {
  const targetEmail = reporterEmail || 'ashwinisargar18@gmail.com';
  const subject = `[Nuvoco Fire Safety] Empty cylinder report - ${ext.id}`;
  const bodyLines = [
    'An empty extinguisher cylinder has been reported.',
    '',
    `Extinguisher ID: ${ext.id}`,
    `Plant: ${ext.plant || 'N/A'} (${ext.plantCode || 'N/A'})`,
    `Location: ${ext.locationWithElevation || 'N/A'}`,
    `Make/Type: ${ext.make || 'N/A'} / ${ext.type || 'N/A'}`,
    `Media/Capacity: ${ext.media || 'N/A'} / ${ext.capacity || 'N/A'}`,
    `Last UT test: ${ext.lastUtTestDate || 'N/A'}`,
    `Manufacturing year: ${formatManufacturingYear(ext.manufacturingDate)}`,
    `Hydraulic test due: ${ext.hydraulicDueDate || 'N/A'}`,
    `Hydraulic test due Date: ${ext.nextUtTestDate || 'N/A'}`,
    '',
    `Reported by: ${reporterText}`,
    `Note: ${note}`,
    `Time: ${new Date().toISOString()}`,
  ];
  return `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
}

type Props = {
  ext: ExtinguisherQrModalData | null;
  onClose: () => void;
  onToast: (message: string, isError: boolean) => void;
  /** Called after a successful inspection save so the parent list can refresh. */
  onInspectionSaved?: () => void;
};

export default function ExtinguisherQrViewModal({ ext, onClose, onToast, onInspectionSaved }: Props) {
  const [mounted, setMounted] = useState(false);
  const [emptyReportBusy, setEmptyReportBusy] = useState(false);
  const [inspections, setInspections] = useState<ExtinguisherInspection[]>([]);
  const [inspectionsLoading, setInspectionsLoading] = useState(false);
  const [inspectionResult, setInspectionResult] = useState<'OK' | 'NOT_OK'>('OK');
  const [inspectionRemark, setInspectionRemark] = useState('');
  const [inspectionSaving, setInspectionSaving] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const extinguisherId = ext?.id ?? null;

  useEffect(() => {
    if (!extinguisherId) {
      setInspections([]);
      return;
    }
    let cancelled = false;
    setInspectionResult('OK');
    setInspectionRemark('');
    (async () => {
      setInspectionsLoading(true);
      try {
        const r = await fetch(
          `/api/extinguishers/inspection?extinguisherId=${encodeURIComponent(extinguisherId)}`,
          { cache: 'no-store' }
        );
        if (!r.ok) {
          if (!cancelled) {
            setInspections([]);
            onToast('Could not load inspection history.', true);
          }
          return;
        }
        const data = (await r.json()) as ExtinguisherInspection[];
        if (!cancelled) setInspections(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) {
          setInspections([]);
          onToast('Could not load inspection history.', true);
        }
      } finally {
        if (!cancelled) setInspectionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only re-run when a different extinguisher is opened — not when parent re-renders (e.g. after onToast).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- onToast is unstable when passed inline from parent pages
  }, [extinguisherId]);

  useEffect(() => {
    if (!mounted) return;
    if (ext) {
      document.body.classList.add('modal-open-extinguishers');
    } else {
      document.body.classList.remove('modal-open-extinguishers');
    }
    return () => {
      document.body.classList.remove('modal-open-extinguishers');
    };
  }, [ext, mounted]);

  const handleSaveInspection = async () => {
    if (!ext) return;
    if (inspectionResult === 'NOT_OK' && !inspectionRemark.trim()) {
      onToast('Please enter a remark when the inspection is not OK.', true);
      return;
    }
    const reporter = buildIssueReporterPayload(
      typeof window !== 'undefined' ? window.localStorage.getItem('nuvoco-current-user') : null,
      'Dashboard user'
    );
    setInspectionSaving(true);
    const statusBeingSaved = inspectionResult;
    try {
      const response = await fetch('/api/extinguishers/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          extinguisherId: ext.id,
          status: inspectionResult,
          remark: inspectionResult === 'NOT_OK' ? inspectionRemark.trim() : '',
          inspectedBy: reporter.reportedBy,
        }),
      });
      if (!response.ok) {
        let msg = 'Could not save inspection.';
        try {
          const j = (await response.json()) as { message?: string };
          if (j.message) msg = j.message;
        } catch {
          /* ignore */
        }
        onToast(msg, true);
        return;
      }
      const saved = (await response.json()) as ExtinguisherInspection | null;
      if (saved?.inspectionId != null) {
        setInspections((prev) => [saved, ...prev]);
      }
      setInspectionResult('OK');
      setInspectionRemark('');
      onToast(statusBeingSaved === 'NOT_OK' ? 'Inspection saved: Not OK.' : 'Inspection saved: OK.', false);
      onInspectionSaved?.();
    } catch {
      onToast('Could not save inspection.', true);
    } finally {
      setInspectionSaving(false);
    }
  };

  const handleReportEmptyCylinder = async (selected: ExtinguisherQrModalData) => {
    setEmptyReportBusy(true);
    try {
      const reporter = buildIssueReporterPayload(
        typeof window !== 'undefined' ? window.localStorage.getItem('nuvoco-current-user') : null,
        'Dashboard user'
      );
      const mailto = buildEmptyCylinderMailto(
        selected,
        reporter.reportedBy,
        reporter.reporterEmail,
        'Cylinder reported empty (equipment register / QR view).'
      );
      window.location.href = mailto;
      onToast('Mail draft opened in your email app. Review details and click Send.', false);
    } catch {
      onToast('Could not open mail app. Please check default mail app settings.', true);
    } finally {
      setEmptyReportBusy(false);
    }
  };

  if (!ext || !mounted) return null;

  const inspectionInputName = `extinguisher-inspection-result-${ext.id}`;

  return createPortal(
    <div
      className="modal-shell"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(11,27,43,0.58)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        backdropFilter: 'blur(6px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card modal-card"
        style={{
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          backgroundColor: 'white',
          overflow: 'hidden',
          borderRadius: 16,
          border: '1px solid rgba(0,122,83,0.18)',
          boxShadow: '0 24px 60px rgba(11,27,43,0.26)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div
          className="modal-header"
          style={{
            background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))',
            color: 'white',
            padding: '0.95rem 1rem',
            textAlign: 'center',
            position: 'relative',
          }}
        >
          <button
            type="button"
            onClick={() => onClose()}
            className="modal-close"
            style={{
              position: 'absolute',
              right: '0.7rem',
              top: '0.6rem',
              background: 'rgba(255,255,255,0.16)',
              border: '1px solid rgba(255,255,255,0.34)',
              color: 'white',
              cursor: 'pointer',
              width: 30,
              height: 30,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            aria-label="Close QR modal"
          >
            <X size={16} />
          </button>
          <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Equipment QR Label</h2>
          <p style={{ opacity: 0.8, fontSize: '0.875rem', marginTop: '0.25rem' }}>Scan to view details</p>
        </div>

        <div
          style={{
            padding: '2rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '1.5rem',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              padding: '1rem',
              background: 'white',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-md)',
              border: '1px solid var(--border-color)',
            }}
          >
            <QRCode value={buildQrValue(ext)} size={200} level="M" fgColor="var(--text-primary)" />
          </div>

          <FireClassReferenceBlock type={ext.type} compact />

          <div style={{ width: '100%', borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>
                  Unique Serial Number
                </span>
                <strong style={{ color: 'var(--color-primary)' }}>{ext.id}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Plant</span>
                <strong>{ext.plant}</strong>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {ext.companyCode} / {ext.plantCode}
                </div>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Make</span>
                <strong>{ext.make}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Type</span>
                <strong>{ext.type}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Media</span>
                <strong>{ext.media}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Capacity</span>
                <strong>{ext.capacity}</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>
                  Location with Elevation
                </span>
                <strong>{ext.locationWithElevation}</strong>
              </div>
              <div>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>
                  Manufacturing year
                </span>
                <strong>{formatManufacturingYear(ext.manufacturingDate)}</strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>
                  Hydraulic test due
                </span>
                <strong>
                  {ext.hydraulicDueDate ? new Date(ext.hydraulicDueDate).toLocaleDateString('en-GB') : '—'}
                </strong>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>
                  Hydraulic test due Date
                </span>
                <strong>{new Date(ext.nextUtTestDate).toLocaleDateString('en-GB')}</strong>
              </div>
            </div>
          </div>

          <div style={{ width: '100%', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <h3
              style={{
                fontSize: '0.9rem',
                margin: '0 0 0.65rem',
                fontWeight: 700,
                color: 'var(--color-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <ClipboardCheck size={18} aria-hidden />
              Inspection
            </h3>
            <p
              style={{
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                margin: '0 0 0.85rem',
                lineHeight: 1.4,
              }}
            >
              Choose OK or Not OK. If not OK, add a short remark. Save stores the current time, result, and inspector
              name (from your login or dashboard session).
            </p>
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                <input
                  type="radio"
                  name={inspectionInputName}
                  checked={inspectionResult === 'OK'}
                  onChange={() => {
                    setInspectionResult('OK');
                    onToast('Inspection: OK selected. Tap Save inspection to record.', false);
                  }}
                />
                OK
              </label>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                }}
              >
                <input
                  type="radio"
                  name={inspectionInputName}
                  checked={inspectionResult === 'NOT_OK'}
                  onChange={() => {
                    setInspectionResult('NOT_OK');
                    onToast('Inspection: Not OK. Add a remark, then save.', false);
                  }}
                />
                Not OK
              </label>
            </div>
            {inspectionResult === 'NOT_OK' ? (
              <div style={{ marginBottom: '0.75rem' }}>
                <label
                  htmlFor={`${inspectionInputName}-remark`}
                  className="input-label"
                  style={{ marginBottom: '0.35rem' }}
                >
                  Remark (required when not OK)
                </label>
                <textarea
                  id={`${inspectionInputName}-remark`}
                  className="input-field"
                  rows={3}
                  placeholder="Remark — why is this not OK?"
                  value={inspectionRemark}
                  onChange={(e) => setInspectionRemark(e.target.value)}
                  style={{ width: '100%', resize: 'vertical', boxSizing: 'border-box', display: 'block' }}
                  aria-label="Inspection remark when not OK"
                  autoFocus
                />
              </div>
            ) : null}
            <button
              type="button"
              className="btn btn-primary"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
              disabled={inspectionSaving}
              onClick={() => void handleSaveInspection()}
            >
              <ClipboardCheck size={16} aria-hidden />
              {inspectionSaving ? 'Saving…' : 'Save inspection'}
            </button>
            {inspectionsLoading ? (
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.65rem' }}>
                Loading inspection history…
              </p>
            ) : inspections.length > 0 ? (
              <div
                style={{
                  marginTop: '0.85rem',
                  paddingTop: '0.85rem',
                  borderTop: '1px dashed var(--border-color)',
                }}
              >
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Recent inspections
                </span>
                <ul
                  style={{
                    listStyle: 'none',
                    margin: '0.45rem 0 0',
                    padding: 0,
                    maxHeight: 160,
                    overflowY: 'auto',
                  }}
                >
                  {inspections.slice(0, 10).map((row) => (
                    <li
                      key={row.inspectionId}
                      style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-primary)',
                        marginBottom: 8,
                        lineHeight: 1.35,
                      }}
                    >
                      <strong>{row.status === 'NOT_OK' ? 'Not OK' : 'OK'}</strong>
                      {' · '}
                      {new Date(row.inspectedAt).toLocaleString('en-GB')}
                      {' · '}
                      {row.inspectedBy}
                      {row.remark ? (
                        <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>{row.remark}</div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div style={{ width: '100%', paddingTop: '1rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              className="btn btn-outline"
              style={{
                width: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                borderColor: 'rgba(217, 119, 6, 0.45)',
                color: '#B45309',
              }}
              disabled={emptyReportBusy}
              onClick={() => void handleReportEmptyCylinder(ext)}
            >
              <AlertTriangle size={16} />
              {emptyReportBusy ? 'Sending report…' : 'Report empty cylinder'}
            </button>
            <p
              style={{
                fontSize: '0.72rem',
                color: 'var(--text-muted)',
                marginTop: '0.5rem',
                textAlign: 'center',
                lineHeight: 1.35,
              }}
            >
              Opens your default mail app with prefilled report details for this extinguisher.
            </p>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body
  );
}
