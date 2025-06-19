'use client';
import React, { useEffect, useState } from 'react';
import 'flowbite';
import Link from 'next/link';
import { useScorecards } from '../scorecards/store';
import { BarsIcon, CloseIcon, HomeIcon, MoonIcon, SunIcon } from './icons';
import ImportExport from './ImportExport';

export default function LayoutClient({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
  }, [dark]);

  const { scorecards } = useScorecards();

  return (
      <div className="flex min-h-screen">
        <aside
          className={`fixed top-0 left-0 z-40 w-64 h-screen transition-transform bg-gray-50 dark:bg-gray-800 ${open ? 'translate-x-0' : '-translate-x-full'}`}
        >
          <div className="h-full px-3 py-4 overflow-y-auto flex flex-col">
            <nav className="space-y-2 flex-1">
              <Link
                href="/"
                className="flex items-center w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                <HomeIcon className="mr-3 text-xl" />
                Home
              </Link>
              <details>
                <summary className="flex items-center w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">
                  Scorecards
                </summary>
                <nav className="ml-4 flex flex-col mt-1">
                  {scorecards.map(card => (
                    <Link
                      key={card.id}
                      href={`/scorecards/${card.id}`}
                      className="flex items-center w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                    >
                      {card.name}
                    </Link>
                  ))}
                  <Link
                    href="/scorecards/new"
                    className="flex items-center w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                  >
                    Create
                  </Link>
                </nav>
              </details>
              <ImportExport vertical />
            </nav>
            <button
              className="flex items-center w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 mt-2"
              onClick={() => setDark(d => !d)}
            >
              {dark ? (
                <SunIcon className="mr-3 text-xl" />
              ) : (
                <MoonIcon className="mr-3 text-xl" />
              )}
              {dark ? 'Light' : 'Dark'} Mode
            </button>
          </div>
        </aside>
        <div className={`flex-1 transition-all ${open ? 'ml-64' : ''}`}>
          <header className="p-1 flex justify-between">
            <div className="flex items-center gap-2">
              <button
                className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700"
                onClick={() => setOpen(o => !o)}
                aria-label={open ? 'Close sidebar' : 'Open sidebar'}
              >
                {open ? (
                  <CloseIcon className="text-2xl" />
                ) : (
                  <BarsIcon className="text-2xl" />
                )}
              </button>
            </div>
          </header>
          <main>{children}</main>
        </div>
      </div>
  );
}
