'use client';

import React, { useMemo, useState } from 'react';
import { Factory, Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { locationHierarchy } from '@/data/locationHierarchy';

type Plant = {
  id: number;
  division: string;
  subDivision: string;
  zone: string;
  plantOffice: string;
  companyCode: string;
  plantCode: string;
  plantSName: string;
  showStatus: string;
  region: string;
  plant_unit: string;
  company_name: string;
};

export default function PlantMasterPage() {
  const pageSize = 5;
  const emptyPlant = {
    division: '',
    subDivision: '',
    zone: '',
    plantOffice: '',
    companyCode: '',
    plantCode: '',
    plantSName: '',
    showStatus: 'Active',
    region: '',
    plant_unit: '',
    company_name: '',
  };
  const [plants, setPlants] = useState<Plant[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlantId, setEditingPlantId] = useState<number | null>(null);
  const [newPlant, setNewPlant] = useState(emptyPlant);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [mounted, setMounted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [deleteConfirmPlant, setDeleteConfirmPlant] = useState<Plant | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const divisionOptions = useMemo(
    () => Array.from(new Set(locationHierarchy.map((item) => item.division))),
    []
  );
  const subDivisionOptions = useMemo(
    () =>
      Array.from(
        new Set(
          locationHierarchy
            .filter((item) => item.division === newPlant.division)
            .map((item) => item.subDivision)
        )
      ),
    [newPlant.division]
  );
  const zoneOptions = useMemo(
    () =>
      Array.from(
        new Set(
          locationHierarchy
            .filter(
              (item) =>
                item.division === newPlant.division &&
                item.subDivision === newPlant.subDivision
            )
            .map((item) => item.zone)
        )
      ),
    [newPlant.division, newPlant.subDivision]
  );
  const plantOfficeOptions = useMemo(
    () =>
      locationHierarchy
        .filter(
          (item) =>
            item.division === newPlant.division &&
            item.subDivision === newPlant.subDivision &&
            item.zone === newPlant.zone
        )
        .map((item) => item.plantOffice),
    [newPlant.division, newPlant.subDivision, newPlant.zone]
  );

  const totalPages = Math.max(1, Math.ceil(plants.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedPlants = plants.slice(startIndex, startIndex + pageSize);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    if (isModalOpen || deleteConfirmPlant) {
      document.body.classList.add('modal-open-plants');
    } else {
      document.body.classList.remove('modal-open-plants');
    }
    return () => {
      document.body.classList.remove('modal-open-plants');
    };
  }, [isModalOpen, deleteConfirmPlant, mounted]);

  React.useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  React.useEffect(() => {
    const loadPlants = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/plants', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error('Failed to fetch plants');
        }
        const data = (await response.json()) as Plant[];
        setPlants(data);
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
        setError('Could not load plant data from database.');
      } finally {
        setLoading(false);
      }
    };

    loadPlants();
  }, []);

  const handleAddOrEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const isEdit = editingPlantId !== null;
      if (isEdit) {
        const original = plants.find((p) => p.id === editingPlantId);
        if (original) {
          const originalNormalized = {
            division: original.division.trim(),
            subDivision: original.subDivision.trim(),
            zone: original.zone.trim(),
            plantOffice: original.plantOffice.trim(),
            companyCode: original.companyCode.trim(),
            plantCode: original.plantCode.trim(),
            plantSName: original.plantSName.trim(),
            showStatus: original.showStatus.trim(),
            region: original.region.trim(),
            plant_unit: original.plant_unit.trim(),
            company_name: original.company_name.trim(),
          };
          const draftNormalized = {
            division: newPlant.division.trim(),
            subDivision: newPlant.subDivision.trim(),
            zone: newPlant.zone.trim(),
            plantOffice: newPlant.plantOffice.trim(),
            companyCode: newPlant.companyCode.trim(),
            plantCode: newPlant.plantCode.trim(),
            plantSName: newPlant.plantSName.trim(),
            showStatus: newPlant.showStatus.trim(),
            region: newPlant.region.trim(),
            plant_unit: newPlant.plant_unit.trim(),
            company_name: newPlant.company_name.trim(),
          };
          const changed =
            originalNormalized.division !== draftNormalized.division ||
            originalNormalized.subDivision !== draftNormalized.subDivision ||
            originalNormalized.zone !== draftNormalized.zone ||
            originalNormalized.plantOffice !== draftNormalized.plantOffice ||
            originalNormalized.companyCode !== draftNormalized.companyCode ||
            originalNormalized.plantCode !== draftNormalized.plantCode ||
            originalNormalized.plantSName !== draftNormalized.plantSName ||
            originalNormalized.showStatus !== draftNormalized.showStatus ||
            originalNormalized.region !== draftNormalized.region ||
            originalNormalized.plant_unit !== draftNormalized.plant_unit ||
            originalNormalized.company_name !== draftNormalized.company_name;
          if (!changed) {
            setIsModalOpen(false);
            setEditingPlantId(null);
            setNewPlant(emptyPlant);
            return;
          }
        }
      }
      const response = await fetch('/api/plants', {
        method: isEdit ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: editingPlantId ?? undefined,
          division: newPlant.division,
          subDivision: newPlant.subDivision,
          zone: newPlant.zone,
          plantOffice: newPlant.plantOffice,
          companyCode: newPlant.companyCode,
          plantCode: newPlant.plantCode,
          plantSName: newPlant.plantSName,
          showStatus: newPlant.showStatus,
          region: newPlant.region,
          plant_unit: newPlant.plant_unit,
          company_name: newPlant.company_name,
        }),
      });

      if (!response.ok) {
        let message = 'Failed to save plant';
        try {
          const payload = (await response.json()) as { message?: string; detail?: string };
          message = [payload.message, payload.detail].filter(Boolean).join(' — ') || message;
        } catch {
          // Keep fallback message.
        }
        throw new Error(message);
      }

      const savedPlant = (await response.json()) as Plant;
      if (isEdit) {
        setPlants((prev) => prev.map((p) => (p.id === savedPlant.id ? savedPlant : p)));
        setToastMessage(`Plant "${savedPlant.plantSName}" updated successfully.`);
      } else {
        setPlants((prev) => [...prev, savedPlant]);
        setCurrentPage(Math.max(1, Math.ceil((plants.length + 1) / pageSize)));
        setToastMessage(`Plant "${savedPlant.plantSName}" added successfully.`);
      }
      setIsModalOpen(false);
      setEditingPlantId(null);
      setNewPlant(emptyPlant);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not save plant to database.');
    } finally {
      setSaving(false);
    }
  };

  const openCreateModal = () => {
    setEditingPlantId(null);
    setNewPlant(emptyPlant);
    setIsModalOpen(true);
  };

  const openEditModal = (plant: Plant) => {
    setEditingPlantId(plant.id);
    setNewPlant({
      division: plant.division || '',
      subDivision: plant.subDivision || '',
      zone: plant.zone || '',
      plantOffice: plant.plantOffice || '',
      companyCode: plant.companyCode || '',
      plantCode: plant.plantCode || '',
      plantSName: plant.plantSName || '',
      showStatus: plant.showStatus || 'Active',
      region: plant.region || '',
      plant_unit: plant.plant_unit || '',
      company_name: plant.company_name || '',
    });
    setIsModalOpen(true);
  };

  const confirmDeletePlant = async () => {
    const plant = deleteConfirmPlant;
    if (!plant) return;
    try {
      setDeleteBusy(true);
      setError('');
      const response = await fetch('/api/plants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: plant.id }),
      });
      if (!response.ok) {
        const payload = (await response.json()) as { message?: string; detail?: string };
        throw new Error([payload.message, payload.detail].filter(Boolean).join(' — ') || 'Failed to delete plant');
      }
      setPlants((prev) => prev.filter((p) => p.id !== plant.id));
      setCurrentPage(1);
      setDeleteConfirmPlant(null);
      setToastMessage(`Plant "${plant.plantSName}" deleted successfully.`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not delete plant.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>Plant Master</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage all Nuvoco plant locations here.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Add Plant
        </button>
      </div>

      <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
        {error && (
          <div style={{ padding: '0.9rem 1rem', background: '#FEE2E2', color: '#991B1B', borderBottom: '1px solid #FCA5A5' }}>
            {error}
          </div>
        )}
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>ID</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Division</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Sub Division</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Zone</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Plant/Office</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Company Code</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Plant Code</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Plant Short Name</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Status</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Region</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Plant Unit</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Company Name</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)', position: 'sticky', top: 0, zIndex: 2, backgroundColor: 'var(--bg-main)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={13} style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)' }}>
                  Loading plants from database...
                </td>
              </tr>
            )}
            {paginatedPlants.map((plant) => (
              <tr key={plant.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{plant.id}</td>
                <td style={{ padding: '1rem' }}>{plant.division || '—'}</td>
                <td style={{ padding: '1rem' }}>{plant.subDivision || '—'}</td>
                <td style={{ padding: '1rem' }}>{plant.zone || '—'}</td>
                <td style={{ padding: '1rem' }}>{plant.plantOffice || '—'}</td>
                <td style={{ padding: '1rem' }}>{plant.companyCode}</td>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{plant.plantCode}</td>
                <td style={{ padding: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Factory size={16} color="var(--color-primary)" /> {plant.plantSName}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: '#D1FAE5', color: '#065F46', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {plant.showStatus}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>{plant.region}</td>
                <td style={{ padding: '1rem' }}>{plant.plant_unit}</td>
                <td style={{ padding: '1rem' }}>{plant.company_name}</td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'inline-flex', gap: 8 }}>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem' }}
                      onClick={() => openEditModal(plant)}
                    >
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem', color: '#B91C1C', borderColor: 'rgba(230,57,70,0.35)' }}
                      onClick={() => setDeleteConfirmPlant(plant)}
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && plants.length === 0 && (
              <tr>
                <td colSpan={13} style={{ padding: '1.2rem 1rem', color: 'var(--text-secondary)' }}>
                  No plants found in database.
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
          Showing {plants.length === 0 ? 0 : startIndex + 1}-
          {Math.min(startIndex + pageSize, plants.length)} of {plants.length}
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

      {isModalOpen && mounted && createPortal(
        <div className="plant-modal-shell" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(11,27,43,0.58)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(6px)'
        }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card plant-modal-card" style={{ width: '100%', maxWidth: '460px', maxHeight: '90vh', backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,122,83,0.18)', boxShadow: '0 24px 60px rgba(11,27,43,0.26)', display: 'flex', flexDirection: 'column' }}>
            <div className="flex-between plant-modal-header" style={{ padding: '0.95rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))', color: 'white' }}>
              <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>{editingPlantId ? 'Edit Plant' : 'Add New Plant'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingPlantId(null); setNewPlant(emptyPlant); }} className="plant-modal-close" style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.34)', color: 'white', cursor: 'pointer', width: 30, height: 30, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleAddOrEdit} style={{ padding: '1rem', overflowY: 'auto' }}>
              <div className="form-group">
                <label className="input-label">Division</label>
                <select
                  className="input-field"
                  value={newPlant.division}
                  onChange={(e) =>
                    setNewPlant({
                      ...newPlant,
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
                  value={newPlant.subDivision}
                  onChange={(e) =>
                    setNewPlant({
                      ...newPlant,
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
                  value={newPlant.zone}
                  onChange={(e) =>
                    setNewPlant({
                      ...newPlant,
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
                  value={newPlant.plantOffice}
                  onChange={(e) => {
                    const plantOffice = e.target.value;
                    setNewPlant({
                      ...newPlant,
                      plantOffice,
                      plantSName: plantOffice || newPlant.plantSName,
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
                <label className="input-label">Company Code</label>
                <input
                  type="text"
                  className="input-field"
                  value={newPlant.companyCode}
                  onChange={(e) => setNewPlant({ ...newPlant, companyCode: e.target.value })}
                  required
                  inputMode="numeric"
                  placeholder="e.g. 100"
                />
              </div>
              <div className="form-group">
                <label className="input-label">Plant Code</label>
                <input
                  type="text"
                  className="input-field"
                  value={newPlant.plantCode}
                  onChange={(e) => setNewPlant({ ...newPlant, plantCode: e.target.value })}
                  required
                  inputMode="numeric"
                  placeholder="e.g. 9107"
                />
              </div>
              <div className="form-group">
                <label className="input-label">Plant Short Name</label>
                <input type="text" className="input-field" value={newPlant.plantSName} onChange={e => setNewPlant({...newPlant, plantSName: e.target.value})} required placeholder="e.g. Kutch Cement Plant" maxLength={255} />
              </div>
              <div className="form-group">
                <label className="input-label">Status</label>
                <input type="text" className="input-field" value={newPlant.showStatus} onChange={e => setNewPlant({...newPlant, showStatus: e.target.value})} placeholder="e.g. Active" />
              </div>
              <div className="form-group">
                <label className="input-label">Region</label>
                <input type="text" className="input-field" value={newPlant.region} onChange={e => setNewPlant({...newPlant, region: e.target.value})} placeholder="e.g. West" />
              </div>
              <div className="form-group">
                <label className="input-label">Plant Unit</label>
                <input type="text" className="input-field" value={newPlant.plant_unit} onChange={e => setNewPlant({...newPlant, plant_unit: e.target.value})} placeholder="e.g. Unit 1" />
              </div>
              <div className="form-group">
                <label className="input-label">Company Name</label>
                <input type="text" className="input-field" value={newPlant.company_name} onChange={e => setNewPlant({...newPlant, company_name: e.target.value})} placeholder="e.g. Nuvoco Vistas Corp. Ltd." />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={saving}>
                {saving ? 'Saving...' : editingPlantId ? 'Update Plant' : 'Save Plant'}
              </button>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
      {deleteConfirmPlant && mounted && createPortal(
        <div
          className="plant-delete-confirm-shell"
          role="dialog"
          aria-modal="true"
          aria-labelledby="plant-delete-title"
          onClick={() => {
            if (!deleteBusy) setDeleteConfirmPlant(null);
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
            <div
              style={{
                padding: '1rem 1rem 0.75rem',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <h2 id="plant-delete-title" style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: 'var(--color-secondary)' }}>
                Delete plant
              </h2>
              <p style={{ margin: '0.65rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Do you want to delete this plant?
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {deleteConfirmPlant.plantSName}
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
                disabled={deleteBusy}
                onClick={() => setDeleteConfirmPlant(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={deleteBusy}
                style={{ background: '#B91C1C', borderColor: '#B91C1C' }}
                onClick={() => void confirmDeletePlant()}
              >
                {deleteBusy ? 'Deleting…' : 'OK'}
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
        .modal-open-plants aside { display: none !important; }
        .modal-open-plants .main-content { margin-left: 0 !important; width: 100vw !important; }
        .modal-open-plants { overflow: hidden; }
        .card::-webkit-scrollbar { height: 10px; }
        .card::-webkit-scrollbar-track { background: #eef2f7; border-radius: 999px; }
        .card::-webkit-scrollbar-thumb { background: #9ca3af; border-radius: 999px; }
        .card::-webkit-scrollbar-thumb:hover { background: #6b7280; }
        .plant-modal-close { transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease; }
        .plant-modal-close:hover { transform: scale(1.05); background: rgba(255,255,255,0.28) !important; box-shadow: 0 6px 14px rgba(11,27,43,0.25); }
        @media (max-width: 767px) {
          .plant-modal-shell { padding: 0.75rem !important; }
          .plant-modal-card { max-width: 100% !important; border-radius: 14px !important; }
          .plant-modal-header h2 { font-size: 0.95rem !important; }
        }
      `}</style>
    </div>
  );
}
