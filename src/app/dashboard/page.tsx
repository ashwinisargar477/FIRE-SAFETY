'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Factory,
  Users,
  AlertTriangle,
  CheckCircle,
  Activity,
  TrendingUp,
  QrCode,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardSummary() {
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState('Ashwini Sargar');
  const [expiredItems, setExpiredItems] = useState<Array<Record<string, unknown>>>([]);
  const [dueSoonCount, setDueSoonCount] = useState(0);
  const [extinguisherCount, setExtinguisherCount] = useState(0);
  const [plantCount, setPlantCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [inspectedCount, setInspectedCount] = useState(0);
  const [typeBreakdown, setTypeBreakdown] = useState<Array<{ type: string; count: number; color: string }>>([]);
  const [inspections, setInspections] = useState<Array<{ label: string; v: number }>>([
    { label: 'Mon', v: 0 },
    { label: 'Tue', v: 0 },
    { label: 'Wed', v: 0 },
    { label: 'Thu', v: 0 },
    { label: 'Fri', v: 0 },
    { label: 'Sat', v: 0 },
    { label: 'Sun', v: 0 },
  ]);
  const [recentActivity, setRecentActivity] = useState<
    Array<{ id: string; type: string; plant: string; where: string; who: string; when: string; status: 'installed' | 'inspected' }>
  >([]);

  useEffect(() => {
    setMounted(true);
    try {
      const raw = window.localStorage.getItem('nuvoco-current-user');
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed?.displayName) {
        setDisplayName(parsed.displayName);
      }
    } catch (error) {
      console.error('Failed to read current user', error);
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const loadLiveDashboardData = async () => {
      try {
        const [expiryRes, extRes, plantRes, usersRes] = await Promise.all([
          fetch('/api/extinguishers/expiry', { cache: 'no-store' }),
          fetch('/api/extinguishers', { cache: 'no-store' }),
          fetch('/api/plants', { cache: 'no-store' }),
          fetch('/api/users', { cache: 'no-store' }),
        ]);

        if (expiryRes.ok) {
          const expiry = (await expiryRes.json()) as { expired?: Array<Record<string, unknown>>; dueSoon?: unknown[] };
          const expired = expiry.expired ?? [];
          setExpiredItems(expired);
          setDueSoonCount(Array.isArray(expiry.dueSoon) ? expiry.dueSoon.length : 0);
        }

        if (plantRes.ok) {
          const plants = (await plantRes.json()) as Array<Record<string, unknown>>;
          setPlantCount(plants.length);
        }

        if (usersRes.ok) {
          const users = (await usersRes.json()) as Array<Record<string, unknown>>;
          setUserCount(users.length);
        }

        if (extRes.ok) {
          const extRows = (await extRes.json()) as Array<Record<string, unknown>>;
          setExtinguisherCount(extRows.length);

          const installed = extRows.filter((r) => !String(r.archivedAt ?? '').trim());
          setInspectedCount(installed.length);

          const byType = new Map<string, number>();
          for (const row of extRows) {
            const t = String(row.type ?? '').trim().toUpperCase() || 'UNKNOWN';
            byType.set(t, (byType.get(t) ?? 0) + 1);
          }
          const palette = ['#007A53', '#FF6B35', '#3B82F6', '#8BBE35', '#A855F7', '#F59E0B'];
          const mix = Array.from(byType.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 6)
            .map(([type, count], idx) => ({ type, count, color: palette[idx % palette.length] }));
          setTypeBreakdown(mix);

          const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          const weekCounts = [0, 0, 0, 0, 0, 0, 0];
          for (const row of extRows) {
            const d = new Date(String(row.installedDate ?? ''));
            if (Number.isNaN(d.getTime())) continue;
            weekCounts[d.getDay()] += 1;
          }
          setInspections([
            { label: 'Mon', v: weekCounts[1] },
            { label: 'Tue', v: weekCounts[2] },
            { label: 'Wed', v: weekCounts[3] },
            { label: 'Thu', v: weekCounts[4] },
            { label: 'Fri', v: weekCounts[5] },
            { label: 'Sat', v: weekCounts[6] },
            { label: 'Sun', v: weekCounts[0] },
          ]);

          const relTime = (iso: string) => {
            const d = new Date(iso);
            if (Number.isNaN(d.getTime())) return 'recently';
            const mins = Math.floor((Date.now() - d.getTime()) / 60000);
            if (mins < 1) return 'just now';
            if (mins < 60) return `${mins} min ago`;
            const hrs = Math.floor(mins / 60);
            if (hrs < 24) return `${hrs} hr ago`;
            const days = Math.floor(hrs / 24);
            return days === 1 ? 'Yesterday' : `${days} days ago`;
          };

          const recent = [...extRows]
            .sort((a, b) => new Date(String(b.installedDate ?? '')).getTime() - new Date(String(a.installedDate ?? '')).getTime())
            .slice(0, 6)
            .map((r) => ({
              id: String(r.id ?? 'N/A'),
              type: `${String(r.type ?? 'N/A')} ${String(r.capacity ?? '').trim()}`.trim(),
              plant: String(r.plant ?? 'N/A'),
              where: String(r.locationWithElevation ?? 'N/A'),
              who: String(r.installedBy ?? 'system'),
              when: relTime(String(r.installedDate ?? '')),
              status: 'installed' as const,
            }));
          setRecentActivity(recent);
        }
      } catch (error) {
        console.error('Failed to load dashboard live data', error);
      }
    };
    loadLiveDashboardData();
  }, [mounted]);

  const stats = [
    {
      label: 'Total Extinguishers',
      value: extinguisherCount.toLocaleString('en-IN'),
      delta: 'Live from register',
      icon: Flame,
      gradient: 'linear-gradient(135deg,#FF6B35,#E63946)',
      tone: '#FF6B35',
    },
    {
      label: 'Active Plants',
      value: plantCount.toLocaleString('en-IN'),
      delta: 'Live from plant master',
      icon: Factory,
      gradient: 'linear-gradient(135deg,#007A53,#8BBE35)',
      tone: '#007A53',
    },
    {
      label: 'Users',
      value: userCount.toLocaleString('en-IN'),
      delta: 'Live from user master',
      icon: Users,
      gradient: 'linear-gradient(135deg,#3B82F6,#004B87)',
      tone: '#3B82F6',
    },
    {
      label: 'UT / hydraulic due',
      value: `${expiredItems.length} overdue · ${dueSoonCount} ≤30d`,
      delta: 'From live register',
      icon: AlertTriangle,
      gradient: 'linear-gradient(135deg,#F59E0B,#FFB627)',
      tone: '#F59E0B',
    },
  ];

  const maxV = Math.max(1, ...inspections.map((i) => i.v));
  const totalType = Math.max(1, typeBreakdown.reduce((a, b) => a + b.count, 0));
  const compliance = extinguisherCount === 0 ? 100 : Math.max(0, Math.min(100, Math.round((inspectedCount / extinguisherCount) * 100)));

  if (!mounted) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          borderRadius: 20,
          overflow: 'hidden',
          background: 'var(--gradient-dark)',
          color: 'white',
          padding: '1.75rem 1.75rem',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            right: -60,
            top: -60,
            width: 260,
            height: 260,
            background:
              'radial-gradient(circle, rgba(255,107,53,0.45) 0%, rgba(255,107,53,0) 70%)',
            filter: 'blur(10px)',
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <div>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '0.3rem 0.7rem',
                borderRadius: 999,
                background: 'rgba(255,107,53,0.15)',
                border: '1px solid rgba(255,107,53,0.35)',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: '#FFB627',
                marginBottom: 8,
              }}
            >
              <Sparkles size={12} /> Safety Snapshot
            </div>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, margin: 0 }}>
              Safety Overview
            </h2>
            <p style={{ marginTop: 6, marginBottom: 0, opacity: 0.85, fontSize: '0.85rem' }}>
              Welcome, {displayName}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <Link href="/dashboard/extinguishers" className="btn btn-fire">
              <Flame size={16} /> Register New
            </Link>
            <Link href="/dashboard/extinguishers" className="btn btn-ghost">
              <QrCode size={16} /> Generate QR
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '1rem',
        }}
      >
        {stats.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            whileHover={{ y: -3 }}
            className="card"
            style={{ padding: '1.1rem', position: 'relative', overflow: 'hidden' }}
          >
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: s.gradient,
              }}
            />
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 12,
                  background: s.gradient,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  boxShadow: `0 8px 20px -6px ${s.tone}66`,
                }}
              >
                <s.icon size={20} />
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: 'var(--text-secondary)',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                  }}
                >
                  {s.label}
                </div>
                <div
                  style={{
                    fontSize: '1.65rem',
                    fontWeight: 800,
                    color: 'var(--text-primary)',
                    lineHeight: 1.1,
                    marginTop: 2,
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: '0.72rem',
                    color: s.tone,
                    marginTop: 4,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    fontWeight: 600,
                  }}
                >
                  <TrendingUp size={12} /> {s.delta}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts Row */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: '1.25rem',
        }}
        className="charts-row"
      >
        {/* Inspections Bar Chart */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card"
          style={{ padding: '1.25rem' }}
        >
          <div className="flex-between" style={{ marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
                Weekly Inspection Scans
              </h3>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                Scans captured across all plants
              </p>
            </div>
            <span className="badge badge-success">
              <CheckCircle size={12} /> On track
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-end',
              gap: 14,
              height: 180,
              padding: '0.5rem 0',
            }}
          >
            {inspections.map((d, i) => (
              <div
                key={d.label}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(d.v / maxV) * 100}%` }}
                  transition={{ delay: 0.4 + i * 0.06, duration: 0.6 }}
                  style={{
                    width: '100%',
                    borderRadius: '10px 10px 4px 4px',
                    background: 'linear-gradient(180deg,#FF6B35,#E63946)',
                    boxShadow: '0 4px 12px rgba(255,107,53,0.35)',
                    minHeight: 6,
                    position: 'relative',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: -22,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                    }}
                  >
                    {d.v}
                  </span>
                </motion.div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                  {d.label}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Compliance Ring */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card"
          style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
            Safety Compliance
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Overall system compliance score
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flex: 1,
            }}
          >
            <ComplianceRing value={compliance} />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 8,
              marginTop: '1rem',
            }}
          >
            <MiniTile label="Inspected" value={inspectedCount.toLocaleString('en-IN')} tone="#10B981" />
            <MiniTile label="Pending" value={Math.max(extinguisherCount - inspectedCount, 0).toLocaleString('en-IN')} tone="#F59E0B" />
          </div>
        </motion.div>
      </div>

      {/* Breakdown + Activity */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1.2fr',
          gap: '1.25rem',
        }}
        className="charts-row"
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="card"
          style={{ padding: '1.25rem' }}
        >
          <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-secondary)' }}>
            Extinguisher Mix
          </h3>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            Distribution by type
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {typeBreakdown.map((t, i) => {
              const pct = Math.round((t.count / totalType) * 100);
              return (
                <div key={t.type}>
                  <div className="flex-between" style={{ marginBottom: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: 3,
                          background: t.color,
                          display: 'inline-block',
                        }}
                      />
                      <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{t.type}</span>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                      {t.count} · {pct}%
                    </span>
                  </div>
                  <div
                    style={{
                      height: 8,
                      borderRadius: 999,
                      background: '#F3F4F6',
                      overflow: 'hidden',
                    }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.6 + i * 0.1, duration: 0.8 }}
                      style={{
                        height: '100%',
                        background: t.color,
                        borderRadius: 999,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="card"
          style={{ padding: '1.25rem' }}
        >
          <div className="flex-between" style={{ marginBottom: '0.75rem' }}>
            <h3
              style={{
                fontSize: '1rem',
                fontWeight: 700,
                color: 'var(--color-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Activity size={16} /> Recent Activity
            </h3>
            <Link
              href="/dashboard/extinguishers"
              style={{
                color: 'var(--color-secondary)',
                fontSize: '0.8rem',
                fontWeight: 600,
              }}
            >
              View all →
            </Link>
          </div>

          <ul
            style={{
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 0,
            }}
          >
            {recentActivity.map((it, idx, arr) => (
              <li
                key={it.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '0.75rem 0',
                  borderBottom:
                    idx !== arr.length - 1 ? '1px dashed var(--border-color)' : 'none',
                }}
              >
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background:
                      it.status === 'installed'
                        ? 'rgba(16,185,129,0.12)'
                        : 'rgba(59,130,246,0.12)',
                    color: it.status === 'installed' ? '#059669' : '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {it.status === 'installed' ? <Flame size={16} /> : <ShieldCheck size={16} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span style={{ color: 'var(--color-primary)' }}>{it.id}</span> · {it.type}
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      color: 'var(--text-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 5,
                      flexWrap: 'wrap',
                    }}
                  >
                    <MapPin size={11} /> {it.plant} · {it.where}
                    <span style={{ opacity: 0.6 }}>• by {it.who}</span>
                  </div>
                </div>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {it.when}
                </span>
              </li>
            ))}
            {recentActivity.length === 0 && (
              <li style={{ padding: '0.6rem 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No live activity yet.
              </li>
            )}
          </ul>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .charts-row { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function ComplianceRing({ value }: { value: number }) {
  const size = 160;
  const stroke = 14;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size}>
        <defs>
          <linearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FF6B35" />
            <stop offset="100%" stopColor="#007A53" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#F3F4F6"
          strokeWidth={stroke}
          fill="none"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#ringGradient)"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.4, ease: 'easeOut' }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: '1.9rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
          {value}%
        </div>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Compliance
        </div>
      </div>
    </div>
  );
}

function MiniTile({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div
      style={{
        padding: '0.6rem 0.8rem',
        background: `${tone}10`,
        borderRadius: 10,
        border: `1px solid ${tone}33`,
      }}
    >
      <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: tone }}>{value}</div>
    </div>
  );
}
