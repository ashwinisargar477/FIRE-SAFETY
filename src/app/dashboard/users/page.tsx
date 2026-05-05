'use client';

import React, { useState } from 'react';
import { Users, CheckCircle, X, Plus, Pencil, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { createPortal } from 'react-dom';

type User = {
  id: number;
  empId: string;
  username: string;
  email: string;
  role: string;
  assignedPlantCode: string;
  isLdapActive: boolean;
};

export default function UserMasterPage() {
  const pageSize = 5;
  const emptyUser = {
    empId: '',
    username: '',
    email: '',
    role: 'User',
    assignedPlantCode: '',
    isLdapActive: true,
  };
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<User | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [formData, setFormData] = useState(emptyUser);
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const paginatedUsers = users.slice(startIndex, startIndex + pageSize);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError('');
        const response = await fetch('/api/users', { cache: 'no-store' });
        if (!response.ok) throw new Error('Failed to fetch users');
        const data = (await response.json()) as User[];
        setUsers(data);
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
        setError('Could not load user data from database.');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  React.useEffect(() => {
    if (!mounted) return;
    if (isModalOpen || deleteConfirmUser) {
      document.body.classList.add('modal-open-users');
    } else {
      document.body.classList.remove('modal-open-users');
    }
    return () => {
      document.body.classList.remove('modal-open-users');
    };
  }, [isModalOpen, deleteConfirmUser, mounted]);

  React.useEffect(() => {
    if (!toastMessage) return;
    const timer = window.setTimeout(() => setToastMessage(''), 3500);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const openCreateModal = () => {
    setEditingUserId(null);
    setFormData(emptyUser);
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUserId(user.id);
    setFormData({
      empId: user.empId,
      username: user.username,
      email: user.email,
      role: user.role,
      assignedPlantCode: user.assignedPlantCode,
      isLdapActive: user.isLdapActive,
    });
    setIsModalOpen(true);
  };

  const normalizeUserDraft = (draft: typeof emptyUser) => ({
    empId: draft.empId.trim(),
    username: draft.username.trim(),
    email: draft.email.trim(),
    role: draft.role.trim(),
    assignedPlantCode: draft.assignedPlantCode.trim().toUpperCase(),
    isLdapActive: draft.isLdapActive,
  });

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError('');
      const isEdit = editingUserId !== null;
      if (isEdit) {
        const original = users.find((u) => u.id === editingUserId);
        if (original) {
          const originalNormalized = {
            empId: original.empId.trim(),
            username: original.username.trim(),
            email: original.email.trim(),
            role: original.role.trim(),
            assignedPlantCode: original.assignedPlantCode.trim().toUpperCase(),
            isLdapActive: original.isLdapActive,
          };
          const draftNormalized = normalizeUserDraft(formData);
          const changed =
            originalNormalized.empId !== draftNormalized.empId ||
            originalNormalized.username !== draftNormalized.username ||
            originalNormalized.email !== draftNormalized.email ||
            originalNormalized.role !== draftNormalized.role ||
            originalNormalized.assignedPlantCode !== draftNormalized.assignedPlantCode ||
            originalNormalized.isLdapActive !== draftNormalized.isLdapActive;
          if (!changed) {
            setIsModalOpen(false);
            setEditingUserId(null);
            setFormData(emptyUser);
            return;
          }
        }
      }
      const response = await fetch('/api/users', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editingUserId ?? undefined,
          ...formData,
        }),
      });

      if (!response.ok) {
        let message = 'Failed to save user';
        try {
          const payload = (await response.json()) as { message?: string };
          message = payload.message || message;
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const savedUser = (await response.json()) as User;
      if (isEdit) {
        setUsers((prev) => prev.map((u) => (u.id === savedUser.id ? savedUser : u)));
        setToastMessage(`User "${savedUser.username}" updated successfully.`);
      } else {
        setUsers((prev) => [...prev, savedUser]);
        setCurrentPage(Math.max(1, Math.ceil((users.length + 1) / pageSize)));
        setToastMessage(`User "${savedUser.username}" added successfully.`);
      }
      setIsModalOpen(false);
      setEditingUserId(null);
      setFormData(emptyUser);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not save user.');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteUser = async () => {
    const user = deleteConfirmUser;
    if (!user) return;
    try {
      setDeleteBusy(true);
      setError('');
      const response = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id }),
      });
      if (!response.ok) throw new Error('Failed to delete user');
      setUsers((prev) => prev.filter((u) => u.id !== user.id));
      setCurrentPage(1);
      setDeleteConfirmUser(null);
      setToastMessage(`User "${user.username}" deleted successfully.`);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Could not delete user.');
    } finally {
      setDeleteBusy(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex-between" style={{ marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', color: 'var(--color-secondary)', marginBottom: '0.5rem' }}>User Master</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage users and role mapping for notifications and ownership.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>
          <Plus size={18} /> Add User
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
        <div className="card user-table-scroll" style={{ padding: '0', overflowX: 'auto' }}>
          {error && (
            <div style={{ padding: '0.9rem 1rem', background: '#FEE2E2', color: '#991B1B', borderBottom: '1px solid #FCA5A5' }}>
              {error}
            </div>
          )}
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--bg-main)', borderBottom: '1px solid var(--border-color)' }}>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Emp ID</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>LDAP Username</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Email</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Role / Designation</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Plant Code</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>LDAP Status</th>
                <th style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    Loading users from database...
                  </td>
                </tr>
              )}
              {paginatedUsers.map((user) => (
                <motion.tr initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={user.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>{user.empId}</td>
                  <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--color-primary)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={16} /> {user.username}
                    </div>
                  </td>
                  <td style={{ padding: '1rem' }}>{user.email}</td>
                  <td style={{ padding: '1rem' }}>{user.role}</td>
                  <td style={{ padding: '1rem' }}>{user.assignedPlantCode || '—'}</td>
                  <td style={{ padding: '1rem' }}>
                    {user.isLdapActive && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#065F46', background: '#D1FAE5', padding: '0.25rem 0.5rem', borderRadius: '12px', width: 'fit-content', fontSize: '0.75rem', fontWeight: 600 }}>
                        <CheckCircle size={14} /> Synced
                      </span>
                    )}
                    {!user.isLdapActive && (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#9A3412', background: '#FFEDD5', padding: '0.25rem 0.5rem', borderRadius: '12px', width: 'fit-content', fontSize: '0.75rem', fontWeight: 600 }}>
                        Inactive
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'inline-flex', gap: 8 }}>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem' }}
                        onClick={() => openEditModal(user)}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-outline"
                        style={{ padding: '0.28rem 0.5rem', fontSize: '0.75rem', color: '#B91C1C', borderColor: 'rgba(230,57,70,0.35)' }}
                        onClick={() => setDeleteConfirmUser(user)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {!loading && users.length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
          Showing {users.length === 0 ? 0 : startIndex + 1}-
          {Math.min(startIndex + pageSize, users.length)} of {users.length}
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
        <div className="user-modal-shell" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(11,27,43,0.58)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem',
          backdropFilter: 'blur(6px)'
        }}>
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="card user-modal-card" style={{ width: '100%', maxWidth: '460px', maxHeight: '90vh', backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid rgba(0,122,83,0.18)', boxShadow: '0 24px 60px rgba(11,27,43,0.26)', display: 'flex', flexDirection: 'column' }}>
            <div className="flex-between user-modal-header" style={{ padding: '0.95rem 1rem', borderBottom: '1px solid rgba(255,255,255,0.2)', background: 'linear-gradient(135deg, var(--color-secondary), var(--color-primary))', color: 'white' }}>
              <h2 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>{editingUserId ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => { setIsModalOpen(false); setEditingUserId(null); setFormData(emptyUser); }} className="user-modal-close" style={{ background: 'rgba(255,255,255,0.16)', border: '1px solid rgba(255,255,255,0.34)', color: 'white', cursor: 'pointer', width: 30, height: 30, borderRadius: 999, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><X size={16} /></button>
            </div>
            <form onSubmit={handleSaveUser} style={{ padding: '1rem', overflowY: 'auto' }}>
              <div className="form-group">
                <label className="input-label">Emp ID</label>
                <input type="text" className="input-field" value={formData.empId} onChange={(e) => setFormData({ ...formData, empId: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="input-label">LDAP Username</label>
                <input type="text" className="input-field" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="input-label">Email</label>
                <input type="email" className="input-field" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="input-label">Role / Designation</label>
                <input type="text" className="input-field" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} required />
              </div>
              <div className="form-group">
                <label className="input-label">Assigned Plant Code</label>
                <input type="text" className="input-field" value={formData.assignedPlantCode} onChange={(e) => setFormData({ ...formData, assignedPlantCode: e.target.value })} placeholder="e.g. BHI" />
              </div>
              <div className="form-group">
                <label className="input-label" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={formData.isLdapActive} onChange={(e) => setFormData({ ...formData, isLdapActive: e.target.checked })} />
                  LDAP Active
                </label>
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} disabled={saving}>
                {saving ? 'Saving...' : editingUserId ? 'Update User' : 'Save User'}
              </button>
            </form>
          </motion.div>
        </div>,
        document.body
      )}
      {deleteConfirmUser && mounted && createPortal(
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="user-delete-title"
          onClick={() => {
            if (!deleteBusy) setDeleteConfirmUser(null);
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
              <h2 id="user-delete-title" style={{ fontSize: '1rem', margin: 0, fontWeight: 700, color: 'var(--color-secondary)' }}>
                Delete user
              </h2>
              <p style={{ margin: '0.65rem 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                Do you want to delete this user?
              </p>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                {deleteConfirmUser.username}
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
              <button type="button" className="btn btn-outline" disabled={deleteBusy} onClick={() => setDeleteConfirmUser(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={deleteBusy}
                style={{ background: '#B91C1C', borderColor: '#B91C1C' }}
                onClick={() => void confirmDeleteUser()}
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
        .modal-open-users aside { display: none !important; }
        .modal-open-users .main-content { margin-left: 0 !important; width: 100vw !important; }
        .modal-open-users { overflow: hidden; }
        .user-table-scroll {
          scrollbar-width: auto;
        }
        .user-modal-close { transition: transform 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease; }
        .user-modal-close:hover { transform: scale(1.05); background: rgba(255,255,255,0.28) !important; box-shadow: 0 6px 14px rgba(11,27,43,0.25); }
      `}</style>
    </div>
  );
}
