'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useScorecards } from '../../store';
import { useState, useEffect } from 'react';

export default function InputPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get('edit');
  const { scorecards, updateScorecard } = useScorecards();
  const card = scorecards.find(c => c.id === params.id);

  useEffect(() => {
    if (!card) {
      router.replace('/');
    }
  }, [card, router]);

  if (!card) return null;
  const current = card;
  const [values, setValues] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});
  const [sparks, setSparks] = useState<Record<string, boolean>>({});
  const [areas, setAreas] = useState<Record<string, boolean>>({});
  const [units, setUnits] = useState<Record<string, string>>({});
  const [sides, setSides] = useState<Record<string, 'left' | 'right'>>({});
  const [precisions, setPrecisions] = useState<Record<string, string>>({});
  const [trendPrecisions, setTrendPrecisions] = useState<Record<string, string>>({});

  function handleSubmit() {
    const newTiles = current.tiles.map(tile => {
      const input = values[tile.id];
      const name = names[tile.id];
      let newTile = { ...tile };
      if (name !== undefined) newTile.title = name;
      if (sparks[tile.id] !== undefined) newTile.showSparkline = sparks[tile.id];
      if (areas[tile.id] !== undefined) newTile.showArea = areas[tile.id];
      if (units[tile.id] !== undefined) newTile.units = units[tile.id] || undefined;
      if (sides[tile.id] !== undefined) newTile.unitSide = sides[tile.id];
      if (precisions[tile.id] !== undefined)
        newTile.precision = parseInt(precisions[tile.id]) || 0;
      if (trendPrecisions[tile.id] !== undefined)
        newTile.trendPrecision = parseInt(trendPrecisions[tile.id]) || 0;
      if (input !== undefined) {
        const num = parseFloat(input);
        if (!isNaN(num)) {
          newTile = {
            ...newTile,
            previousValue: tile.value,
            value: num,
            timestamp: new Date().toISOString(),
            history: [...(tile.history || []), num]
          };
        }
      }
      return newTile;
    });
    updateScorecard({ ...current, tiles: newTiles });
    router.push(`/scorecards/${current.id}`);
  }

  return (
    <main className="p-4 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Update KPIs</h1>
      <div className="space-y-4">
        {current.tiles.map(tile => (
          <div key={tile.id} className="space-y-1">
            {editId === tile.id ? (
              <input
                className="border p-2 w-full"
                defaultValue={tile.title}
                  onChange={e => setNames(v => ({ ...v, [tile.id]: e.target.value }))}
              />
            ) : (
              <label className="block font-medium">{tile.title}</label>
            )}
            <input
              className="border p-2 w-full"
              type="number"
              defaultValue={editId === tile.id ? tile.value ?? '' : ''}
              onChange={e => setValues(v => ({ ...v, [tile.id]: e.target.value }))}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={tile.showSparkline}
                onChange={e => setSparks(v => ({ ...v, [tile.id]: e.target.checked }))}
              />
              Sparkline
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                defaultChecked={tile.showArea}
                onChange={e => setAreas(v => ({ ...v, [tile.id]: e.target.checked }))}
              />
              Area
            </label>
            <input
              className="border p-2 w-full"
              placeholder="Units"
              defaultValue={tile.units || ''}
              onChange={e => setUnits(v => ({ ...v, [tile.id]: e.target.value }))}
            />
            <label className="flex items-center gap-2">
              <span>Unit position</span>
              <select
                className="border p-1"
                defaultValue={tile.unitSide || 'right'}
                onChange={e =>
                  setSides(v => ({ ...v, [tile.id]: e.target.value as 'left' | 'right' }))
                }
              >
                <option value="left">Left</option>
                <option value="right">Right</option>
              </select>
            </label>
            <label className="block mb-2">
              <span className="block">Value precision</span>
              <input
                className="border p-2 w-full"
                type="number"
                defaultValue={tile.precision ?? 0}
                onChange={e => setPrecisions(v => ({ ...v, [tile.id]: e.target.value }))}
              />
            </label>
            <label className="block mb-4">
              <span className="block">Trend precision</span>
              <input
                className="border p-2 w-full"
                type="number"
                defaultValue={tile.trendPrecision ?? 0}
                onChange={e =>
                  setTrendPrecisions(v => ({ ...v, [tile.id]: e.target.value }))
                }
              />
            </label>
          </div>
        ))}
      </div>
      <button className="mt-4 bg-blue-600 text-white px-4 py-2" onClick={handleSubmit}>
        Save
      </button>
    </main>
  );
}
