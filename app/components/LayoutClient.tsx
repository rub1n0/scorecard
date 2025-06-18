'use client';
import React, { useEffect, useState } from 'react';
import 'flowbite';
import { ScorecardsProvider } from '../scorecards/store';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  return (
    <ScorecardsProvider>
      <div className="flex min-h-screen">
        <aside
          className={`bg-gray-200 dark:bg-gray-900 p-4 w-48 space-y-2 transform ${open ? 'block' : 'hidden'} md:block`}
        >
          <button className="underline" onClick={() => setOpen(false)}>Close</button>
          <nav className="mt-4 space-y-2">
            <a href="/" className="block underline">
              Home
            </a>
          </nav>
        </aside>
        <div className="flex-1">
          <header className="p-4 flex justify-between">
            <div className="flex items-center gap-2">
              <button className="md:hidden underline" onClick={() => setOpen(o => !o)}>
                Menu
              </button>
              <h1 className="font-bold">KPI Scorecard</h1>
            </div>
            <button className="underline" onClick={() => setDark(d => !d)}>
              {dark ? 'Light' : 'Dark'} Mode
            </button>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </ScorecardsProvider>
  );
}
