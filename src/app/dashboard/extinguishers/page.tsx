'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, QrCode as QRIcon, User, Calendar, MapPin, Hash, X } from 'lucide-react';
import QRCode from 'react-qr-code';
import { createPortal } from 'react-dom';

// Mock Data structure
interface Extinguisher {
  id: string; // System generated incremental call no
  plant: string;
  floor: string;
  subLocation: string;
  type: string;
  capacity: string;
  installedBy: string;
  installedDate: string;
  direction: string;
}

export default function ExtinguishersPage() {
  const [extinguishers, setExtinguishers] = useState<Extinguisher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedQR, setSelectedQR] = useState<Extinguisher | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Form State
  const [formData, setFormData] = useState({
    plant: 'Bhiwani Plant',
    floor: '',
    subLocation: '',
    direction: 'Front Side',
    type: 'CO2',
    capacity: '4.5 kg'
  });

  useEffect(() => {
    // Initial mock data
    setExtinguishers([
      {
        id: 'NUV-FE-001',
        plant: 'Bhiwani Plant',
        floor: 'Ground Floor',
        subLocation: 'Main Reception Area',
        type: 'CO2',
        capacity: '4.5 kg',
        direction: 'Front Side',
        installedBy: 'nuvoco\\admin',
        installedDate: new Date().toISOString()
      }
    ]);
  }, []);

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-generate incremental ID
    const newId = `NUV-FE-${String(extinguishers.length + 1).padStart(3, '0')}`;
    
    const newExtinguisher: Extinguisher = {
      id: newId,
      ...formData,
      installedBy: 'nuvoco\\admin', // Mock LDAP user from session
      installedDate: new Date().toISOString()
    };

    setExtinguishers([newExtinguisher, ...extinguishers]);
    setIsModalOpen(false);
    setFormData({ ...formData, floor: '', subLocation: '', direction: 'Front Side' });
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>
            Extinguisher Management
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            Register new equipment and generate QR codes
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={18} /> Register New
        </button>
      </div>

      <div className="card" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Call No.</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Plant & Location</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Type</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Installed By</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Date</th>
              <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {extinguishers.map((ext) => (
              <tr key={ext.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>{ext.id}</td>
                <td style={{ padding: '1rem' }}>
                  <div>{ext.plant}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    {ext.floor} • {ext.direction} • {ext.subLocation}
                  </div>
                </td>
                <td style={{ padding: '1rem' }}>{ext.type} ({ext.capacity})</td>
                <td style={{ padding: '1rem' }}>{ext.installedBy}</td>
                <td style={{ padding: '1rem' }}>{new Date(ext.installedDate).toLocaleDateString()}</td>
                <td style={{ padding: '1rem' }}>
                  <button 
                    className="btn btn-outline" 
                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                    onClick={() => setSelectedQR(ext)}
                  >
                    <QRIcon size={16} /> View QR
                  </button>
                </td>
              </tr>
            ))}
            {extinguishers.length === 0 && (
              <tr>
                <td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                  No extinguishers registered yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Registration Modal */}
      {isModalOpen && mounted && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="card" style={{ width: '100%', maxWidth: '600px', backgroundColor: 'white' }}
          >
            <div className="flex-between" style={{ padding: '1.5rem', borderBottom: '1px solid var(--border-color)', backgroundColor: 'var(--color-primary)', color: 'white' }}>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Register Extinguisher</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            
            <form onSubmit={handleRegister} style={{ padding: '1.5rem' }}>
              <div className="form-grid">
                <div className="form-group">
                  <label className="input-label">Plant Master</label>
                  <select className="input-field" value={formData.plant} onChange={e => setFormData({...formData, plant: e.target.value})}>
                    <option value="Bhiwani Plant">Bhiwani Plant</option>
                    <option value="Chittorgarh Plant">Chittorgarh Plant</option>
                    <option value="Jojobera Plant">Jojobera Plant</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Extinguisher Type</label>
                  <select className="input-field" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}>
                    <option value="CO2">CO2</option>
                    <option value="DCP">DCP</option>
                    <option value="Water">Water</option>
                    <option value="Foam">Foam</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="input-label">Capacity</label>
                  <input type="text" className="input-field" value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} required placeholder="e.g. 4.5kg" />
                </div>
                <div className="form-group">
                  <label className="input-label">Floor</label>
                  <input type="text" className="input-field" value={formData.floor} onChange={e => setFormData({...formData, floor: e.target.value})} required placeholder="e.g. Ground Floor" />
                </div>
                <div className="form-group">
                  <label className="input-label">Direction / Side</label>
                  <select className="input-field" value={formData.direction} onChange={e => setFormData({...formData, direction: e.target.value})}>
                    <option value="Front Side">Front Side</option>
                    <option value="Back Side">Back Side</option>
                    <option value="Left Side">Left Side</option>
                    <option value="Right Side">Right Side</option>
                    <option value="Center">Center</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="input-label">Specific Sub-Location</label>
                  <input type="text" className="input-field" value={formData.subLocation} onChange={e => setFormData({...formData, subLocation: e.target.value})} required placeholder="e.g. Near Server Room" />
                </div>
              </div>

              <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--bg-main)' }} onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save & Generate QR</button>
              </div>
            </form>
          </motion.div>
        </div>,
        document.body
      )}

      {/* QR Code Modal */}
      {selectedQR && mounted && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(4px)'
        }}>
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            className="card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'white', overflow: 'hidden' }}
          >
            <div style={{ background: 'var(--color-secondary)', color: 'white', padding: '1.5rem', textAlign: 'center', position: 'relative' }}>
              <button 
                onClick={() => setSelectedQR(null)} 
                style={{ position: 'absolute', right: '1rem', top: '1rem', background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
              <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Equipment QR Label</h2>
              <p style={{ opacity: 0.8, fontSize: '0.875rem', marginTop: '0.25rem' }}>Scan to view details</p>
            </div>
            
            <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.5rem' }}>
              <div style={{ padding: '1rem', background: 'white', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-md)', border: '1px solid var(--border-color)' }}>
                {/* Real-world usage: This URL would point to the deployed /scan/[id] route */}
                <QRCode 
                  value={`${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/scan/${selectedQR.id}?data=${encodeURIComponent(JSON.stringify(selectedQR))}`} 
                  size={200} 
                  level="M"
                  fgColor="var(--text-primary)"
                />
              </div>
              
              <div style={{ width: '100%', borderTop: '1px dashed var(--border-color)', paddingTop: '1.5rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.875rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Call No</span>
                    <strong style={{ color: 'var(--color-primary)' }}>{selectedQR.id}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Type</span>
                    <strong>{selectedQR.type} {selectedQR.capacity}</strong>
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <span style={{ color: 'var(--text-secondary)', display: 'block', fontSize: '0.75rem' }}>Exact Location</span>
                    <strong>{selectedQR.plant} / {selectedQR.floor} ({selectedQR.direction})</strong>
                  </div>
                </div>
              </div>
              
              <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => window.print()}>
                Print Label
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </div>
  );
}
