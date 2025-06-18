import './globals.css';
import React from 'react';
import LayoutClient from './components/LayoutClient';
import { ScorecardsProvider } from './scorecards/store';

export const metadata = {
  title: 'KPI Scorecard',
  description: 'Personal KPI scorecard dashboard',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <ScorecardsProvider>
          <LayoutClient>{children}</LayoutClient>
        </ScorecardsProvider>
      </body>
    </html>
  );
}
