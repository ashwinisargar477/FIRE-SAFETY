'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
  ClipboardList,
  Filter,
  RotateCcw,
} from 'lucide-react';
import Link from 'next/link';
import { locationHierarchy } from '@/data/locationHierarchy';

type DashboardExtinguisherRow = {
  id: string;
  division: string;
  subDivision: string;
  zone: string;
  plantOffice: string;
  plant: string;
  companyCode: string;
  plantCode: string;
  make: string;
  type: string;
  media: string;
  capacity: string;
  locationWithElevation: string;
  archivedAt?: string | null;
  lastInspectionAt?: string | null;
  inspectionPending?: boolean;
  installedDate?: string;
  installedBy?: string;
};

type LocationFilterState = {
  division: string;
  subDivision: string;
  zone: string;
  plantOffice: string;
};

type DashboardStatCard = {
  label: string;
  /** Shown as large figure when `valueNode` is not set */
  value?: string;
  /** Custom main body (e.g. UT / hydraulic split counts) */
  valueNode?: React.ReactNode;
  delta: string;
  icon: typeof Flame;
  gradient: string;
  tone: string;
};

const emptyLocFilter: LocationFilterState = {
  division: '',
  subDivision: '',
  zone: '',
  plantOffice: '',
};

function rowMatchesLocationFilter(
  r: { division?: string; subDivision?: string; zone?: string; plantOffice?: string },
  f: LocationFilterState
): boolean {
  if (f.division && (r.division ?? '') !== f.division) return false;
  if (f.subDivision && (r.subDivision ?? '') !== f.subDivision) return false;
  if (f.zone && (r.zone ?? '') !== f.zone) return false;
  if (f.plantOffice && (r.plantOffice ?? '') !== f.plantOffice) return false;
  return true;
}

export default function DashboardSummary() {
  const [mounted, setMounted] = useState(false);
  const [displayName, setDisplayName] = useState('Ashwini Sargar');
  const [expiredItems, setExpiredItems] = useState<Array<Record<string, unknown>>>([]);
  const [userCount, setUserCount] = useState(0);
  const [plantsList, setPlantsList] = useState<Array<Record<string, unknown>>>([]);
  const [dueSoonList, setDueSoonList] = useState<Array<Record<string, unknown>>>([]);
  const [extinguisherRegistry, setExtinguisherRegistry] = useState<DashboardExtinguisherRow[]>([]);
  const [locFilterDraft, setLocFilterDraft] = useState<LocationFilterState>(emptyLocFilter);
  const [locFilterApplied, setLocFilterApplied] = useState<LocationFilterState>(emptyLocFilter);

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
          setDueSoonList(Array.isArray(expiry.dueSoon) ? (expiry.dueSoon as Array<Record<string, unknown>>) : []);
        }

        if (plantRes.ok) {
          const plants = (await plantRes.json()) as Array<Record<string, unknown>>;
          setPlantsList(plants);
        }

        if (usersRes.ok) {
          const users = (await usersRes.json()) as Array<Record<string, unknown>>;
          setUserCount(users.length);
        }

        if (extRes.ok) {
          const extRows = (await extRes.json()) as Array<Record<string, unknown>>;
          setExtinguisherRegistry(
            extRows.map((r) => ({
              id: String(r.id ?? ''),
              division: String(r.division ?? ''),
              subDivision: String(r.subDivision ?? ''),
              zone: String(r.zone ?? ''),
              plantOffice: String(r.plantOffice ?? ''),
              plant: String(r.plant ?? ''),
              companyCode: String(r.companyCode ?? ''),
              plantCode: String(r.plantCode ?? ''),
              make: String(r.make ?? ''),
              type: String(r.type ?? ''),
              media: String(r.media ?? ''),
              capacity: String(r.capacity ?? ''),
              locationWithElevation: String(r.locationWithElevation ?? ''),
              archivedAt: r.archivedAt != null ? String(r.archivedAt) : null,
              lastInspectionAt: r.lastInspectionAt != null ? String(r.lastInspectionAt) : null,
              inspectionPending: Boolean(r.inspectionPending),
              installedDate: r.installedDate != null ? String(r.installedDate) : '',
              installedBy: r.installedBy != null ? String(r.installedBy) : '',
            }))
          );
        }
      } catch (error) {
        console.error('Failed to load dashboard live data', error);
      }
    };
    loadLiveDashboardData();
  }, [mounted]);

  /** Same hierarchy lists as Plant Master → Add Plant (`locationHierarchy`). */
  const hierarchyDivisionOptions = useMemo(
    () => Array.from(new Set(locationHierarchy.map((item) => item.division))),
    []
  );
  const hierarchySubDivisionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          locationHierarchy
            .filter((item) => item.division === locFilterDraft.division)
            .map((item) => item.subDivision)
        )
      ),
    [locFilterDraft.division]
  );
  const hierarchyZoneOptions = useMemo(
    () =>
      Array.from(
        new Set(
          locationHierarchy
            .filter(
              (item) =>
                item.division === locFilterDraft.division &&
                item.subDivision === locFilterDraft.subDivision
            )
            .map((item) => item.zone)
        )
      ),
    [locFilterDraft.division, locFilterDraft.subDivision]
  );
  const hierarchyPlantOfficeOptions = useMemo(
    () =>
      locationHierarchy
        .filter(
          (item) =>
            item.division === locFilterDraft.division &&
            item.subDivision === locFilterDraft.subDivision &&
            item.zone === locFilterDraft.zone
        )
        .map((item) => item.plantOffice),
    [locFilterDraft.division, locFilterDraft.subDivision, locFilterDraft.zone]
  );

  const hasLocationFilterApplied = Boolean(
    locFilterApplied.division ||
      locFilterApplied.subDivision ||
      locFilterApplied.zone ||
      locFilterApplied.plantOffice
  );

  const extinguishersInLocationScope = useMemo(
    () => extinguisherRegistry.filter((r) => rowMatchesLocationFilter(r, locFilterApplied)),
    [extinguisherRegistry, locFilterApplied]
  );

  const plantsInLocationScope = useMemo(
    () =>
      plantsList.filter((p) =>
        rowMatchesLocationFilter(
          {
            division: String(p.division ?? ''),
            subDivision: String(p.subDivision ?? ''),
            zone: String(p.zone ?? ''),
            plantOffice: String(p.plantOffice ?? ''),
          },
          locFilterApplied
        )
      ),
    [plantsList, locFilterApplied]
  );

  const scopeExtinguisherIds = useMemo(
    () => new Set(extinguishersInLocationScope.map((e) => e.id)),
    [extinguishersInLocationScope]
  );

  const expiredInScope = useMemo(() => {
    if (!hasLocationFilterApplied) return expiredItems;
    return expiredItems.filter((row) => scopeExtinguisherIds.has(String(row.id ?? '')));
  }, [expiredItems, scopeExtinguisherIds, hasLocationFilterApplied]);

  const dueSoonInScope = useMemo(() => {
    if (!hasLocationFilterApplied) return dueSoonList;
    return dueSoonList.filter((row) => scopeExtinguisherIds.has(String(row.id ?? '')));
  }, [dueSoonList, scopeExtinguisherIds, hasLocationFilterApplied]);

  const extinguisherCountScoped = extinguishersInLocationScope.length;
  const plantCountScoped = plantsInLocationScope.length;

  const installedInScope = useMemo(
    () => extinguishersInLocationScope.filter((r) => !String(r.archivedAt ?? '').trim()),
    [extinguishersInLocationScope]
  );
  const inspectedCountScoped = installedInScope.length;

  const typeBreakdownScoped = useMemo(() => {
    const byType = new Map<string, number>();
    for (const row of extinguishersInLocationScope) {
      const t = row.type?.trim().toUpperCase() || 'UNKNOWN';
      byType.set(t, (byType.get(t) ?? 0) + 1);
    }
    const palette = ['#007A53', '#FF6B35', '#3B82F6', '#8BBE35', '#A855F7', '#F59E0B'];
    return Array.from(byType.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([type, count], idx) => ({ type, count, color: palette[idx % palette.length] }));
  }, [extinguishersInLocationScope]);

  const inspectionsScoped = useMemo(() => {
    const weekCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const row of extinguishersInLocationScope) {
      const d = new Date(String(row.installedDate ?? ''));
      if (Number.isNaN(d.getTime())) continue;
      weekCounts[d.getDay()] += 1;
    }
    return [
      { label: 'Mon', v: weekCounts[1] },
      { label: 'Tue', v: weekCounts[2] },
      { label: 'Wed', v: weekCounts[3] },
      { label: 'Thu', v: weekCounts[4] },
      { label: 'Fri', v: weekCounts[5] },
      { label: 'Sat', v: weekCounts[6] },
      { label: 'Sun', v: weekCounts[0] },
    ];
  }, [extinguishersInLocationScope]);

  const recentActivityScoped = useMemo(() => {
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
    return [...extinguishersInLocationScope]
      .sort(
        (a, b) =>
          new Date(String(b.installedDate ?? '')).getTime() - new Date(String(a.installedDate ?? '')).getTime()
      )
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
  }, [extinguishersInLocationScope]);

  const inspectionOverdueTotalOrg = useMemo(
    () =>
      extinguisherRegistry.filter((r) => {
        const archived = String(r.archivedAt ?? '').trim();
        return !archived && r.inspectionPending === true;
      }),
    [extinguisherRegistry]
  );

  const inspectionOverdueScoped = useMemo(
    () =>
      extinguishersInLocationScope.filter((r) => {
        const archived = String(r.archivedAt ?? '').trim();
        return !archived && r.inspectionPending === true;
      }),
    [extinguishersInLocationScope]
  );

  const applyLocationFilter = () => {
    setLocFilterApplied({ ...locFilterDraft });
  };

  const clearLocationFilter = () => {
    setLocFilterDraft({ ...emptyLocFilter });
    setLocFilterApplied({ ...emptyLocFilter });
  };

  const scopeFootnote = hasLocationFilterApplied ? 'Selected location' : 'Live from register';
  const scopeFootnotePlants = hasLocationFilterApplied ? 'Selected location' : 'Live from plant master';
  const scopeFootnoteExpiry = hasLocationFilterApplied ? 'Selected location' : 'From live register';

  const inspectionOverdueStatDelta = hasLocationFilterApplied
    ? inspectionOverdueScoped.length !== inspectionOverdueTotalOrg.length
      ? `of ${inspectionOverdueTotalOrg.length.toLocaleString('en-IN')} org-wide`
      : 'Filtered · live register'
    : 'Live from register';

  const stats: DashboardStatCard[] = [
    {
      label: 'Total Extinguishers',
      value: extinguisherCountScoped.toLocaleString('en-IN'),
      delta: scopeFootnote,
      icon: Flame,
      gradient: 'linear-gradient(135deg,#FF6B35,#E63946)',
      tone: '#FF6B35',
    },
    {
      label: 'Active Plants',
      value: plantCountScoped.toLocaleString('en-IN'),
      delta: scopeFootnotePlants,
      icon: Factory,
      gradient: 'linear-gradient(135deg,#007A53,#8BBE35)',
      tone: '#007A53',
    },
    {
      label: 'Users',
      value: userCount.toLocaleString('en-IN'),
      delta: hasLocationFilterApplied ? 'Organization total' : 'Live from user master',
      icon: Users,
      gradient: 'linear-gradient(135deg,#3B82F6,#004B87)',
      tone: '#3B82F6',
    },
    {
      label: 'UT / hydraulic due',
      valueNode: (
        <div
          style={{
            marginTop: 4,
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: 6,
            lineHeight: 1.2,
          }}
        >
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '0.22rem 0.5rem',
              borderRadius: 999,
              background: 'rgba(180, 83, 9, 0.1)',
              border: '1px solid rgba(180, 83, 9, 0.22)',
            }}
          >
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#9A3412', letterSpacing: '-0.02em' }}>
              {expiredInScope.length}
            </span>
            <span
              style={{
                fontSize: '0.58rem',
                fontWeight: 700,
                color: '#B45309',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              overdue
            </span>
          </span>
          <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontWeight: 700 }} aria-hidden>
            ·
          </span>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '0.22rem 0.5rem',
              borderRadius: 999,
              background: 'rgba(14, 116, 144, 0.08)',
              border: '1px solid rgba(14, 116, 144, 0.2)',
            }}
          >
            <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0E7490', letterSpacing: '-0.02em' }}>
              {dueSoonInScope.length}
            </span>
            <span
              style={{
                fontSize: '0.58rem',
                fontWeight: 700,
                color: '#0F766E',
                letterSpacing: '0.04em',
              }}
            >
              ≤30d
            </span>
          </span>
        </div>
      ),
      delta: scopeFootnoteExpiry,
      icon: AlertTriangle,
      gradient: 'linear-gradient(135deg,#F59E0B,#FFB627)',
      tone: '#F59E0B',
    },
    {
      label: 'Inspection overdue',
      value: inspectionOverdueScoped.length.toLocaleString('en-IN'),
      delta: inspectionOverdueStatDelta,
      icon: ClipboardList,
      gradient: 'linear-gradient(135deg,#C2410C,#EA580C)',
      tone: '#EA580C',
    },
  ];

  const maxV = Math.max(1, ...inspectionsScoped.map((i) => i.v));
  const totalType = Math.max(1, typeBreakdownScoped.reduce((a, b) => a + b.count, 0));
  const compliance =
    extinguisherCountScoped === 0
      ? 100
      : Math.max(0, Math.min(100, Math.round((inspectedCountScoped / extinguisherCountScoped) * 100)));

  if (!mounted) return null;

  return (
    <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          position: 'relative',
          borderRadius: 16,
          overflow: 'hidden',
          background: 'var(--gradient-dark)',
          color: 'white',
          padding: '1rem 1.25rem',
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
                gap: 5,
                padding: '0.2rem 0.55rem',
                borderRadius: 999,
                background: 'rgba(255,107,53,0.15)',
                border: '1px solid rgba(255,107,53,0.35)',
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#FFB627',
                marginBottom: 4,
              }}
            >
              <Sparkles size={11} /> Safety Snapshot
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, lineHeight: 1.2 }}>
              Safety Overview
            </h2>
            <p style={{ marginTop: 4, marginBottom: 0, opacity: 0.85, fontSize: '0.78rem' }}>
              Welcome, {displayName}
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Link
              href="/dashboard/extinguishers"
              className="btn btn-fire"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              <Flame size={15} /> Register New
            </Link>
            <Link
              href="/dashboard/extinguishers"
              className="btn btn-ghost"
              style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
            >
              <QrCode size={15} /> Generate QR
            </Link>
          </div>
        </div>
      </motion.div>

      {/* Location filter — above KPI cards; Filter applies to all KPIs and charts below */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.06 }}
        className="card"
        style={{ padding: '0.65rem 1rem' }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.45rem',
            marginBottom: '0.5rem',
          }}
        >
          <h3
            style={{
              fontSize: '0.85rem',
              fontWeight: 700,
              color: 'var(--color-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              margin: 0,
            }}
          >
            <Filter size={15} aria-hidden />
            Location filter
          </h3>
          <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
            Same location tree as Plant Master (Add Plant). Click Filter to refresh all cards and charts for the selection.
          </span>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '0.5rem',
            marginBottom: '0.5rem',
            alignItems: 'end',
          }}
        >
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.68rem', fontWeight: 600 }}>
            Division
            <select
              className="input-field"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', minHeight: 36 }}
              value={locFilterDraft.division}
              onChange={(e) =>
                setLocFilterDraft({
                  division: e.target.value,
                  subDivision: '',
                  zone: '',
                  plantOffice: '',
                })
              }
            >
              <option value="">All divisions</option>
              {hierarchyDivisionOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.68rem', fontWeight: 600 }}>
            Subdivision
            <select
              className="input-field"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', minHeight: 36 }}
              disabled={!locFilterDraft.division}
              value={locFilterDraft.subDivision}
              onChange={(e) =>
                setLocFilterDraft((prev) => ({
                  ...prev,
                  subDivision: e.target.value,
                  zone: '',
                  plantOffice: '',
                }))
              }
            >
              <option value="">All subdivisions</option>
              {hierarchySubDivisionOptions.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.68rem', fontWeight: 600 }}>
            Zone
            <select
              className="input-field"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', minHeight: 36 }}
              disabled={!locFilterDraft.subDivision}
              value={locFilterDraft.zone}
              onChange={(e) =>
                setLocFilterDraft((prev) => ({
                  ...prev,
                  zone: e.target.value,
                  plantOffice: '',
                }))
              }
            >
              <option value="">All zones</option>
              {hierarchyZoneOptions.map((z) => (
                <option key={z} value={z}>
                  {z}
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 2, fontSize: '0.68rem', fontWeight: 600 }}>
            Plant / Office
            <select
              className="input-field"
              style={{ fontSize: '0.78rem', padding: '0.35rem 0.5rem', minHeight: 36 }}
              disabled={!locFilterDraft.zone}
              value={locFilterDraft.plantOffice}
              onChange={(e) => setLocFilterDraft((prev) => ({ ...prev, plantOffice: e.target.value }))}
            >
              <option value="">All plants / offices</option>
              {hierarchyPlantOfficeOptions.map((p) => (
                <option key={`${locFilterDraft.zone}-${p}`} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
          <button
            type="button"
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.32rem 0.65rem', fontSize: '0.78rem' }}
            onClick={applyLocationFilter}
          >
            <Filter size={13} aria-hidden />
            Filter
          </button>
          <button
            type="button"
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '0.32rem 0.65rem', fontSize: '0.78rem' }}
            onClick={clearLocationFilter}
          >
            <RotateCcw size={13} aria-hidden />
            Clear
          </button>
        </div>
      </motion.div>

      {/* Stats — five KPI cards in one row on wide screens */}
      <div className="dashboard-kpi-row">
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
                {s.valueNode != null ? (
                  <div style={{ minHeight: '2.25rem' }}>{s.valueNode}</div>
                ) : (
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
                )}
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
            {inspectionsScoped.map((d, i) => (
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
            <MiniTile label="Inspected" value={inspectedCountScoped.toLocaleString('en-IN')} tone="#10B981" />
            <MiniTile
              label="Pending"
              value={Math.max(extinguisherCountScoped - inspectedCountScoped, 0).toLocaleString('en-IN')}
              tone="#F59E0B"
            />
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
            {typeBreakdownScoped.map((t, i) => {
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
            {recentActivityScoped.map((it, idx, arr) => (
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
            {recentActivityScoped.length === 0 && (
              <li style={{ padding: '0.6rem 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                No live activity yet.
              </li>
            )}
          </ul>
        </motion.div>
      </div>

      <style>{`
        .dashboard-kpi-row {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 1rem;
        }
        @media (max-width: 1200px) {
          .dashboard-kpi-row {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }
        @media (max-width: 720px) {
          .dashboard-kpi-row {
            grid-template-columns: 1fr;
          }
        }
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
