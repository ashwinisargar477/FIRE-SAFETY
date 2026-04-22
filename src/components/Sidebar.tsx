'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Factory,
  Flame,
  LogOut,
  Menu,
  X,
  QrCode,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', href: '/dashboard' },
  { icon: Flame, label: 'Extinguishers', href: '/dashboard/extinguishers' },
  { icon: Factory, label: 'Plants', href: '/dashboard/plants' },
  { icon: Users, label: 'Users', href: '/dashboard/users' },
];

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);
  const pathname = usePathname();

  useEffect(() => {
    const checkWidth = () => setIsDesktop(window.innerWidth >= 768);
    checkWidth();
    window.addEventListener('resize', checkWidth);
    return () => window.removeEventListener('resize', checkWidth);
  }, []);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const toggleSidebar = () => setIsOpen((o) => !o);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="sidebar-toggle"
        aria-label="Open menu"
        style={{
          position: 'fixed',
          top: '0.85rem',
          left: '0.85rem',
          zIndex: 60,
          background: 'var(--gradient-fire)',
          color: 'white',
          border: 'none',
          borderRadius: 12,
          width: 42,
          height: 42,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-fire)',
        }}
      >
        <Menu size={18} />
      </button>

      {/* Mobile backdrop */}
      <AnimatePresence>
        {isOpen && !isDesktop && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={toggleSidebar}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(11,27,43,0.55)',
              backdropFilter: 'blur(4px)',
              zIndex: 45,
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(isOpen || isDesktop) && (
          <motion.aside
            initial={{ x: -240 }}
            animate={{ x: 0 }}
            exit={{ x: -240 }}
            transition={{ type: 'spring', stiffness: 280, damping: 30 }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              height: '100vh',
              width: 232,
              zIndex: 50,
              display: 'flex',
              flexDirection: 'column',
              background: 'var(--gradient-dark)',
              color: 'white',
              borderRight: '1px solid rgba(255,255,255,0.06)',
              boxShadow: '0 0 40px rgba(0,0,0,0.25)',
              overflow: 'hidden',
            }}
          >
            {/* Decorative glow */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                top: -90,
                right: -70,
                width: 220,
                height: 220,
                background:
                  'radial-gradient(circle, rgba(255,107,53,0.35) 0%, rgba(255,107,53,0) 70%)',
                filter: 'blur(10px)',
                pointerEvents: 'none',
              }}
            />
            <div
              aria-hidden
              style={{
                position: 'absolute',
                bottom: -80,
                left: -60,
                width: 200,
                height: 200,
                background:
                  'radial-gradient(circle, rgba(0,122,83,0.35) 0%, rgba(0,122,83,0) 70%)',
                filter: 'blur(10px)',
                pointerEvents: 'none',
              }}
            />

            {/* Brand */}
            <div
              style={{
                padding: '1.1rem 1rem 1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Link
                href="/dashboard"
                style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 11,
                    background: 'var(--gradient-fire)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: 'var(--shadow-fire)',
                    flexShrink: 0,
                  }}
                >
                  <Flame size={20} color="white" className="animate-flicker" />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: '0.98rem',
                      letterSpacing: '-0.01em',
                      lineHeight: 1.1,
                    }}
                  >
                    Nuvoco
                  </div>
                  <div style={{ fontSize: '0.65rem', opacity: 0.65, letterSpacing: '0.02em' }}>
                    FIRE SAFETY
                  </div>
                </div>
              </Link>
              <button
                onClick={toggleSidebar}
                className="sidebar-close"
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  color: 'white',
                  cursor: 'pointer',
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
                aria-label="Close menu"
              >
                <X size={14} />
              </button>
            </div>

            {/* Navigation */}
            <nav
              style={{
                flex: 1,
                padding: '0.9rem 0.7rem',
                overflowY: 'auto',
                position: 'relative',
                zIndex: 1,
              }}
              className="no-scrollbar"
            >
              <div
                style={{
                  fontSize: '0.62rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.12em',
                  opacity: 0.5,
                  padding: '0 0.6rem 0.55rem',
                  fontWeight: 600,
                }}
              >
                Menu
              </div>
              <ul
                style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2,
                }}
              >
                {menuItems.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    (item.href !== '/dashboard' && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 11,
                          padding: '0.6rem 0.7rem',
                          borderRadius: 10,
                          color: isActive ? 'white' : 'rgba(255,255,255,0.72)',
                          background: isActive
                            ? 'linear-gradient(90deg, rgba(255,107,53,0.22), rgba(0,122,83,0.12))'
                            : 'transparent',
                          border: isActive
                            ? '1px solid rgba(255,107,53,0.3)'
                            : '1px solid transparent',
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '0.85rem',
                          transition: 'all 0.2s ease',
                          position: 'relative',
                        }}
                      >
                        {isActive && (
                          <span
                            style={{
                              position: 'absolute',
                              left: -8,
                              top: 8,
                              bottom: 8,
                              width: 3,
                              borderRadius: 3,
                              background: 'var(--gradient-fire)',
                              boxShadow: '0 0 8px rgba(255,107,53,0.7)',
                            }}
                          />
                        )}
                        <item.icon size={17} strokeWidth={isActive ? 2.2 : 1.8} />
                        <span style={{ flex: 1 }}>{item.label}</span>
                        {isActive && <ChevronRight size={14} style={{ opacity: 0.7 }} />}
                      </Link>
                    </li>
                  );
                })}
              </ul>

              {/* Shortcut action */}
              <div style={{ marginTop: '1.2rem', padding: '0 0.2rem' }}>
                <Link
                  href="/dashboard/extinguishers"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '0.7rem 0.8rem',
                    borderRadius: 12,
                    background:
                      'linear-gradient(135deg, rgba(255,107,53,0.18), rgba(230,57,70,0.12))',
                    border: '1px solid rgba(255,107,53,0.35)',
                    fontSize: '0.8rem',
                    color: 'white',
                    fontWeight: 600,
                  }}
                >
                  <QrCode size={16} />
                  <span style={{ flex: 1 }}>Generate QR</span>
                  <ChevronRight size={14} style={{ opacity: 0.7 }} />
                </Link>
              </div>
            </nav>

            {/* Footer — logout only */}
            <div
              style={{
                padding: '0.75rem 0.8rem 1rem',
                borderTop: '1px solid rgba(255,255,255,0.08)',
                position: 'relative',
                zIndex: 1,
              }}
            >
              <Link
                href="/"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '0.55rem 0.75rem',
                  borderRadius: 10,
                  color: '#FCA5A5',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.2)',
                  transition: 'all 0.2s ease',
                }}
              >
                <LogOut size={15} /> Sign out
              </Link>
              <div
                style={{
                  fontSize: '0.62rem',
                  color: 'rgba(255,255,255,0.4)',
                  textAlign: 'center',
                  marginTop: '0.75rem',
                  letterSpacing: '0.04em',
                }}
              >
                v1.0 · Nuvoco © {new Date().getFullYear()}
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      <style>{`
        @media (min-width: 768px) {
          .sidebar-toggle { display: none !important; }
          .sidebar-close { display: none !important; }
        }
      `}</style>
    </>
  );
}
