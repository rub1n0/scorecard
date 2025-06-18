'use client';
import React, { useEffect, useState } from 'react';
import 'flowbite';
import { ScorecardsProvider } from '../scorecards/store';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <ScorecardsProvider>
      <header className="p-4 flex justify-between">
        <h1 className="font-bold">KPI Scorecard</h1>
        <button className="underline" onClick={() => setDark(d => !d)}>
          {dark ? 'Light' : 'Dark'} Mode
        </button>
      </header>
      {children}
    </ScorecardsProvider>
  );
}
