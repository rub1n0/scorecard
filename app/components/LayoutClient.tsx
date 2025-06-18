'use client';
import React, { useEffect, useState } from 'react';
import 'flowbite';
import Link from 'next/link';
import { ScorecardsProvider } from '../scorecards/store';
import { BarsIcon, CloseIcon, HomeIcon, MoonIcon, SunIcon } from './icons';

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
          className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-gray-50 dark:bg-gray-800 ${open ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0`}
        >
          <div className="h-full px-3 py-4 overflow-y-auto">
            <button
              className="md:hidden mb-4 p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              onClick={() => setOpen(false)}
              aria-label="Close sidebar"
            >
              <CloseIcon className="w-6 h-6" />
            </button>
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
            </nav>
          </div>
        </aside>
        <div className="flex-1 md:ml-64">
          <header className="p-4 flex justify-between">
            <div className="flex items-center gap-2">
              <button
                className="md:hidden p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => setOpen(o => !o)}
                aria-label="Open sidebar"
              >
                <BarsIcon className="w-6 h-6" />
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
