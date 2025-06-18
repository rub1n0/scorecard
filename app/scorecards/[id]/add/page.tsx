'use client';
import { useParams, useRouter } from 'next/navigation';
import { useScorecards, Tile } from '../../store';
import { useState } from 'react';
import { nanoid } from 'nanoid';

export default function AddTilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { scorecards, updateScorecard } = useScorecards();
  const card = scorecards.find(c => c.id === params.id);
  if (!card) return <p className="p-4">Scorecard not found</p>;
  const current = card;
  const [title, setTitle] = useState('');

  function save() {
    const tile: Tile = {
      id: nanoid(),
      title: title || 'New KPI',
      value: null,
      previousValue: null,
      timestamp: null
    };
    updateScorecard({ ...current, tiles: [...current.tiles, tile] });
    router.push(`/scorecards/${current.id}`);
  }

  function close() {
    router.push(`/scorecards/${current.id}`);
  }

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Add Tile</h2>
        <input
          className="border p-2 w-full mb-4"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button className="underline" onClick={close}>
            Cancel
          </button>
          <button className="bg-blue-600 text-white px-4 py-1" onClick={save}>
            Add
          </button>
        </div>
      </div>
    </div>
  );
}
