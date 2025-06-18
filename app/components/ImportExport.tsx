'use client';
import { useScorecards, Scorecard, Tile } from '../scorecards/store';
import type { ChangeEvent } from 'react';

export default function ImportExport({ vertical = false }: { vertical?: boolean }) {
  const { scorecards, updateScorecard } = useScorecards();

  function exportJSON() {
    const blob = new Blob([JSON.stringify(scorecards, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scorecards.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  function csvEscape(value: string | number | null) {
    const str = value ?? '';
    const escaped = String(str).replace(/"/g, '""');
    return `"${escaped}"`;
  }

  function exportCSV() {
    const rows = scorecards.flatMap((card: Scorecard) =>
      card.tiles.map((tile: Tile) =>
        [card.name, tile.title, tile.value, tile.previousValue, tile.timestamp]
          .map(csvEscape)
          .join(',')
      )
    );
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'scorecards.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  function importData(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result as string) as Scorecard[];
        json.forEach(updateScorecard);
      } catch (err) {
        alert('Invalid JSON');
      }
    };
    reader.readAsText(file);
  }

  const container = vertical ? 'flex flex-col space-y-2 mt-4' : 'space-x-2 mt-4';
  const btn = vertical
    ? 'flex items-center w-full p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700'
    : 'underline';

  return (
    <div className={container}>
      <button className={btn} onClick={exportJSON}>
        Export JSON
      </button>
      <button className={btn} onClick={exportCSV}>
        Export CSV
      </button>
      <label className={`${btn} cursor-pointer`}>
        Import
        <input
          type="file"
          accept="application/json"
          className="hidden"
          onChange={importData}
        />
      </label>
    </div>
  );
}
