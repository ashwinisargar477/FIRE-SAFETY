'use client';

import React, { useState } from 'react';
import { Factory, Plus, MapPin, X } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PlantMasterPage() {
  const [plants, setPlants] = useState([
    { id: 1, name: 'Bhiwani Plant', location: 'Haryana', status: 'Active' },
    { id: 2, name: 'Chittorgarh Plant', location: 'Rajasthan', status: 'Active' },
    { id: 3, name: 'Jojobera Plant', location: 'Jharkhand', status: 'Active' }
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPlant, setNewPlant] = useState({ name: '', location: '' });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    setPlants([...plants, { id: Date.now(), name: newPlant.name, location: newPlant.location, status: 'Active' }]);
    setIsModalOpen(false);
    setNewPlant({ name: '', location: '' });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>Plant Master</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage all Nuvoco plant locations here.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Add Plant
        </button>
      </div>

      <div className="card" style={{ padding: '0' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Plant Code</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Plant Name</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>State / Location</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {plants.map((plant, index) => (
              <tr key={plant.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>PLT-{String(index + 1).padStart(3, '0')}</td>
                <td style={{ padding: '1rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Factory size={16} color="var(--color-primary)" /> {plant.name}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                    <MapPin size={14} color="var(--text-muted)"/> {plant.location}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: '#D1FAE5', color: '#065F46', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600 }}>
                    {plant.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem'
        }}>
          <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white' }}>
            <div className="flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--color-secondary)', color: 'white' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Add New Plant</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleAdd} style={{ padding: '1.5rem' }}>
              <div className="form-group">
                <label className="input-label">Plant Name</label>
                <input type="text" className="input-field" value={newPlant.name} onChange={e => setNewPlant({...newPlant, name: e.target.value})} required placeholder="e.g. Mejia Plant" />
              </div>
              <div className="form-group">
                <label className="input-label">State / Region</label>
                <input type="text" className="input-field" value={newPlant.location} onChange={e => setNewPlant({...newPlant, location: e.target.value})} required placeholder="e.g. West Bengal" />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>Save Plant</button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
