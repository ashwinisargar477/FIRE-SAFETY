'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import Link from 'next/link';

type ExpiryAlertRow = {
  id: string;
  plant: string;
  plantOffice: string;
  nextUtTestDate: string;
  hydraulicDueDate: string | null;
  utOverdue: unknown;
  hydraulicOverdue: unknown;
  daysUtOverdue: unknown;
  daysHydraulicOverdue: unknown;
};

const DISMISS_KEY = 'nuvoco-hydraulic-ut-overdue-dismissed';

function isOverdueFlag(v: unknown): boolean {
  if (v === true) return true;
  if (typeof v === 'bigint') return v === BigInt(1);
  return Number(v) === 1;
}

function dueDaysSuffix(days: unknown): string {
  if (days == null) return '';
  const n = Number(days);
  if (Number.isNaN(n)) return '';
  if (n === 0) return ' — due today';
  return ` — ${n} day(s) overdue`;
}

export default function HydraulicDuePopup() {
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<ExpiryAlertRow[]>([]);
  const [open, setOpen] = useState(false);
  const [todayHydraulicCount, setTodayHydraulicCount] = useState(0);
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const run = async () => {
      try {
        const response = await fetch('/api/extinguishers/expiry', { cache: 'no-store' });
        if (!response.ok) return;
        const data = (await response.json()) as { expired?: ExpiryAlertRow[] };
        const expired = data.expired ?? [];
        setItems(expired);
        const dueTodayHydraulic = expired.filter(
          (row) =>
            isOverdueFlag(row.hydraulicOverdue) &&
            row.daysHydraulicOverdue != null &&
            Number(row.daysHydraulicOverdue) === 0
        );
        setTodayHydraulicCount(dueTodayHydraulic.length);
        if (dueTodayHydraulic.length > 0) {
          setShowToast(true);
        }
        const today = new Date().toISOString().slice(0, 10);
        if (expired.length > 0 && window.sessionStorage.getItem(DISMISS_KEY) !== today) {
          setOpen(true);
        }
      } catch (error) {
        console.error('Hydraulic due popup: failed to load expiry', error);
      }
    };
    run();
  }, [mounted]);

  const dismiss = () => {
    const today = new Date().toISOString().slice(0, 10);
    window.sessionStorage.setItem(DISMISS_KEY, today);
    setOpen(false);
  };

  useEffect(() => {
    if (!showToast) return;
    const timer = window.setTimeout(() => setShowToast(false), 8000);
    return () => window.clearTimeout(timer);
  }, [showToast]);

  if (!mounted) return null;

  return createPortal(
    <>
      {showToast && todayHydraulicCount > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          style={{
            position: 'fixed',
            top: 16,
            right: 16,
            zIndex: 10060,
            background: 'linear-gradient(135deg, #0E7490, #0284C7)',
            color: 'white',
            borderRadius: 12,
            boxShadow: '0 14px 30px rgba(2,132,199,0.35)',
            padding: '0.8rem 0.9rem',
            maxWidth: 360,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
          }}
        >
          <AlertTriangle size={18} style={{ marginTop: 2, flexShrink: 0 }} />
          <div style={{ fontSize: '0.82rem', lineHeight: 1.4 }}>
            <div style={{ fontWeight: 700 }}>Hydraulic due today</div>
            <div>{todayHydraulicCount} extinguisher(s) have hydraulic due date set to today.</div>
          </div>
          <button
            type="button"
            onClick={() => setShowToast(false)}
            aria-label="Close toast"
            style={{
              marginLeft: 'auto',
              border: '1px solid rgba(255,255,255,0.45)',
              background: 'transparent',
              color: 'white',
              width: 24,
              height: 24,
              borderRadius: 999,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            <X size={12} />
          </button>
        </motion.div>
      )}

      {open && items.length > 0 && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="hydraulic-due-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 10050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1rem',
            backgroundColor: 'rgba(11,27,43,0.55)',
            backdropFilter: 'blur(6px)',
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="card"
            style={{
              width: '100%',
              maxWidth: 540,
              maxHeight: '88vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 16,
              border: '1px solid rgba(14,116,144,0.35)',
              boxShadow: '0 24px 60px rgba(11,27,43,0.28)',
              background: 'white',
            }}
          >
            <div
              style={{
                padding: '1rem 1.1rem',
                borderBottom: '1px solid var(--border-color)',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                background: 'linear-gradient(135deg, #ECFEFF, #FFF7ED)',
              }}
            >
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 12,
                    background: 'rgba(14,116,144,0.14)',
                    color: '#0E7490',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <AlertTriangle size={22} />
                </div>
                <div>
                  <h2
                    id="hydraulic-due-title"
                    style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--color-secondary)' }}
                  >
                    Overdue hydraulic / UT test dates
                  </h2>
                  <p
                    style={{
                      margin: '6px 0 0',
                      fontSize: '0.8rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    One or more registered dates are today or earlier. Complete the hydraulic pressure test and UT cycle as
                    per your procedure, update the dates in Extinguishers, or archive retired equipment.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={dismiss}
                aria-label="Close"
                style={{
                  background: 'rgba(255,255,255,0.95)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 999,
                  width: 34,
                  height: 34,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <X size={16} />
              </button>
            </div>
            <div style={{ padding: '0.75rem 1rem', overflowY: 'auto', flex: 1 }}>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.map((row) => {
                  const utBad = isOverdueFlag(row.utOverdue);
                  const hydBad = isOverdueFlag(row.hydraulicOverdue);
                  return (
                    <li
                      key={row.id}
                      style={{
                        padding: '0.7rem 0',
                        borderBottom: '1px dashed var(--border-color)',
                        fontSize: '0.85rem',
                      }}
                    >
                      <div style={{ fontWeight: 700, color: 'var(--color-primary)' }}>{row.id}</div>
                      <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                        {row.plant}
                        {row.plantOffice ? ` · ${row.plantOffice}` : ''}
                      </div>
                      {utBad ? (
                        <div style={{ fontSize: '0.78rem', marginTop: 6, color: '#B45309', fontWeight: 600 }}>
                          Next UT test due: {row.nextUtTestDate}
                          {utBad ? dueDaysSuffix(row.daysUtOverdue) : ''}
                        </div>
                      ) : null}
                      {hydBad ? (
                        <div style={{ fontSize: '0.78rem', marginTop: 4, color: '#0E7490', fontWeight: 600 }}>
                          Hydraulic test due: {row.hydraulicDueDate ?? '—'}
                          {hydBad ? dueDaysSuffix(row.daysHydraulicOverdue) : ''}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
            <div
              style={{
                padding: '0.85rem 1rem',
                borderTop: '1px solid var(--border-color)',
                display: 'flex',
                flexWrap: 'wrap',
                gap: 10,
                justifyContent: 'flex-end',
                background: 'var(--bg-main)',
              }}
            >
              <button type="button" className="btn btn-outline" onClick={dismiss}>
                Dismiss until tomorrow
              </button>
              <Link href="/dashboard/extinguishers" className="btn btn-primary" onClick={dismiss}>
                Update in Extinguishers
              </Link>
            </div>
          </motion.div>
        </div>
      )}
    </>,
    document.body
  );
}
