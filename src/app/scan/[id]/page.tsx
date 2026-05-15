'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { buildIssueReporterPayload } from '@/lib/sessionUser';
import { formatManufacturingYear } from '@/lib/manufacturingYear';
import FireClassReferenceBlock from '@/components/FireClassReferenceBlock';
import { Flame, Calendar, User, MapPin, CheckCircle, ShieldAlert, Building2, Hash, AlertTriangle } from 'lucide-react';

const TYPE_USAGE_MAP: Record<string, string> = {
  A: 'Can be used to extinguish ordinary combustibles like paper, wood, and cloth.',
  B: 'Can be used to extinguish fire in oil / flammable liquids.',
  C: 'Can be used to extinguish gas fire.',
  D: 'Can be used to extinguish metal fire.',
  E: 'Can be used to extinguish electrical fires.',
};

function getExtinguisherUsageMessage(typeValue: unknown): string {
  const raw = String(typeValue ?? '').toUpperCase();
  if (!raw) return 'Usage guidance is not available for this extinguisher type.';

  const matched = ['A', 'B', 'C', 'D', 'E'].filter((code) => raw.includes(code));
  if (matched.length === 0) {
    return 'Usage guidance is not available for this extinguisher type.';
  }

  return matched.map((code) => TYPE_USAGE_MAP[code]).join(' ');
}

function ScanContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);
  const [emptyNote, setEmptyNote] = useState('');
  const [emptyReportBusy, setEmptyReportBusy] = useState(false);
  const [emptyReportBanner, setEmptyReportBanner] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);

  const openMailClientForReport = () => {
    const reporter = buildIssueReporterPayload(
      typeof window !== 'undefined' ? window.localStorage.getItem('nuvoco-current-user') : null,
      'Scan visitor'
    );
    const targetEmail = reporter.reporterEmail || 'ashwinisargar18@gmail.com';
    const subject = `[Nuvoco Fire Safety] Empty cylinder report - ${String(data.id)}`;
    const bodyLines = [
      'An empty extinguisher cylinder has been reported.',
      '',
      `Extinguisher ID: ${String(data.id)}`,
      `Plant: ${String(data.plant ?? 'N/A')} (${String(data.plantCode ?? 'N/A')})`,
      `Location: ${String(data.locationWithElevation ?? 'N/A')}`,
      `Make/Type: ${String(data.make ?? 'N/A')} / ${String(data.type ?? 'N/A')}`,
      `Media/Capacity: ${String(data.media ?? 'N/A')} / ${String(data.capacity ?? 'N/A')}`,
      `Last UT test: ${String(data.lastUtTestDate ?? 'N/A')}`,
      `Manufacturing year: ${formatManufacturingYear(data.manufacturingDate)}`,
      `Hydraulic test due: ${String(data.hydraulicDueDate ?? 'N/A')}`,
      `Hydraulic test due Date: ${String(data.nextUtTestDate ?? 'N/A')}`,
      '',
      `Reported by: ${reporter.reportedBy}`,
      `Note: ${emptyNote.trim() || 'Cylinder reported empty.'}`,
      `Time: ${new Date().toISOString()}`,
    ];
    const mailto = `mailto:${encodeURIComponent(targetEmail)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyLines.join('\n'))}`;
    window.location.href = mailto;
  };

  const submitEmptyCylinderReport = async () => {
    if (!data?.id) return;
    setEmptyReportBusy(true);
    setEmptyReportBanner(null);
    try {
      openMailClientForReport();
      setEmptyReportBanner({
        kind: 'ok',
        text: 'Mail draft opened in your email app. Review details and click Send.',
      });
      setEmptyNote('');
    } catch {
      setEmptyReportBanner({ kind: 'err', text: 'Could not open mail app. Please check your default mail app settings.' });
    } finally {
      setEmptyReportBusy(false);
    }
  };

  useEffect(() => {
    const load = async () => {
    const rawData = searchParams.get('data');
    if (rawData) {
      try {
        setData(JSON.parse(rawData));
        return;
      } catch (e) {
        console.error("Failed to parse", e);
      }
    }

    try {
      const response = await fetch('/api/extinguishers', { cache: 'no-store' });
      if (!response.ok) return;
      const rows = await response.json();
      if (!Array.isArray(rows)) return;
      const found = rows.find((item) => item.id === id);
      if (found) setData(found);
    } catch (error) {
      console.error('Failed to read extinguisher records', error);
    }
    };
    load();
  }, [searchParams, id]);

  if (!data) {
    return (
      <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-main)' }}>
        <div className="card glass" style={{ padding: '2rem', textAlign: 'center' }}>
          <ShieldAlert size={48} color="var(--status-warning)" style={{ margin: '0 auto 1rem' }} />
          <h2>Loading Information...</h2>
          <p>Please wait while we verify this equipment.</p>
        </div>
      </div>
    );
  }

  const usageMessage = getExtinguisherUsageMessage(data.type);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '1rem', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        
        <header style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            width: '60px', height: '60px', 
            borderRadius: '50%', 
            background: 'var(--color-primary)', 
            color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-md)'
          }}>
            <Flame size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--color-secondary)' }}>Equipment Details</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nuvoco Fire Safety System</p>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ overflow: 'hidden' }}
        >
          <div style={{ background: 'var(--status-success)', color: 'white', padding: '1.5rem', textAlign: 'center' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Active Equipment</h2>
            <p style={{ opacity: 0.9, fontSize: '0.875rem', marginTop: '0.25rem' }}>Unique Serial Number: <strong>{data.id}</strong></p>
          </div>
          
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--color-secondary)' }}>
              Registration Record
            </h3>
            
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><Flame size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Type / Media / Capacity</span>
                  <strong style={{ fontSize: '1rem' }}>{data.type} / {data.media} / {data.capacity}</strong>
                  <div style={{ marginTop: '0.65rem' }}>
                    <FireClassReferenceBlock type={String(data.type ?? '')} />
                  </div>
                  <p style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                    {usageMessage}
                  </p>
                </div>
              </li>
              
              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><MapPin size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location Details</span>
                  <strong style={{ fontSize: '1rem', display: 'block' }}>{data.plant}</strong>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{data.locationWithElevation}</span>
                </div>
              </li>

              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><Building2 size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Plant Relation</span>
                  <strong style={{ fontSize: '1rem' }}>{data.companyCode} / {data.plantCode}</strong>
                  <span style={{ display: 'block', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>Plant ID: {data.plantId ?? 'N/A'}</span>
                </div>
              </li>

              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><Hash size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Make</span>
                  <strong style={{ fontSize: '1rem' }}>{data.make}</strong>
                </div>
              </li>

              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><Calendar size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Last UT Test Date</span>
                  <strong style={{ fontSize: '1rem' }}>{new Date(data.lastUtTestDate).toLocaleDateString('en-GB')}</strong>
                </div>
              </li>

              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><Calendar size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Manufacturing year</span>
                  <strong style={{ fontSize: '1rem' }}>{formatManufacturingYear(data.manufacturingDate)}</strong>
                </div>
              </li>

              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><Calendar size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Hydraulic test due Date</span>
                  <strong style={{ fontSize: '1rem' }}>{new Date(data.nextUtTestDate).toLocaleDateString('en-GB')}</strong>
                </div>
              </li>

              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><User size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Installed By</span>
                  <strong style={{ fontSize: '1rem' }}>{data.installedBy}</strong>
                </div>
              </li>

              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><Calendar size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Installed Date</span>
                  <strong style={{ fontSize: '1rem' }}>{new Date(data.installedDate).toLocaleString('en-GB')}</strong>
                </div>
              </li>
            </ul>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ marginTop: '1rem', overflow: 'hidden' }}
        >
          <div style={{ padding: '1.25rem' }}>
            <h3
              style={{
                fontSize: '1rem',
                margin: '0 0 0.5rem',
                color: 'var(--color-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <AlertTriangle size={20} color="var(--status-warning)" />
              Report empty cylinder
            </h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '0 0 1rem', lineHeight: 1.45 }}>
              If this extinguisher is empty, open your email app with all report details prefilled, then click Send.
            </p>
            <label className="input-label" style={{ display: 'block', fontSize: '0.75rem', marginBottom: 6 }}>
              Optional note
            </label>
            <textarea
              className="input-field"
              rows={2}
              value={emptyNote}
              onChange={(e) => setEmptyNote(e.target.value)}
              placeholder="e.g. Location / observed time"
              style={{ width: '100%', resize: 'vertical', marginBottom: '0.75rem' }}
            />
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              disabled={emptyReportBusy}
              onClick={() => void submitEmptyCylinderReport()}
            >
              <AlertTriangle size={18} />
              {emptyReportBusy ? 'Opening mail app…' : 'Report by email'}
            </button>
            {emptyReportBanner && (
              <p
                style={{
                  marginTop: '0.75rem',
                  fontSize: '0.8rem',
                  lineHeight: 1.4,
                  color: emptyReportBanner.kind === 'ok' ? '#065F46' : '#991B1B',
                  background: emptyReportBanner.kind === 'ok' ? '#D1FAE5' : '#FEE2E2',
                  padding: '0.6rem 0.75rem',
                  borderRadius: 8,
                }}
              >
                {emptyReportBanner.text}
              </p>
            )}
          </div>
        </motion.div>
        
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            This information is maintained securely by Nuvoco.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ScanResultPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading QR Data...</div>}>
      <ScanContent id={params.id} />
    </Suspense>
  );
}
