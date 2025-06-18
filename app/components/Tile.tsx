'use client';
import { Tile } from '../scorecards/store';

export default function TileView({ tile, editMode }: { tile: Tile; editMode?: boolean }) {
  const delta = tile.previousValue !== null && tile.value !== null ? tile.value - tile.previousValue : null;
  const positive = delta !== null && delta >= 0;

  const history = tile.history || [];
  let path = '';
  let area = '';
  if (tile.showSparkline && history.length > 1) {
    const max = Math.max(...history);
    const min = Math.min(...history);
    const range = max - min || 1;
    path = history
      .map((v, i) => {
        const x = (i / (history.length - 1)) * 100;
        const y = 20 - ((v - min) / range) * 20;
        return `${i === 0 ? 'M' : 'L'}${x},${y}`;
      })
      .join(' ');
    area = `${path} L100,20 L0,20 Z`;
  }
  const value =
    tile.value !== null && tile.precision !== undefined
      ? tile.value.toFixed(tile.precision)
      : tile.value ?? '-';
  return (
    <div className="border p-4 rounded bg-gray-50 dark:bg-gray-800">
      <h3 className="font-semibold mb-2">{tile.title}</h3>
      <div className="flex items-baseline gap-2">
        {tile.unitSide === 'left' && tile.units && <span>{tile.units}</span>}
        <p className="text-4xl font-bold">{value}</p>
        {tile.unitSide !== 'left' && tile.units && <span>{tile.units}</span>}
        {delta !== null && (
          <span className={positive ? 'text-green-500' : 'text-red-500'}>
            {positive ? '▲' : '▼'} {delta.toFixed(tile.trendPrecision ?? 2)}
          </span>
        )}
      </div>
      {tile.showSparkline && history.length > 1 && (
        <svg viewBox="0 0 100 20" className="w-full h-5 mt-1">
          {tile.showArea && <path d={area} fill="currentColor" opacity="0.2" />} 
          <path d={path} fill="none" stroke="currentColor" strokeWidth="1" />
        </svg>
      )}
      {editMode && tile.timestamp && (
        <p className="text-xs text-gray-500">{new Date(tile.timestamp).toLocaleString()}</p>
      )}
    </div>
  );
}
