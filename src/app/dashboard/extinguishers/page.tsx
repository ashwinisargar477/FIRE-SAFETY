'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, QrCode as QRIcon, X, Archive, RotateCcw, Trash2, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { createPortal } from 'react-dom';
import { locationHierarchy } from '@/data/locationHierarchy';
import HydraulicDuePopup from '@/components/HydraulicDuePopup';
import { formatManufacturingYear } from '@/lib/manufacturingYear';
import { addYearsToIsoDate } from '@/lib/addYearsToIsoDate';
/* Class legend is rendered via FireClassReferenceBlock; only dropdown options are imported here. */
import { FIRE_CLASS_TYPE_OPTIONS } from '@/lib/fireClassReference';
import ExtinguisherQrViewModal from '@/components/ExtinguisherQrViewModal';

/** Select value for “Others”; free-text until added or saved on submit. */
const TYPE_OTHERS_VALUE = '__others__';

const BASE_TYPE_OPTIONS = ['D', 'ABC', 'BC', 'CO2', 'Water', 'Foam'] as const;

const EXTRA_TYPES_STORAGE_KEY = 'nuvoco-extinguisher-extra-types';

const BASE_MEDIA_OPTIONS = ['Co2', 'DCP', 'Foam', 'Water'] as const;

const EXTRA_MEDIA_STORAGE_KEY = 'nuvoco-extinguisher-extra-media';

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
  /** ISO-like string from API, or null if never inspected. */
  lastInspectionAt?: string | null;
  /** True when active row has no inspection in the last 3 months (after new-install grace). */
  inspectionPending?: boolean;
}

interface PlantMaster {
  id: number;
  companyCode: string;
  plantCode: string;
  plantOffice: string;
  showStatus: string;
  region: string;
  plant_unit: string;
  cluster: string;
  company_name: string;
}

function normalizeOptionKeyLocal(s: string) {
  return s.trim().toUpperCase();
}

function resolveTypeSelectForForm(ext: Extinguisher, extraTypeOptions: string[]) {
  const raw = ext.type?.trim() ?? '';
  const key = normalizeOptionKeyLocal(raw);
  const all = [...BASE_TYPE_OPTIONS, ...FIRE_CLASS_TYPE_OPTIONS, ...extraTypeOptions];
  const hit = all.find((t) => normalizeOptionKeyLocal(t) === key);
  if (hit) return { typeSelect: hit, typeOther: '' as string };
  return { typeSelect: TYPE_OTHERS_VALUE, typeOther: raw };
}

function resolveMediaSelectForForm(ext: Extinguisher, extraMediaOptions: string[]) {
  const raw = ext.media?.trim() ?? '';
  const key = normalizeOptionKeyLocal(raw);
  const all = [...BASE_MEDIA_OPTIONS, ...extraMediaOptions];
  const hit = all.find((m) => normalizeOptionKeyLocal(m) === key);
  if (hit) return { mediaSelect: hit, mediaOther: '' as string };
  return { mediaSelect: TYPE_OTHERS_VALUE, mediaOther: raw };
}

export default function ExtinguishersPage() {
  const pageSize = 10;
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [plantsMaster, setPlantsMaster] = useState<PlantMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  /** When set, registration modal is editing this serial (serial field locked). */
  const [editingExtinguisherId, setEditingExtinguisherId] = useState<string | null>(null);
  const [selectedQR, setSelectedQR] = useState<Extinguisher | null>(null);
  const [mounted, setMounted] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [archiveBusyId, setArchiveBusyId] = useState<string | null>(null);
  const [deleteConfirmExt, setDeleteConfirmExt] = useState<Extinguisher | null>(null);
  const [deleteDialogBusy, setDeleteDialogBusy] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastIsError, setToastIsError] = useState(false);
  const [extraTypeOptions, setExtraTypeOptions] = useState<string[]>([]);
  const extraTypesHydrated = useRef(false);
  const [extraMediaOptions, setExtraMediaOptions] = useState<string[]>([]);
  const extraMediaHydrated = useRef(false);
  const totalPages = Math.max(1, Math.ceil(extinguishers.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedExtinguishers = extinguishers.slice(startIndex, startIndex + pageSize);

  const handleQrInspectionSaved = useCallback(() => {
    const listUrl = showArchived ? '/api/extinguishers?includeArchived=1' : '/api/extinguishers';
    void fetch(listUrl, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!json || !Array.isArray(json)) return;
        const arr = json as Extinguisher[];
        setExtinguishers(arr);
        if (arr.some((e) => Boolean(e.inspectionPending))) {
          void fetch('/api/extinguishers/inspection-pending-notify', { method: 'POST' }).catch(() => {
            /* non-blocking */
          });
        }
      })
      .catch(() => {
        /* ignore */
      });
  }, [showArchived]);

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
    typeSelect: 'D',
    typeOther: '',
    mediaSelect: 'Co2',
    mediaOther: '',
    capacity: '4.5',
    locationWithElevation: '',
    manufacturingDate: '',
    hydraulicDueDate: '',
    lastUtTestDate: ''
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

  const nextHydraulicDueDatePreview = useMemo(() => {
    const raw = formData.hydraulicDueDate?.trim();
    if (!raw) return '';
    return addYearsToIsoDate(raw.slice(0, 10), 3);
  }, [formData.hydraulicDueDate]);

  const manufacturingYearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    const yearsFuture = 15;
    const yearsPast = 80;
    const newest = current + yearsFuture;
    const oldest = current - yearsPast;
    const years: number[] = [];
    for (let y = newest; y >= oldest; y -= 1) years.push(y);
    return years;
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(EXTRA_TYPES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setExtraTypeOptions(
            parsed
              .filter((x): x is string => typeof x === 'string')
              .map((x) => x.trim())
              .filter(Boolean)
          );
        }
      }
    } catch {
      /* ignore */
    } finally {
      extraTypesHydrated.current = true;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(EXTRA_MEDIA_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed)) {
          setExtraMediaOptions(
            parsed
              .filter((x): x is string => typeof x === 'string')
              .map((x) => x.trim())
              .filter(Boolean)
          );
        }
      }
    } catch {
      /* ignore */
    } finally {
      extraMediaHydrated.current = true;
    }
  }, []);

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
              plantOffice: firstHierarchy?.plantOffice ?? first.plantOffice,
              plantId: String(first.id),
              companyCode: first.companyCode,
              plantCode: first.plantCode,
              plant: first.plantOffice,
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
        if (data.some((e) => Boolean(e.inspectionPending))) {
          void fetch('/api/extinguishers/inspection-pending-notify', { method: 'POST' }).catch(() => {
            /* non-blocking */
          });
        }
      } catch (error) {
        console.error('Failed to fetch extinguisher records', error);
        setToastMessage('Could not load extinguisher list. Please refresh.');
        setToastIsError(true);
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
        setToastIsError(false);
      } else {
        setToastMessage('Delete failed. Please try again.');
        setToastIsError(true);
      }
    } finally {
      setDeleteDialogBusy(false);
    }
  };

  useEffect(() => {
    if (!mounted) return;
    const hasOpenModal = isModalOpen || Boolean(deleteConfirmExt);
    if (hasOpenModal) {
      document.body.classList.add('modal-open-extinguishers');
    } else {
      document.body.classList.remove('modal-open-extinguishers');
    }
    return () => {
      document.body.classList.remove('modal-open-extinguishers');
    };
  }, [isModalOpen, deleteConfirmExt, mounted]);

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

  const normalizeOptionKey = (s: string) => s.trim().toUpperCase();

  const handleAddCustomType = () => {
    const raw = formData.typeOther.trim();
    if (!raw) {
      setToastMessage('Enter a type name before adding.');
      setToastIsError(true);
      return;
    }
    if (normalizeOptionKey(raw) === normalizeOptionKey(TYPE_OTHERS_VALUE)) {
      setToastMessage('Choose a different type name.');
      setToastIsError(true);
      return;
    }
    const key = normalizeOptionKey(raw);
    const exists =
      BASE_TYPE_OPTIONS.some((b) => normalizeOptionKey(b) === key) ||
      extraTypeOptions.some((x) => normalizeOptionKey(x) === key);
    if (exists) {
      setToastMessage('That type is already in the list.');
      setToastIsError(true);
      return;
    }
    const nextExtras = [...extraTypeOptions, raw].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    setExtraTypeOptions(nextExtras);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(EXTRA_TYPES_STORAGE_KEY, JSON.stringify(nextExtras));
      }
    } catch {
      /* ignore */
    }
    setFormData((prev) => ({ ...prev, typeSelect: raw, typeOther: '' }));
    setToastMessage('Type added to the dropdown list.');
    setToastIsError(false);
  };

  const handleAddCustomMedia = () => {
    const raw = formData.mediaOther.trim();
    if (!raw) {
      setToastMessage('Enter a media name before adding.');
      setToastIsError(true);
      return;
    }
    if (normalizeOptionKey(raw) === normalizeOptionKey(TYPE_OTHERS_VALUE)) {
      setToastMessage('Choose a different media name.');
      setToastIsError(true);
      return;
    }
    const key = normalizeOptionKey(raw);
    const exists =
      BASE_MEDIA_OPTIONS.some((b) => normalizeOptionKey(b) === key) ||
      extraMediaOptions.some((x) => normalizeOptionKey(x) === key);
    if (exists) {
      setToastMessage('That media is already in the list.');
      setToastIsError(true);
      return;
    }
    const nextExtras = [...extraMediaOptions, raw].sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: 'base' })
    );
    setExtraMediaOptions(nextExtras);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(EXTRA_MEDIA_STORAGE_KEY, JSON.stringify(nextExtras));
      }
    } catch {
      /* ignore */
    }
    setFormData((prev) => ({ ...prev, mediaSelect: raw, mediaOther: '' }));
    setToastMessage('Media added to the dropdown list.');
    setToastIsError(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    const hydraulicNorm = formData.hydraulicDueDate?.trim().slice(0, 10) ?? '';
    if (!hydraulicNorm) {
      setToastMessage('Hydraulic test due is required.');
      setToastIsError(true);
      return;
    }
    const nextUtTestDate = addYearsToIsoDate(hydraulicNorm, 3);

    let resolvedType = '';
    if (formData.typeSelect === TYPE_OTHERS_VALUE) {
      resolvedType = formData.typeOther.trim();
      if (!resolvedType) {
        setToastMessage('Enter the type text when Others is selected.');
        setToastIsError(true);
        return;
      }
    } else {
      resolvedType = formData.typeSelect;
    }

    let resolvedMedia = '';
    if (formData.mediaSelect === TYPE_OTHERS_VALUE) {
      resolvedMedia = formData.mediaOther.trim();
      if (!resolvedMedia) {
        setToastMessage('Enter the media text when Others is selected.');
        setToastIsError(true);
        return;
      }
    } else {
      resolvedMedia = formData.mediaSelect;
    }

    const { typeSelect: _ts, typeOther: _to, mediaSelect: _ms, mediaOther: _mo, ...formRest } = formData;

    const lastUtForSave = (formData.lastUtTestDate || formData.manufacturingDate).trim().slice(0, 10);

    const newExtinguisher: Extinguisher = {
      ...formRest,
      type: resolvedType,
      media: resolvedMedia,
      plantId: formData.plantId ? Number(formData.plantId) : null,
      id: formData.id.trim().toUpperCase(),
      lastUtTestDate: lastUtForSave,
      nextUtTestDate,
      hydraulicDueDate: hydraulicNorm,
      installedBy: 'nuvoco\\admin', // Mock LDAP user from session
      installedDate: new Date().toISOString()
    };

    const patchPayload = {
      division: formRest.division,
      subDivision: formRest.subDivision,
      zone: formRest.zone,
      plantOffice: formRest.plantOffice,
      plantId: formData.plantId ? Number(formData.plantId) : null,
      companyCode: formRest.companyCode,
      plantCode: formRest.plantCode,
      plant: formRest.plant,
      showStatus: formRest.showStatus,
      region: formRest.region,
      plant_unit: formRest.plant_unit,
      cluster: formRest.cluster,
      company_name: formRest.company_name,
      make: formRest.make,
      type: resolvedType,
      media: resolvedMedia,
      capacity: formRest.capacity,
      locationWithElevation: formRest.locationWithElevation,
      lastUtTestDate: lastUtForSave,
      manufacturingDate: formData.manufacturingDate,
      nextUtTestDate,
      hydraulicDueDate: hydraulicNorm,
    };

    try {
      const isEdit = Boolean(editingExtinguisherId);
      const response = await fetch(
        isEdit
          ? `/api/extinguishers/${encodeURIComponent(editingExtinguisherId!)}`
          : '/api/extinguishers',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(isEdit ? patchPayload : newExtinguisher),
        }
      );
      if (!response.ok) {
        let message = isEdit ? 'Failed to update extinguisher' : 'Failed to save extinguisher';
        try {
          const payload = (await response.json()) as { message?: string };
          if (payload.message) message = payload.message;
        } catch {
          /* ignore */
        }
        setToastMessage(message);
        setToastIsError(true);
        return;
      }
      const saved = (await response.json()) as Extinguisher;
      const existingIndex = extinguishers.findIndex((ex) => ex.id === saved.id);
      if (existingIndex >= 0) {
        const updated = [...extinguishers];
        updated[existingIndex] = saved;
        setExtinguishers(updated);
      } else {
        setExtinguishers([saved, ...extinguishers]);
        setCurrentPage(1);
      }
      if (!isEdit) {
        setSelectedQR(saved);
      } else if (selectedQR?.id === saved.id) {
        setSelectedQR(saved);
      }
      closeRegistrationModal();
      setToastMessage(
        isEdit ? `Extinguisher "${saved.id}" updated.` : `Extinguisher "${saved.id}" saved. QR is ready.`
      );
      setToastIsError(false);
    } catch (error) {
      console.error('Failed to save extinguisher record', error);
      setToastMessage('Could not save extinguisher. Check your connection.');
      setToastIsError(true);
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
      plant: plantsMaster[0]?.plantOffice ?? '',
      showStatus: plantsMaster[0]?.showStatus ?? '',
      region: plantsMaster[0]?.region ?? '',
      plant_unit: plantsMaster[0]?.plant_unit ?? '',
      cluster: plantsMaster[0]?.cluster ?? '',
      company_name: plantsMaster[0]?.company_name ?? '',
      make: '',
      typeSelect: 'D',
      typeOther: '',
      mediaSelect: 'Co2',
      mediaOther: '',
      capacity: '4.5',
      locationWithElevation: '',
      manufacturingDate: '',
      hydraulicDueDate: '',
      lastUtTestDate: ''
    });
  };

  const closeRegistrationModal = () => {
    setIsModalOpen(false);
    setEditingExtinguisherId(null);
  };

  const openRegisterNewModal = () => {
    setEditingExtinguisherId(null);
    setFormData({
      id: '',
      division: locationHierarchy[0]?.division ?? '',
      subDivision: locationHierarchy[0]?.subDivision ?? '',
      zone: locationHierarchy[0]?.zone ?? '',
      plantOffice: locationHierarchy[0]?.plantOffice ?? '',
      plantId: plantsMaster[0] ? String(plantsMaster[0].id) : '',
      companyCode: plantsMaster[0]?.companyCode ?? '',
      plantCode: plantsMaster[0]?.plantCode ?? '',
      plant: plantsMaster[0]?.plantOffice ?? '',
      showStatus: plantsMaster[0]?.showStatus ?? '',
      region: plantsMaster[0]?.region ?? '',
      plant_unit: plantsMaster[0]?.plant_unit ?? '',
      cluster: plantsMaster[0]?.cluster ?? '',
      company_name: plantsMaster[0]?.company_name ?? '',
      make: '',
      typeSelect: 'D',
      typeOther: '',
      mediaSelect: 'Co2',
      mediaOther: '',
      capacity: '4.5',
      locationWithElevation: '',
      manufacturingDate: '',
      hydraulicDueDate: '',
      lastUtTestDate: '',
    });
    setIsModalOpen(true);
  };

  const openEditExtinguisherModal = (ext: Extinguisher) => {
    const { typeSelect, typeOther } = resolveTypeSelectForForm(ext, extraTypeOptions);
    const { mediaSelect, mediaOther } = resolveMediaSelectForForm(ext, extraMediaOptions);
    const lastUt =
      ext.lastUtTestDate && !Number.isNaN(new Date(ext.lastUtTestDate).getTime())
        ? ext.lastUtTestDate.slice(0, 10)
        : '';
    const mfg =
      ext.manufacturingDate && !Number.isNaN(new Date(ext.manufacturingDate).getTime())
        ? ext.manufacturingDate.slice(0, 10)
        : '';
    const hydraulic =
      ext.hydraulicDueDate && !Number.isNaN(new Date(ext.hydraulicDueDate).getTime())
        ? ext.hydraulicDueDate.slice(0, 10)
        : '';
    setFormData({
      id: ext.id,
      division: ext.division ?? '',
      subDivision: ext.subDivision ?? '',
      zone: ext.zone ?? '',
      plantOffice: ext.plantOffice ?? '',
      plantId: ext.plantId != null ? String(ext.plantId) : '',
      companyCode: ext.companyCode ?? '',
      plantCode: ext.plantCode ?? '',
      plant: ext.plant ?? '',
      showStatus: ext.showStatus ?? '',
      region: ext.region ?? '',
      plant_unit: ext.plant_unit ?? '',
      cluster: ext.cluster ?? '',
      company_name: ext.company_name ?? '',
      make: ext.make ?? '',
      typeSelect,
      typeOther,
      mediaSelect,
      mediaOther,
      capacity: ext.capacity ?? '',
      locationWithElevation: ext.locationWithElevation ?? '',
      manufacturingDate: mfg,
      hydraulicDueDate: hydraulic,
      lastUtTestDate: lastUt || mfg,
    });
    setEditingExtinguisherId(ext.id);
    setIsModalOpen(true);
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
          <button type="button" className="btn btn-primary" onClick={() => openRegisterNewModal()}>
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
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Manufacturing year</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Hydraulic test due Date</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Hydraulic due</th>
              <th
                style={{
                  padding: '1rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 2,
                  backgroundColor: 'var(--bg-main)',
                  lineHeight: 1.35,
                }}
              >
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
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)', whiteSpace: 'nowrap' }}>QR code</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)', whiteSpace: 'nowrap' }}>Edit</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)', whiteSpace: 'nowrap' }}>Archive</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)', whiteSpace: 'nowrap' }}>Delete</th>
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
                <td style={{ padding: '1rem' }}>{formatManufacturingYear(ext.manufacturingDate)}</td>
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
                    onClick={() => setSelectedQR(ext)}
                  >
                    <QRIcon size={16} /> View QR
                  </button>
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                    disabled={archiveBusyId === ext.id}
                    title="Edit all fields"
                    onClick={() => openEditExtinguisherModal(ext)}
                  >
                    <Pencil size={14} /> Edit
                  </button>
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
                  {!ext.archivedAt ? (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                      disabled={archiveBusyId === ext.id}
                      title="Hide from active list"
                      onClick={() =>
                        void (async () => {
                          const ok = await callArchiveApi(ext.id, 'archive');
                          if (ok) {
                            setToastMessage(`Extinguisher "${ext.id}" archived.`);
                            setToastIsError(false);
                          } else {
                            setToastMessage('Archive failed. Please try again.');
                            setToastIsError(true);
                          }
                        })()
                      }
                    >
                      <Archive size={14} /> Archive
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.35rem 0.55rem', fontSize: '0.75rem' }}
                      disabled={archiveBusyId === ext.id}
                      title="Return to active list"
                      onClick={() =>
                        void (async () => {
                          const ok = await callArchiveApi(ext.id, 'restore');
                          if (ok) {
                            setToastMessage(`Extinguisher "${ext.id}" restored.`);
                            setToastIsError(false);
                          } else {
                            setToastMessage('Restore failed. Please try again.');
                            setToastIsError(true);
                          }
                        })()
                      }
                    >
                      <RotateCcw size={14} /> Restore
                    </button>
                  )}
                </td>
                <td style={{ padding: '1rem', verticalAlign: 'middle' }}>
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
                </td>
              </tr>
            ))}
            {loading && (
              <tr>
                <td colSpan={16} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Loading extinguisher records...
                </td>
              </tr>
            )}
            {!loading && extinguishers.length === 0 && (
              <tr>
                <td colSpan={16} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
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
              <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>
                {editingExtinguisherId ? 'Edit extinguisher' : 'Register Extinguisher'}
              </h2>
              <button
                type="button"
                onClick={() => closeRegistrationModal()}
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
                {editingExtinguisherId ? (
                  <p
                    style={{
                      gridColumn: '1 / -1',
                      margin: '0 0 0.5rem',
                      fontSize: '0.82rem',
                      color: 'var(--text-secondary)',
                      lineHeight: 1.45,
                    }}
                  >
                    Only table columns are editable here: plant, make, type, media, capacity, location, UT and
                    manufacturing dates, and hydraulic due. Division / sub-division / zone / plant-office hierarchy is
                    unchanged; register a new extinguisher if you need to change that structure.
                  </p>
                ) : null}
                {!editingExtinguisherId ? (
                  <>
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
                            (p) => p.plantOffice.toLowerCase() === plantOffice.toLowerCase()
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
                  </>
                ) : null}
                <div className="form-group">
                  <label className="input-label">Unique Serial Number</label>
                  <input
                    type="text"
                    className="input-field"
                    value={formData.id}
                    onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                    required
                    placeholder="e.g. KCP01"
                    autoComplete="off"
                    readOnly={Boolean(editingExtinguisherId)}
                    style={editingExtinguisherId ? { background: 'var(--bg-main)', cursor: 'not-allowed' } : undefined}
                  />
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    {editingExtinguisherId
                      ? 'Unique serial cannot be changed here. To use a new ID, delete or archive this record and register a new one.'
                      : 'Must be unique — each serial can only be registered once (including archived records).'}
                  </p>
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
                        plant: selected?.plantOffice ?? '',
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
                        {plant.plantOffice} ({plant.companyCode}/{plant.plantCode})
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
                  <select
                    className="input-field"
                    value={formData.typeSelect}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        typeSelect: e.target.value,
                        typeOther: e.target.value === TYPE_OTHERS_VALUE ? formData.typeOther : '',
                      })
                    }
                    required
                  >
                    {BASE_TYPE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    {FIRE_CLASS_TYPE_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    {extraTypeOptions.map((v) => (
                      <option key={`extra-${v}`} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value={TYPE_OTHERS_VALUE}>Others</option>
                  </select>
                  {formData.typeSelect === TYPE_OTHERS_VALUE ? (
                    <div style={{ marginTop: '0.65rem', display: 'flex', gap: '0.5rem', alignItems: 'stretch', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="input-field"
                        style={{ flex: '1 1 160px', minWidth: 0 }}
                        value={formData.typeOther}
                        onChange={(e) => setFormData({ ...formData, typeOther: e.target.value })}
                        placeholder="Enter type, then Add — appears in list above"
                        required
                        aria-label="Custom type when Others is selected"
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void handleAddCustomType()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '0.5rem 0.9rem',
                          whiteSpace: 'nowrap',
                        }}
                        aria-label="Add type to dropdown list"
                      >
                        <Plus size={16} aria-hidden />
                        Add
                      </button>
                    </div>
                  ) : null}
                </div>
                <div className="form-group">
                  <label className="input-label">Media</label>
                  <select
                    className="input-field"
                    value={formData.mediaSelect}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        mediaSelect: e.target.value,
                        mediaOther: e.target.value === TYPE_OTHERS_VALUE ? formData.mediaOther : '',
                      })
                    }
                    required
                  >
                    {BASE_MEDIA_OPTIONS.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                    {extraMediaOptions.map((v) => (
                      <option key={`media-extra-${v}`} value={v}>
                        {v}
                      </option>
                    ))}
                    <option value={TYPE_OTHERS_VALUE}>Others</option>
                  </select>
                  {formData.mediaSelect === TYPE_OTHERS_VALUE ? (
                    <div
                      style={{
                        marginTop: '0.65rem',
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'stretch',
                        flexWrap: 'wrap',
                      }}
                    >
                      <input
                        type="text"
                        className="input-field"
                        style={{ flex: '1 1 160px', minWidth: 0 }}
                        value={formData.mediaOther}
                        onChange={(e) => setFormData({ ...formData, mediaOther: e.target.value })}
                        placeholder="Enter media, then Add — appears in list above"
                        required
                        aria-label="Custom media when Others is selected"
                      />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => void handleAddCustomMedia()}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                          padding: '0.5rem 0.9rem',
                          whiteSpace: 'nowrap',
                        }}
                        aria-label="Add media to dropdown list"
                      >
                        <Plus size={16} aria-hidden />
                        Add
                      </button>
                    </div>
                  ) : null}
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
                  <label className="input-label">Hydraulic test due</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.hydraulicDueDate}
                    onChange={(e) => setFormData({ ...formData, hydraulicDueDate: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="input-label">Manufacturing year</label>
                  <select
                    className="input-field"
                    value={formData.manufacturingDate ? formData.manufacturingDate.slice(0, 4) : ''}
                    onChange={(e) => {
                      const y = e.target.value;
                      setFormData({
                        ...formData,
                        manufacturingDate: y ? `${y}-01-01` : '',
                      });
                    }}
                    required
                  >
                    <option value="">Select year</option>
                    {manufacturingYearOptions.map((y) => (
                      <option key={y} value={String(y)}>
                        {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Last UT test date</label>
                  <input
                    type="date"
                    className="input-field"
                    value={formData.lastUtTestDate ? formData.lastUtTestDate.slice(0, 10) : ''}
                    onChange={(e) =>
                      setFormData({ ...formData, lastUtTestDate: e.target.value ? `${e.target.value}` : '' })
                    }
                    aria-label="Last UT test date"
                  />
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.35 }}>
                    If left blank on new equipment, the manufacturing year start date is used when you save. Edit to set
                    the exact UT test date.
                  </p>
                </div>
                <div className="form-group">
                  <label className="input-label">Hydraulic test due Date</label>
                  <input
                    type="text"
                    readOnly
                    className="input-field"
                    style={{ background: 'var(--bg-main)', cursor: 'default' }}
                    value={
                      nextHydraulicDueDatePreview
                        ? new Date(`${nextHydraulicDueDatePreview}T12:00:00Z`).toLocaleDateString('en-GB')
                        : '—'
                    }
                    aria-readonly
                  />
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Set automatically to 3 years after Hydraulic test due.
                  </p>
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ backgroundColor: 'var(--bg-main)' }}
                  onClick={() => closeRegistrationModal()}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-fire">
                  {editingExtinguisherId ? 'Save changes' : 'Save & Generate QR'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      <ExtinguisherQrViewModal
        ext={selectedQR}
        onClose={() => setSelectedQR(null)}
        onToast={(message, isError) => {
          setToastMessage(message);
          setToastIsError(isError);
        }}
        onInspectionSaved={handleQrInspectionSaved}
      />
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
      {toastMessage &&
        mounted &&
        createPortal(
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
