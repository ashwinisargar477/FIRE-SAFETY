import React from 'react';
import Sidebar from '@/components/Sidebar';
import Topbar from '@/components/Topbar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="app-bg" style={{ display: 'flex', minHeight: '100vh', width: '100%' }}>
      <Sidebar />
      <div
        className="main-content"
        style={{
          flex: 1,
          marginLeft: 0,
          width: '100vw',
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          transition: 'margin-left 0.3s ease',
        }}
      >
        <Topbar />
        <main
          style={{
            flex: 1,
            padding: '1.25rem',
            paddingTop: '1.25rem',
          }}
          className="main-inner"
        >
          <div className="page-container" style={{ padding: 0 }}>
            {children}
          </div>
        </main>
      </div>
      <style>{`
        @media (min-width: 768px) {
          .main-content {
            margin-left: 232px !important;
            width: calc(100vw - 232px) !important;
          }
          .main-inner { padding: 1.75rem 2rem !important; }
        }
      `}</style>
    </div>
  );
}
