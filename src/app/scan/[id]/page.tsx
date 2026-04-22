'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flame, Calendar, User, MapPin, CheckCircle, ShieldAlert } from 'lucide-react';

function ScanContent({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const rawData = searchParams.get('data');
    if (rawData) {
      try {
        setData(JSON.parse(rawData));
      } catch (e) {
        console.error("Failed to parse", e);
      }
    }
  }, [searchParams]);

  if (!data) {
    return (
      <div className="flex-center" style={{ height: '100vh', background: 'var(--bg-main)' }}>
        <div className="card glass" style={{ padding: '2rem', textAlign: 'center' }}>
          <ShieldAlert size={48} color="var(--status-warning)" style={{ margin: '0 auto 1rem' }} />
          <h2>Loading Information...</h2>
          <p>Please wait while we verify this equipment.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-main)', padding: '1rem', paddingBottom: '3rem' }}>
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        
        <header style={{ textAlign: 'center', padding: '2rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{ 
            width: '60px', height: '60px', 
            borderRadius: '50%', 
            background: 'var(--color-primary)', 
            color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: '1rem',
            boxShadow: 'var(--shadow-md)'
          }}>
            <Flame size={32} />
          </div>
          <h1 style={{ fontSize: '1.5rem', color: 'var(--color-secondary)' }}>Equipment Details</h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Nuvoco Fire Safety System</p>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card"
          style={{ overflow: 'hidden' }}
        >
          <div style={{ background: 'var(--status-success)', color: 'white', padding: '1.5rem', textAlign: 'center' }}>
            <CheckCircle size={32} style={{ margin: '0 auto 0.5rem' }} />
            <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Active Equipment</h2>
            <p style={{ opacity: 0.9, fontSize: '0.875rem', marginTop: '0.25rem' }}>System Generated Call No: <strong>{data.id}</strong></p>
          </div>
          
          <div style={{ padding: '1.5rem' }}>
            <h3 style={{ fontSize: '1rem', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem', color: 'var(--color-secondary)' }}>
              Registration Record
            </h3>
            
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><Flame size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Equipment Type</span>
                  <strong style={{ fontSize: '1rem' }}>{data.type} - {data.capacity}</strong>
                </div>
              </li>
              
              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><MapPin size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Location Details</span>
                  <strong style={{ fontSize: '1rem', display: 'block' }}>{data.plant}</strong>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{data.floor} • {data.direction} • {data.subLocation}</span>
                </div>
              </li>

              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><User size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Installed By (LDAP User)</span>
                  <strong style={{ fontSize: '1rem', fontFamily: 'monospace', background: 'var(--bg-main)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>{data.installedBy}</strong>
                </div>
              </li>

              <li style={{ display: 'flex', gap: '1rem' }}>
                <div style={{ color: 'var(--color-primary)' }}><Calendar size={20} /></div>
                <div>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Installation Date</span>
                  <strong style={{ fontSize: '1rem' }}>{new Date(data.installedDate).toLocaleString()}</strong>
                </div>
              </li>
            </ul>
          </div>
        </motion.div>
        
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            This information is maintained securely by Nuvoco.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function ScanResultPage({ params }: { params: { id: string } }) {
  return (
    <Suspense fallback={<div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading QR Data...</div>}>
      <ScanContent id={params.id} />
    </Suspense>
  );
}
