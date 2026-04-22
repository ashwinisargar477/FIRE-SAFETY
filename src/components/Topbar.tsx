'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Bell, Search, Flame } from 'lucide-react';

const titleMap: Record<string, { title: string; desc: string }> = {
  '/dashboard': { title: 'Dashboard', desc: "Today's safety overview" },
  '/dashboard/extinguishers': {
    title: 'Extinguishers',
    desc: 'Register equipment & generate QR codes',
  },
  '/dashboard/plants': { title: 'Plant Master', desc: 'All Nuvoco plant locations' },
  '/dashboard/users': { title: 'User Master', desc: 'LDAP-synced users' },
};

export default function Topbar() {
  const pathname = usePathname();
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const update = () =>
      setTime(
        new Date().toLocaleString([], {
          weekday: 'short',
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  const current = titleMap[pathname] ?? { title: 'Nuvoco Safety', desc: '' };

  return (
    <header
      className="glass"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.85rem 1.1rem',
        gap: '1rem',
        position: 'sticky',
        top: 0,
        zIndex: 30,
        borderRadius: 0,
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }} className="topbar-left">
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: 'var(--gradient-fire)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            boxShadow: 'var(--shadow-fire)',
            flexShrink: 0,
          }}
          className="hide-on-mobile"
        >
          <Flame size={18} />
        </div>
        <div style={{ minWidth: 0 }}>
          <h1
            style={{
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--color-secondary)',
              margin: 0,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {current.title}
          </h1>
          <p
            style={{
              fontSize: '0.72rem',
              color: 'var(--text-secondary)',
              margin: 0,
            }}
            className="hide-on-mobile"
          >
            {current.desc}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          className="hide-on-mobile"
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Search
            size={14}
            style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }}
          />
          <input
            className="input-field"
            placeholder="Search equipment, plants…"
            style={{ paddingLeft: 32, width: 260, height: 38, fontSize: '0.8rem' }}
          />
        </div>

        <span
          className="badge badge-info hide-on-mobile"
          style={{ background: '#ECFDF5', color: '#065F46' }}
          title="LDAP & system online"
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#22C55E',
              boxShadow: '0 0 8px #22C55E',
            }}
          />
          Online · {time}
        </span>

        <button
          style={{
            position: 'relative',
            width: 38,
            height: 38,
            borderRadius: 10,
            border: '1px solid var(--border-color)',
            background: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
          }}
          aria-label="Notifications"
        >
          <Bell size={17} />
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--fire-red)',
              boxShadow: '0 0 8px var(--fire-red)',
            }}
          />
        </button>
      </div>
      <style>{`
        @media (max-width: 767px) {
          .topbar-left { margin-left: 3rem; }
        }
      `}</style>
    </header>
  );
}
