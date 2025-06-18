'use client';
import React, { useEffect, useState } from 'react';
import 'flowbite';
import Link from 'next/link';
import { ScorecardsProvider } from '../scorecards/store';
import { BarsIcon, CloseIcon, HomeIcon, MoonIcon, SunIcon } from './icons';
import ImportExport from './ImportExport';

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
          className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-gray-50 dark:bg-gray-800 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="h-full px-3 py-4 overflow-y-auto">
            <nav className="space-y-2">
              <Link
                href="/"
                className="flex items-center w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <HomeIcon className="w-5 h-5 mr-3" />
                Home
              </Link>
              <button
                className="flex items-center w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => setDark(d => !d)}
              >
                {dark ? (
                  <SunIcon className="w-5 h-5 mr-3" />
                ) : (
                  <MoonIcon className="w-5 h-5 mr-3" />
                )}
                {dark ? 'Light' : 'Dark'} Mode
              </button>
              <ImportExport vertical />
            </nav>
          </div>
        </aside>
        <div className={`flex-1 transition-all ${open ? 'ml-64' : ''}`}>
          <header className="p-4 flex justify-between">
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Close sidebar' : 'Open sidebar'}
              >
                {open ? (
                  <CloseIcon className="w-6 h-6" />
                ) : (
                  <BarsIcon className="w-6 h-6" />
                )}
              </button>
              <h1 className="font-bold">KPI Scorecard</h1>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </ScorecardsProvider>
  );
}
