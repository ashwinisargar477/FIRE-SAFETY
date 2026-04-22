'use client';

import React from 'react';
import { Users, Shield, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UserMasterPage() {
  const users = [
    { id: '1001', username: 'nuvoco\\admin', role: 'System Administrator', isLdapActive: true },
    { id: '1002', username: 'nuvoco\\safety_mgr', role: 'Safety Manager', isLdapActive: true },
    { id: '1003', username: 'nuvoco\\plant_head_bhiwani', role: 'Plant Head (Bhiwani)', isLdapActive: true }
  ];

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>User Master</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Synced from Nuvoco Active Directory (LDAP).</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        {/* <div className="card glass-dark" style={{ padding: '1.5rem', display: 'flex', alignItems: 'center', gap: '1.5rem', borderLeft: '4px solid var(--color-accent)' }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Shield size={24} color="white" />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'white' }}>LDAP Sync Active</h3>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.875rem' }}>Users cannot be added manually here. They are synced directly from Active Directory.</p>
          </div>
        </div> */}

        <div className="card" style={{ padding: '0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Emp ID</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>LDAP Username</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Role / Designation</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>LDAP Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{user.id}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={16} /> {user.username}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>{user.role}</td>
                  <td style={{ padding: '1rem' }}>
                    {user.isLdapActive && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#065F46', background: '#D1FAE5', padding: '0.25rem 0.5rem', borderRadius: '12px', width: 'fit-content', fontSize: '0.75rem', fontWeight: 600 }}>
                        <CheckCircle size={14} /> Synced
                      </span>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
