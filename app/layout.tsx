import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import NavBar from '@/components/NavBar';
import AuthRedirect from '@/components/AuthRedirect';

const syne = Syne({
  subsets: ['latin'],
  variable: '--font-syne',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  weight: ['400', '500'],
  display: 'swap',
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#14b8a6',
};

export const metadata: Metadata = {
  title: 'LabPulse — Instrument Troubleshooting Intelligence',
  description:
    'Rule-based diagnostic platform for 27 analytical techniques including LCMS, HPLC, GC, GCMS, PrepLC, NMR, Raman, TEM, SEC-MALS, and more. Supports Agilent, Waters, Thermo Fisher, KNAUER, Shimadzu, and 25 other vendors. Evidence-ranked answers traced to verified sources.',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body>
        <AuthRedirect />
        <NavBar />
        <div style={{ paddingTop: '64px' }}>{children}</div>
      </body>
    </html>
  );
}
