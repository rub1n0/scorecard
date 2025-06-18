'use client';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { nanoid } from 'nanoid';

export interface Tile {
  id: string;
  title: string;
  value: number | null;
  previousValue: number | null;
  timestamp: string | null;
  history: number[];
  showSparkline: boolean;
  showArea: boolean;
  units?: string;
  unitSide?: 'left' | 'right';
}

export interface Scorecard {
  id: string;
  name: string;
  tiles: Tile[];
}

interface Context {
  scorecards: Scorecard[];
  createScorecard(name: string): Scorecard;
  updateScorecard(card: Scorecard): void;
  removeScorecard(id: string): void;
}

const ScorecardContext = createContext<Context | undefined>(undefined);

const STORAGE_KEY = 'kpi-scorecards';

export function ScorecardsProvider({ children }: { children: React.ReactNode }) {
  const [scorecards, setScorecards] = useState<Scorecard[]>([]);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      setScorecards(JSON.parse(raw));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scorecards));
  }, [scorecards]);

  function createScorecard(name: string): Scorecard {
    const card: Scorecard = { id: nanoid(), name, tiles: [] };
    setScorecards(prev => [...prev, card]);
    return card;
  }

  function updateScorecard(card: Scorecard) {
    setScorecards(prev => prev.map(c => (c.id === card.id ? card : c)));
  }

  function removeScorecard(id: string) {
    setScorecards(prev => prev.filter(c => c.id !== id));
  }

  return (
    <ScorecardContext.Provider value={{ scorecards, createScorecard, updateScorecard, removeScorecard }}>
      {children}
    </ScorecardContext.Provider>
  );
}

export function useScorecards() {
  const ctx = useContext(ScorecardContext);
  if (!ctx) throw new Error('ScorecardsProvider missing');
  return ctx;
}
