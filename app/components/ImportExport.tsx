'use client';
import { useScorecards, Scorecard, Tile } from '../scorecards/store';
import type { ChangeEvent } from 'react';
import { nanoid } from 'nanoid';

export default function ImportExport({ vertical = false }: { vertical?: boolean }) {
  const { scorecards, updateScorecard, createScorecard } = useScorecards();

  function csvEscape(value: string | number | null) {
    const str = value ?? '';
    const escaped = String(str).replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function exportCSV() {
    const header = [
      'Scorecard',
      'Title',
      'Value',
      'Previous',
      'Timestamp',
      'Units',
      'Side',
    ]
      .map(csvEscape)
      .join(',');
    const rows = scorecards.flatMap((card: Scorecard) =>
      card.tiles.map((tile: Tile) =>
        [
          card.name,
          tile.title,
          tile.value,
          tile.previousValue,
          tile.timestamp,
          tile.units ?? '',
          tile.unitSide ?? 'right',
        ]
          .map(csvEscape)
          .join(',')
      )
    );
    const blob = new Blob([ [header, ...rows].join('\n') ], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scorecards.csv';
    a.click();
    URL.revokeObjectURL(url);
  }


  function importCSV(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = reader.result as string;
      const lines = text.split(/\r?\n/).filter(Boolean);
      if (lines[0] && lines[0].startsWith('"Scorecard"')) {
        lines.shift();
      }
      const groups: Record<string, Tile[]> = {};
      lines.forEach(line => {
        const cleaned = line.trim();
        if (!cleaned) return;
        // const parts = cleaned.slice(1, -1).split(/","/).map(p => p.replace(/""/g, '"'));
        const parts = cleaned.split(",").map(p => p.replace(/""/g, '"'));
        const [cardName, title, valueStr, prevStr, ts, units = '', side = 'right'] = parts;
        const numVal = parseFloat(valueStr);
        const numPrev = parseFloat(prevStr);
        const value = isNaN(numVal) ? null : numVal;
        const prev = isNaN(numPrev) ? null : numPrev;
        const tile: Tile = {
          id: nanoid(),
          title,
          value,
          previousValue: prev,
          timestamp: ts || null,
          history: value !== null ? [value] : [],
          showSparkline: false,
          showArea: false,
          units: units || undefined,
          unitSide: side as 'left' | 'right',
        };
        if (!groups[cardName]) groups[cardName] = [];
        groups[cardName].push(tile);
      });
      Object.entries(groups).forEach(([name, tiles]) => {
        const existing = scorecards.find(c => c.name === name);
        if (existing) {
          updateScorecard({ ...existing, tiles: [...existing.tiles, ...tiles] });
        } else {
          const base = createScorecard(name);
          updateScorecard({ ...base, tiles });
        }
      });
    };
    reader.readAsText(file);
  }

  const container = vertical ? 'flex flex-col space-y-2 mt-4' : 'space-x-2 mt-4';
  const item = vertical
    ? 'flex items-center w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700'
    : 'underline';

  return (
    <div className={container}>
      <button className={item} onClick={exportCSV}>
        Export
      </button>
      <label className={`${item} cursor-pointer`}>
        Import
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={importCSV}
        />
      </label>
    </div>
  );
}
