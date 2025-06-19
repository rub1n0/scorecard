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
  precision?: number;
  trendPrecision?: number;
  /** which trend direction is considered desirable */
  trendDirection?: 'up' | 'down';
}

export interface Scorecard {
  id: string;
  name: string;
  /** number of columns to display on desktop */
  columns: number;
  tiles: Tile[];
}

interface Context {
  scorecards: Scorecard[];
  createScorecard(name: string, columns?: number): Scorecard;
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
      const parsed: Scorecard[] = JSON.parse(raw);
      parsed.forEach(card => {
        if (card.columns === undefined) card.columns = 6;
      });
      setScorecards(parsed);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scorecards));
  }, [scorecards]);

  function createScorecard(name: string, columns: number = 6): Scorecard {
    const card: Scorecard = { id: nanoid(), name, columns, tiles: [] };
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
