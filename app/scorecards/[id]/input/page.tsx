'use client';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useScorecards } from '../../store';
import { useState } from 'react';

export default function InputPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const search = useSearchParams();
  const editId = search.get('edit');
  const { scorecards, updateScorecard } = useScorecards();
  const card = scorecards.find(c => c.id === params.id);
  if (!card) return <p className="p-4">Scorecard not found</p>;
  const current = card;
  const [values, setValues] = useState<Record<string, string>>({});
  const [names, setNames] = useState<Record<string, string>>({});

  function handleSubmit() {
    const newTiles = current.tiles.map(tile => {
      const input = values[tile.id];
      const name = names[tile.id];
      let newTile = { ...tile };
      if (name !== undefined) newTile.title = name;
      if (input !== undefined) {
        const num = parseFloat(input);
        if (!isNaN(num)) {
          newTile = {
            ...newTile,
            previousValue: tile.value,
            value: num,
            timestamp: new Date().toISOString()
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
          </div>
        ))}
      </div>
      <button className="mt-4 bg-blue-600 text-white px-4 py-2" onClick={handleSubmit}>
        Save
      </button>
    </main>
  );
}
