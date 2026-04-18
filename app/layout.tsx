import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Syne, DM_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import NavBar from '@/components/NavBar';

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

export const metadata: Metadata = {
  title: 'LabPulse — Instrument Troubleshooting Intelligence',
  description:
    'Rule-based diagnostic platform for LCMS, HPLC, GC, and GCMS. Evidence-ranked answers traced to verified vendor and scientific sources.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${syne.variable} ${dmSans.variable} ${jetbrains.variable}`}>
      <body>
        <NavBar />
        <div style={{ paddingTop: '64px' }}>{children}</div>
      </body>
    </html>
  );
}
