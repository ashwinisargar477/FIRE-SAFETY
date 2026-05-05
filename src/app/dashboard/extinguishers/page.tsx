'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Plus, QrCode as QRIcon, X, Archive, RotateCcw, Trash2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import QRCode from 'react-qr-code';
import { createPortal } from 'react-dom';
import { locationHierarchy } from '@/data/locationHierarchy';
import { buildIssueReporterPayload } from '@/lib/sessionUser';
import HydraulicDuePopup from '@/components/HydraulicDuePopup';

// Mock Data structure
interface Extinguisher {
  id: string; // Unique serial number
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
}

interface PlantMaster {
  id: number;
  companyCode: string;
  plantCode: string;
  plantSName: string;
  showStatus: string;
  region: string;
  plant_unit: string;
  cluster: string;
  company_name: string;
}

function buildEmptyCylinderMailto(ext: Extinguisher, reporterText: string, reporterEmail: string | null, note: string): string {
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
    `Manufacturing Date: ${ext.manufacturingDate || 'N/A'}`,
    `Next UT test: ${ext.nextUtTestDate || 'N/A'}`,
    `Hydraulic test due: ${ext.hydraulicDueDate || 'N/A'}`,
    '',
    `Reported by: ${reporterText}`,
    `Note: ${note}`,
    `Time: ${new Date().toISOString()}`,
  ];
  return `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
}

function buildQrValue(ext: Extinguisher) {
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
    `Manufacturing Date: ${ext.manufacturingDate}`,
    `Next UT test: ${ext.nextUtTestDate}`,
    `Hydraulic test due: ${ext.hydraulicDueDate ?? 'N/A'}`,
    `Installed By: ${ext.installedBy}`,
    `Installed Date: ${new Date(ext.installedDate).toLocaleString('en-GB')}`,
  ].join('\n');
}

export default function ExtinguishersPage() {
  const pageSize = 10;
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [plantsMaster, setPlantsMaster] = useState<PlantMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<Extinguisher | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [deleteConfirmExt, setDeleteConfirmExt] = useState<Extinguisher | null>(null);
  const [deleteDialogBusy, setDeleteDialogBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [emptyReportBusy, setEmptyReportBusy] = useState(false);
  const totalPages = Math.max(1, Math.ceil(extinguishers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedExtinguishers = extinguishers.slice(startIndex, startIndex + pageSize);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    id: '',
    division: '',
    subDivision: '',
    zone: '',
    plantOffice: '',
    plantId: '',
    companyCode: '',
    plantCode: '',
    plant: '',
    showStatus: '',
    region: '',
    plant_unit: '',
    cluster: '',
    company_name: '',
    make: '',
    type: 'D',
    media: 'Co2',
    capacity: '4.5',
    locationWithElevation: '',
    lastUtTestDate: '',
    manufacturingDate: '',
    nextUtTestDate: '',
    hydraulicDueDate: ''
  });

  const divisionOptions = useMemo(
    () => Array.from(new Set(locationHierarchy.map((item) => item.division))),
    []
  );
  const subDivisionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          locationHierarchy
            .filter((item) => item.division === formData.division)
            .map((item) => item.subDivision)
        )
      ),
    [formData.division]
  );
  const zoneOptions = useMemo(
    () =>
      Array.from(
        new Set(
          locationHierarchy
            .filter(
              (item) =>
                item.division === formData.division &&
                item.subDivision === formData.subDivision
            )
            .map((item) => item.zone)
        )
      ),
    [formData.division, formData.subDivision]
  );
  const plantOfficeOptions = useMemo(
    () =>
      locationHierarchy
        .filter(
          (item) =>
            item.division === formData.division &&
            item.subDivision === formData.subDivision &&
            item.zone === formData.zone
        )
        .map((item) => item.plantOffice),
    [formData.division, formData.subDivision, formData.zone]
  );

  useEffect(() => {
    const loadPlants = async () => {
      try {
        const response = await fetch('/api/plants', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as PlantMaster[];
        setPlantsMaster(data);
        if (data.length > 0) {
          const firstHierarchy = locationHierarchy[0];
          setFormData((prev) => {
            if (prev.plantId) return prev;
            const first = data[0];
            return {
              ...prev,
              division: firstHierarchy?.division ?? '',
              subDivision: firstHierarchy?.subDivision ?? '',
              zone: firstHierarchy?.zone ?? '',
              plantOffice: firstHierarchy?.plantOffice ?? first.plantSName,
              plantId: String(first.id),
              companyCode: first.companyCode,
              plantCode: first.plantCode,
              plant: first.plantSName,
              showStatus: first.showStatus,
              region: first.region,
              plant_unit: first.plant_unit,
              cluster: first.cluster,
              company_name: first.company_name,
            };
          });
        }
      } catch (error) {
        console.error('Failed to load plants for relation mapping', error);
      }
    };
    loadPlants();
  }, []);

  useEffect(() => {
    const loadExtinguishers = async () => {
      try {
        setLoading(true);
        const url = showArchived ? '/api/extinguishers?includeArchived=1' : '/api/extinguishers';
        const response = await fetch(url, { cache: 'no-store' });
        if (!response.ok) {
          let detail = response.statusText;
          try {
            const errJson = (await response.json()) as { message?: string; detail?: string };
            detail = [errJson.message, errJson.detail].filter(Boolean).join(' — ') || detail;
          } catch {
            /* ignore */
          }
          console.error('Failed to fetch extinguishers', response.status, detail);
          throw new Error(detail || 'Failed to fetch extinguishers');
        }
        const data = (await response.json()) as Extinguisher[];
        setExtinguishers(data);
        setCurrentPage(1);
      } catch (error) {
        console.error('Failed to fetch extinguisher records', error);
      } finally {
        setLoading(false);
      }
    };
    loadExtinguishers();
  }, [showArchived]);

  const isPastDue = (nextUt: string) => {
    const t = new Date(nextUt);
    if (Number.isNaN(t.getTime())) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    t.setHours(0, 0, 0, 0);
    return t.getTime() <= today.getTime();
  };

  const callArchiveApi = async (id: string, action: 'archive' | 'restore' | 'delete'): Promise<boolean> => {
    setArchiveBusyId(id);
    try {
      const response = await fetch('/api/extinguishers/archive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      });
      if (!response.ok) throw new Error('Archive request failed');
      const url = showArchived ? '/api/extinguishers?includeArchived=1' : '/api/extinguishers';
      const listRes = await fetch(url, { cache: 'no-store' });
      if (listRes.ok) {
        setExtinguishers((await listRes.json()) as Extinguisher[]);
        setCurrentPage(1);
      }
      if (selectedQR?.id === id && action !== 'restore') {
        setSelectedQR(null);
      }
      return true;
    } catch (error) {
      console.error('Archive / delete failed', error);
      return false;
    } finally {
      setArchiveBusyId(null);
    }
  };

  const confirmDeleteExtinguisher = async () => {
    const ext = deleteConfirmExt;
    if (!ext) return;
    setDeleteDialogBusy(true);
    try {
      const ok = await callArchiveApi(ext.id, 'delete');
      if (ok) {
        setDeleteConfirmExt(null);
        setToastMessage(`Extinguisher "${ext.id}" deleted successfully.`);
      }
    } finally {
      setDeleteDialogBusy(false);
    }
  };

  const handleReportEmptyCylinder = async (ext: Extinguisher) => {
    setEmptyReportBusy(true);
    try {
      const reporter = buildIssueReporterPayload(
        typeof window !== 'undefined' ? window.localStorage.getItem('nuvoco-current-user') : null,
        'Dashboard user'
      );
      const mailto = buildEmptyCylinderMailto(
        ext,
        reporter.reportedBy,
        reporter.reporterEmail,
        'Cylinder reported empty (equipment register / QR view).'
      );
      window.location.href = mailto;
      setToastMessage('Mail draft opened in your email app. Review details and click Send.');
    } catch {
      setToastMessage('Could not open mail app. Please check default mail app settings.');
    } finally {
      setEmptyReportBusy(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    const hasOpenModal = isModalOpen || Boolean(selectedQR) || Boolean(deleteConfirmExt);
    if (hasOpenModal) {
      document.body.classList.add('modal-open-extinguishers');
    } else {
      document.body.classList.remove('modal-open-extinguishers');
    }
    return () => {
      document.body.classList.remove('modal-open-extinguishers');
    };
  }, [isModalOpen, selectedQR, deleteConfirmExt, mounted]);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const newExtinguisher: Extinguisher = {
      ...formData,
      plantId: formData.plantId ? Number(formData.plantId) : null,
      id: formData.id.trim().toUpperCase(),
      hydraulicDueDate: formData.hydraulicDueDate?.trim() || null,
      installedBy: 'nuvoco\\admin', // Mock LDAP user from session
      installedDate: new Date().toISOString()
    };

    try {
      const response = await fetch('/api/extinguishers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newExtinguisher),
      });
      if (!response.ok) {
        throw new Error('Failed to save extinguisher');
      }
      const saved = (await response.json()) as Extinguisher;
      const existingIndex = extinguishers.findIndex((ext) => ext.id === saved.id);
      if (existingIndex >= 0) {
        const updated = [...extinguishers];
        updated[existingIndex] = saved;
        setExtinguishers(updated);
      } else {
        setExtinguishers([saved, ...extinguishers]);
        setCurrentPage(1);
      }
      setSelectedQR(saved);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to save extinguisher record', error);
      return;
    }
    setFormData({
      id: '',
      division: locationHierarchy[0]?.division ?? '',
      subDivision: locationHierarchy[0]?.subDivision ?? '',
      zone: locationHierarchy[0]?.zone ?? '',
      plantOffice: locationHierarchy[0]?.plantOffice ?? '',
      plantId: plantsMaster[0] ? String(plantsMaster[0].id) : '',
      companyCode: plantsMaster[0]?.companyCode ?? '',
      plantCode: plantsMaster[0]?.plantCode ?? '',
      plant: plantsMaster[0]?.plantSName ?? '',
      showStatus: plantsMaster[0]?.showStatus ?? '',
      region: plantsMaster[0]?.region ?? '',
      plant_unit: plantsMaster[0]?.plant_unit ?? '',
      cluster: plantsMaster[0]?.cluster ?? '',
      company_name: plantsMaster[0]?.company_name ?? '',
      make: '',
      type: 'D',
      media: 'Co2',
      capacity: '4.5',
      locationWithElevation: '',
      lastUtTestDate: '',
      manufacturingDate: '',
      nextUtTestDate: '',
      hydraulicDueDate: ''
    });
  };

  return (
    <div className="animate-fade-in">
      <HydraulicDuePopup />
      <div className="flex-between" style={{ marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>
            Extinguisher Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Register new equipment and generate QR codes. Archive removes rows from the active list; delete removes the record permanently.
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              userSelect: 'none',
            }}
          >
            <input
              type="checkbox"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            Show archived
          </label>
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            <Plus size={18} /> Register New
          </button>
        </div>
      </div>

      <div className="card ext-table-scroll" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Unique Serial Number</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Plant</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Make</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Type</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Media</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Capacity</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Location with Elevation</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Last UT test Date</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Manufacturing Date</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Next UT test</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Hydraulic due</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>QR code</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Archive</th>
            </tr>
          </thead>
          <tbody>
            {paginatedExtinguishers.map((ext) => (
              <tr
                key={ext.id}
                style={{
                  borderBottom: '1px solid var(--border-color)',
                  opacity: ext.archivedAt ? 0.72 : 1,
                  backgroundColor: ext.archivedAt ? 'var(--bg-main)' : undefined,
                }}
              >
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
                <td style={{ padding: '1rem' }}>{new Date(ext.manufacturingDate).toLocaleDateString('en-GB')}</td>
                <td
                  style={{
                    padding: '1rem',
                    color:
                      ext.archivedAt || !isPastDue(ext.nextUtTestDate)
                        ? undefined
                        : '#B45309',
                    fontWeight: !ext.archivedAt && isPastDue(ext.nextUtTestDate) ? 600 : undefined,
                  }}
                >
                  {new Date(ext.nextUtTestDate).toLocaleDateString('en-GB')}
                  {ext.archivedAt ? (
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>Archived</div>
                  ) : null}
                </td>
                <td
                  style={{
                    padding: '1rem',
                    color:
                      ext.archivedAt ||
                      !ext.hydraulicDueDate ||
                      !isPastDue(ext.hydraulicDueDate)
                        ? undefined
                        : '#0E7490',
                    fontWeight:
                      !ext.archivedAt && ext.hydraulicDueDate && isPastDue(ext.hydraulicDueDate)
                        ? 600
                        : undefined,
                  }}
                >
                  {ext.hydraulicDueDate
                    ? new Date(ext.hydraulicDueDate).toLocaleDateString('en-GB')
                    : '—'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => setSelectedQR(ext)}
                  >
                    <QRIcon size={16} /> View QR
                  </button>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {!ext.archivedAt ? (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                        disabled={archiveBusyId === ext.id}
                        title="Hide from active list"
                        onClick={() => callArchiveApi(ext.id, 'archive')}
                      >
                        <Archive size={14} /> Archive
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                        disabled={archiveBusyId === ext.id}
                        onClick={() => callArchiveApi(ext.id, 'restore')}
                      >
                        <RotateCcw size={14} /> Restore
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{
                        padding: '0.35rem 0.55rem',
                        fontSize: '0.75rem',
                        borderColor: 'rgba(230,57,70,0.35)',
                        color: '#B91C1C',
                      }}
                      disabled={archiveBusyId === ext.id}
                      title="Permanently delete this record"
                      onClick={() => setDeleteConfirmExt(ext)}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={13} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading extinguisher records...
                </td>
              </tr>
            )}
            {!loading && extinguishers.length === 0 && (
              <tr>
                <td colSpan={13} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No extinguishers registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
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
          Showing {extinguishers.length === 0 ? 0 : startIndex + 1}-
          {Math.min(startIndex + pageSize, extinguishers.length)} of {extinguishers.length}
        </div>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            className="btn btn-outline"
            disabled={safePage <= 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            style={{ padding: '0.35rem 0.55rem', fontSize: '0.78rem' }}
          >
            <ChevronLeft size={14} /> Prev
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
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Registration Modal */}
      {isModalOpen && mounted && createPortal(
        <div className="modal-shell" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(11,27,43,0.58)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(6px)'
        }}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="card modal-card"
            style={{ width: '100%', maxWidth: '560px', maxHeight: '90vh', backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,122,83,0.18)', boxShadow: '0 24px 60px rgba(11,27,43,0.26)', display: 'flex', flexDirection: 'column' }}
          >
            <div className="flex-between modal-header" style={{ padding: '0.95rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))', color: 'white' }}>
              <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>Register Extinguisher</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="modal-close"
                style={{
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
                aria-label="Close registration modal"
              >
                <X size={16} />
              </button>
            </div>
            
            <form onSubmit={handleRegister} style={{ padding: '1rem', overflowY: 'auto' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="input-label">Division</label>
                  <select
                    className="input-field"
                    value={formData.division}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        division: e.target.value,
                        subDivision: '',
                        zone: '',
                        plantOffice: '',
                      })
                    }
                    required
                  >
                    <option value="">Select Division</option>
                    {divisionOptions.map((division) => (
                      <option key={division} value={division}>
                        {division}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Sub Division</label>
                  <select
                    className="input-field"
                    value={formData.subDivision}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subDivision: e.target.value,
                        zone: '',
                        plantOffice: '',
                      })
                    }
                    required
                  >
                    <option value="">Select Sub Division</option>
                    {subDivisionOptions.map((subDivision) => (
                      <option key={subDivision} value={subDivision}>
                        {subDivision}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Zone</label>
                  <select
                    className="input-field"
                    value={formData.zone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        zone: e.target.value,
                        plantOffice: '',
                      })
                    }
                    required
                  >
                    <option value="">Select Zone</option>
                    {zoneOptions.map((zone) => (
                      <option key={zone} value={zone}>
                        {zone}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Plant/Office</label>
                  <select
                    className="input-field"
                    value={formData.plantOffice}
                    onChange={(e) => {
                      const plantOffice = e.target.value;
                      const masterMatch = plantsMaster.find(
                        (p) =>
                          plantOffice.toLowerCase().includes(p.plantSName.toLowerCase()) ||
                          p.plantSName.toLowerCase().includes(plantOffice.toLowerCase())
                      );
                      setFormData({
                        ...formData,
                        plantOffice,
                        plant: plantOffice,
                        plantId: masterMatch ? String(masterMatch.id) : '',
                        companyCode: masterMatch?.companyCode ?? formData.companyCode,
                        plantCode: masterMatch?.plantCode ?? formData.plantCode,
                        showStatus: masterMatch?.showStatus ?? formData.showStatus,
                        region: masterMatch?.region ?? formData.region,
                        plant_unit: masterMatch?.plant_unit ?? formData.plant_unit,
                        cluster: masterMatch?.cluster ?? formData.cluster,
                        company_name: masterMatch?.company_name ?? formData.company_name,
                      });
                    }}
                    required
                  >
                    <option value="">Select Plant/Office</option>
                    {plantOfficeOptions.map((plantOffice) => (
                      <option key={plantOffice} value={plantOffice}>
                        {plantOffice}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Unique Serial Number</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.id}
                    onChange={e => setFormData({ ...formData, id: e.target.value })}
                    required
                    placeholder="e.g. KCP01"
                  />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Plant</label>
                  <select
                    className="input-field"
                    value={formData.plantId}
                    onChange={e => {
                      const selected = plantsMaster.find((plant) => String(plant.id) === e.target.value);
                      setFormData({
                        ...formData,
                        plantId: e.target.value,
                        companyCode: selected?.companyCode ?? '',
                        plantCode: selected?.plantCode ?? '',
                        plant: selected?.plantSName ?? '',
                        showStatus: selected?.showStatus ?? '',
                        region: selected?.region ?? '',
                        plant_unit: selected?.plant_unit ?? '',
                        cluster: selected?.cluster ?? '',
                        company_name: selected?.company_name ?? '',
                      });
                    }}
                    required
                  >
                    {plantsMaster.length === 0 && <option value="">No plant master data</option>}
                    {plantsMaster.map((plant) => (
                      <option key={plant.id} value={plant.id}>
                        {plant.plantSName} ({plant.companyCode}/{plant.plantCode})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Make</label>
                  <input type="text" className="input-field" value={formData.make} onChange={e => setFormData({...formData, make: e.target.value})} required placeholder="e.g. Kanex" />
                </div>
                <div className="form-group">
                  <label className="input-label">Type</label>
                  <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="D">D</option>
                    <option value="ABC">ABC</option>
                    <option value="BC">BC</option>
                    <option value="CO2">CO2</option>
                    <option value="Water">Water</option>
                    <option value="Foam">Foam</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Media</label>
                  <select className="input-field" value={formData.media} onChange={e => setFormData({...formData, media: e.target.value})}>
                    <option value="Co2">Co2</option>
                    <option value="DCP">DCP</option>
                    <option value="Foam">Foam</option>
                    <option value="Water">Water</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Capacity</label>
                  <input type="text" className="input-field" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} required placeholder="e.g. 4.5" />
                </div>
                <div className="form-group">
                  <label className="input-label">Location with Elevation</label>
                  <input type="text" className="input-field" value={formData.locationWithElevation} onChange={e => setFormData({...formData, locationWithElevation: e.target.value})} required placeholder="e.g. CCR first floor" />
                </div>
                <div className="form-group">
                  <label className="input-label">Last UT test Date</label>
                  <input type="date" className="input-field" value={formData.lastUtTestDate} onChange={e => setFormData({...formData, lastUtTestDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="input-label">Manufacturing Date</label>
                  <input type="date" className="input-field" value={formData.manufacturingDate} onChange={e => setFormData({...formData, manufacturingDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="input-label">Next UT test</label>
                  <input type="date" className="input-field" value={formData.nextUtTestDate} onChange={e => setFormData({...formData, nextUtTestDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label className="input-label">Hydraulic test due (optional)</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.hydraulicDueDate}
                    onChange={(e) => setFormData({ ...formData, hydraulicDueDate: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--bg-main)' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-fire">Save & Generate QR</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* QR Code Modal */}
      {selectedQR && mounted && createPortal(
        <div className="modal-shell" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(11,27,43,0.58)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(6px)'
        }}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="card modal-card" style={{ width: '100%', maxWidth: '390px', maxHeight: '90vh', backgroundColor: 'white', overflow: 'hidden', borderRadius: 16, border: '1px solid rgba(0,122,83,0.18)', boxShadow: '0 24px 60px rgba(11,27,43,0.26)', display: 'flex', flexDirection: 'column' }}
          >
            <div className="modal-header" style={{ background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))', color: 'white', padding: '0.95rem 1rem', textAlign: 'center', position: 'relative' }}>
              <button 
                onClick={() => setSelectedQR(null)} 
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
            
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem', overflowY: 'auto' }}>
              <div style={{ padding: '1rem', background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                {/* Encodes the full saved record so scan page can show all fields. */}
                <QRCode 
                  value={buildQrValue(selectedQR)}
                  size={200} 
                  level="M"
                  fgColor="var(--text-primary)"
                />
              </div>
              
              <div style={{ width: '100%', borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Unique Serial Number</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{selectedQR.id}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Plant</span>
                    <strong>{selectedQR.plant}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {selectedQR.companyCode} / {selectedQR.plantCode}
                    </div>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Make</span>
                    <strong>{selectedQR.make}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Type</span>
                    <strong>{selectedQR.type}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Media</span>
                    <strong>{selectedQR.media}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Capacity</span>
                    <strong>{selectedQR.capacity}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Location with Elevation</span>
                    <strong>{selectedQR.locationWithElevation}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Last UT test</span>
                    <strong>{new Date(selectedQR.lastUtTestDate).toLocaleDateString('en-GB')}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Manufacturing Date</span>
                    <strong>{new Date(selectedQR.manufacturingDate).toLocaleDateString('en-GB')}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Next UT test</span>
                    <strong>{new Date(selectedQR.nextUtTestDate).toLocaleDateString('en-GB')}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Hydraulic test due</span>
                    <strong>
                      {selectedQR.hydraulicDueDate
                        ? new Date(selectedQR.hydraulicDueDate).toLocaleDateString('en-GB')
                        : '—'}
                    </strong>
                  </div>
                </div>
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
                  onClick={() => void handleReportEmptyCylinder(selectedQR)}
                >
                  <AlertTriangle size={16} />
                  {emptyReportBusy ? 'Sending report…' : 'Report empty cylinder'}
                </button>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.5rem', textAlign: 'center', lineHeight: 1.35 }}>
                  Opens your default mail app with prefilled report details for this extinguisher.
                </p>
              </div>
              
            </div>
          </motion.div>
        </div>,
        document.body
      )}
      {deleteConfirmExt && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="ext-delete-title"
          onClick={() => {
            if (!deleteDialogBusy) setDeleteConfirmExt(null);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(11,27,43,0.58)',
            zIndex: 10000,
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
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 400,
              backgroundColor: 'white',
              borderRadius: 16,
              overflow: 'hidden',
              border: '1px solid rgba(0,122,83,0.18)',
              boxShadow: '0 24px 60px rgba(11,27,43,0.26)',
            }}
          >
            <div style={{ padding: '1rem 1rem 0.75rem', borderBottom: '1px solid var(--border-color)' }}>
              <h2 id="ext-delete-title" style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: 'var(--color-secondary)' }}>
                Delete extinguisher
              </h2>
              <p style={{ margin: '0.65rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Do you want to delete this record permanently? This cannot be undone.
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {deleteConfirmExt.id}
                <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}> · {deleteConfirmExt.plant}</span>
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '0.65rem',
                padding: '1rem',
                background: 'var(--bg-main)',
              }}
            >
              <button
                type="button"
                className="btn btn-outline"
                disabled={deleteDialogBusy}
                onClick={() => setDeleteConfirmExt(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={deleteDialogBusy}
                style={{ background: '#B91C1C', borderColor: '#B91C1C' }}
                onClick={() => void confirmDeleteExtinguisher()}
              >
                {deleteDialogBusy ? 'Deleting…' : 'OK'}
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 10001,
            background: '#065F46',
            color: '#ECFDF5',
            border: '1px solid #10B981',
            borderRadius: 10,
            padding: '0.7rem 0.9rem',
            fontSize: '0.85rem',
            boxShadow: '0 12px 28px rgba(6, 95, 70, 0.35)',
            maxWidth: 360,
          }}
        >
          {toastMessage}
        </div>
      )}
      <style>{`
        .ext-table-scroll {
          scrollbar-width: auto;
        }
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
        .modal-close {
          transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
        }
        .modal-close:hover {
          transform: scale(1.05);
          background: rgba(255,255,255,0.28) !important;
          box-shadow: 0 6px 14px rgba(11,27,43,0.25);
        }
        @media (max-width: 767px) {
          .modal-shell {
            padding: 0.75rem !important;
          }
          .modal-card {
            max-width: 100% !important;
            border-radius: 14px !important;
          }
          .modal-header h2 {
            font-size: 0.95rem !important;
          }
          .form-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
