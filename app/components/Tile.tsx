'use client';
import { Tile } from '../scorecards/store';

export default function TileView({ tile }: { tile: Tile }) {
  const delta = tile.previousValue !== null && tile.value !== null ? tile.value - tile.previousValue : null;
  const positive = delta !== null && delta >= 0;

  return (
    <div className="border p-4 rounded bg-gray-50 dark:bg-gray-800">
      <h3 className="font-semibold mb-2">{tile.title}</h3>
      <p className="text-2xl font-bold">{tile.value ?? '-'}</p>
      {delta !== null && (
        <p className={positive ? 'text-green-500' : 'text-red-500'}>
          {positive ? '▲' : '▼'} {delta.toFixed(2)}
        </p>
      )}
      {tile.timestamp && <p className="text-xs text-gray-500">{new Date(tile.timestamp).toLocaleString()}</p>}
    </div>
  );
}
