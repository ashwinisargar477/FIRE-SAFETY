import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Nuvoco Fire Safety Management',
  description: 'Manage fire extinguishers securely and easily. A smart safety solution by Nuvoco.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
