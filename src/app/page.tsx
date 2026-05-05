'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Shield,
  User,
  Lock,
  ArrowRight,
  Flame,
  CheckCircle2,
  QrCode,
  MapPin,
  Eye,
  EyeOff,
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('ashwinisargar18');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await new Promise((r) => setTimeout(r, 1200));
      const normalized = username.trim().toLowerCase();
      const allowedUsers = [
        'ashwinisargar18',
        'ashwini sargar',
        'ashwini.sargar',
        'nuvoco\\ashwini.sargar',
      ];
      if (allowedUsers.includes(normalized) && password === 'nuvoco123') {
        window.localStorage.setItem(
          'nuvoco-current-user',
          JSON.stringify({
            username: 'ashwinisargar18',
            displayName: 'Ashwini Sargar',
          })
        );
        router.push('/dashboard');
      } else {
        setError('Invalid credentials. Use ashwinisargar18 (or legacy Ashwini ID) and password nuvoco123.');
      }
    } catch {
      setError('LDAP connection failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: QrCode, title: 'Scan & Verify', desc: 'Instant equipment details on QR scan' },
    { icon: MapPin, title: 'Live Location', desc: 'Geo-tag every extinguisher precisely' },
    { icon: Shield, title: 'LDAP Secure', desc: 'Corporate Active Directory login' },
    { icon: CheckCircle2, title: 'Compliance Ready', desc: 'No more Excel sheets to maintain' },
  ];

  return (
    <div
      className="fire-bg"
      style={{
        display: 'flex',
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* Ambient floating flame accents */}
      <FlameDecor />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.1fr 1fr',
          width: '100%',
          height: '100%',
          position: 'relative',
          zIndex: 2,
          overflow: 'hidden',
        }}
        className="login-grid"
      >
        {/* LEFT: Hero / Brand */}
        <motion.section
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            padding: '2rem 3rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
          }}
          className="login-hero"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: 'var(--gradient-fire)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-fire)',
              }}
            >
              <Flame size={22} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', letterSpacing: '-0.01em' }}>
                Nuvoco Safety
              </div>
              <div style={{ fontSize: '0.75rem', opacity: 0.75 }}>
                Fire Extinguisher Management
              </div>
            </div>
          </div>

          <div style={{ maxWidth: 520 }}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.4rem 0.9rem',
                borderRadius: 999,
                background: 'rgba(255, 107, 53, 0.15)',
                border: '1px solid rgba(255, 107, 53, 0.35)',
                color: '#FFB627',
                fontSize: '0.75rem',
                fontWeight: 600,
                marginBottom: '1.25rem',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#FFB627',
                  boxShadow: '0 0 10px #FFB627',
                }}
              />
              Smart Safety Platform
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              style={{
                fontSize: 'clamp(1.75rem, 3.4vw, 2.75rem)',
                fontWeight: 800,
                lineHeight: 1.08,
                marginBottom: '0.85rem',
              }}
            >
              Protect every <span style={{
                background: 'var(--gradient-fire)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>flame</span>,<br />
              track every <span style={{ color: 'var(--color-accent)' }}>extinguisher</span>.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              style={{ opacity: 0.85, fontSize: '0.9rem', lineHeight: 1.55, marginBottom: '1.25rem' }}
            >
              A single place for all your fire safety equipment. Register once,
              scan anywhere, and get full history, live location and installer
              details instantly — no more excel sheets.
            </motion.p>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
              }}
            >
              {features.map((f, i) => (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 + i * 0.08 }}
                  style={{
                    padding: '0.9rem 1rem',
                    borderRadius: 12,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    backdropFilter: 'blur(8px)',
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'flex-start',
                  }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 8,
                      background: 'rgba(255,107,53,0.18)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FF6B35',
                      flexShrink: 0,
                    }}
                  >
                    <f.icon size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{f.title}</div>
                    <div style={{ fontSize: '0.72rem', opacity: 0.7 }}>{f.desc}</div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: '0.72rem', opacity: 0.55 }}>
            © {new Date().getFullYear()} Nuvoco Vistas Corp. Ltd. · Safety First · Always.
          </div>
        </motion.section>

        {/* RIGHT: Login Form */}
        <motion.section
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            overflow: 'hidden',
          }}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
            className="glass"
            style={{
              width: '100%',
              maxWidth: 420,
              borderRadius: 20,
              padding: '2rem 1.75rem',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 4,
                background: 'var(--gradient-fire)',
              }}
            />

            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <motion.div
                initial={{ scale: 0, rotate: -40 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ delay: 0.35, type: 'spring' }}
                style={{
                  width: 64,
                  height: 64,
                  margin: '0 auto 1rem',
                  borderRadius: '50%',
                  background: 'var(--gradient-fire)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-fire)',
                }}
              >
                <Flame size={30} color="white" className="animate-flicker" />
              </motion.div>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 800,
                  color: 'var(--color-secondary)',
                  marginBottom: '0.25rem',
                }}
              >
                Welcome back
              </h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                Sign in with your Nuvoco corporate ID
              </p>
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: '#FEE2E2',
                  color: '#B91C1C',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 10,
                  marginBottom: '1rem',
                  fontSize: '0.8rem',
                  border: '1px solid #FCA5A5',
                  textAlign: 'center',
                }}
              >
                {error}
              </motion.div>
            )}

            <form
              onSubmit={handleLogin}
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div>
                <label className="input-label">Corporate ID (LDAP)</label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={17}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: 14,
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type="text"
                    className="input-field"
                    placeholder="ashwini.sargar"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    style={{ paddingLeft: 40 }}
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex-between" style={{ marginBottom: 6 }}>
                  <label className="input-label" style={{ margin: 0 }}>
                    Password
                  </label>
                  <a
                    href="#"
                    style={{
                      fontSize: '0.7rem',
                      color: 'var(--color-secondary)',
                      fontWeight: 600,
                    }}
                  >
                    Forgot?
                  </a>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={17}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      left: 14,
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                    }}
                  />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="input-field"
                    placeholder="nuvoco123"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ paddingLeft: 40, paddingRight: 40 }}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      position: 'absolute',
                      top: '50%',
                      right: 10,
                      transform: 'translateY(-50%)',
                      background: 'transparent',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                    }}
                    aria-label="Toggle password visibility"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  fontSize: '0.8rem',
                  color: 'var(--text-secondary)',
                }}
              >
                <input type="checkbox" style={{ accentColor: 'var(--color-primary)' }} />
                Keep me signed in on this device
              </label>

              <button
                type="submit"
                className="btn btn-fire"
                style={{ width: '100%', height: 46, marginTop: 4 }}
                disabled={loading}
              >
                {loading ? (
                  <span className="animate-pulse">Authenticating…</span>
                ) : (
                  <>
                    Sign In Securely <ArrowRight size={17} />
                  </>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border-color)',
                textAlign: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Shield size={12} /> Secured by Nuvoco Active Directory
              </div>
            </div>
          </motion.div>
        </motion.section>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .fire-bg { height: auto !important; max-height: none !important; overflow: auto !important; min-height: 100vh; }
          .login-grid { grid-template-columns: 1fr !important; height: auto !important; overflow: visible !important; }
          .login-hero { padding: 1.5rem 1.25rem !important; }
        }
      `}</style>
    </div>
  );
}

function FlameDecor() {
  const flames = [
    { size: 220, top: '10%', left: '6%', delay: 0 },
    { size: 160, top: '70%', left: '12%', delay: 0.5 },
    { size: 180, top: '15%', right: '8%', delay: 1 },
    { size: 140, top: '75%', right: '14%', delay: 0.2 },
  ];
  return (
    <>
      {flames.map((f, i) => (
        <div
          key={i}
          aria-hidden
          style={{
            position: 'absolute',
            width: f.size,
            height: f.size,
            top: f.top,
            left: (f as { left?: string }).left,
            right: (f as { right?: string }).right,
            background:
              'radial-gradient(circle, rgba(255,107,53,0.35) 0%, rgba(255,107,53,0) 70%)',
            filter: 'blur(10px)',
            animation: `float ${5 + i}s ease-in-out infinite`,
            animationDelay: `${f.delay}s`,
            pointerEvents: 'none',
            zIndex: 1,
          }}
        />
      ))}
    </>
  );
}
