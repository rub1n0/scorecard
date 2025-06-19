'use client';
import { useRouter } from 'next/navigation';
import { useScorecards } from '../store';
import { useState } from 'react';

export default function NewScorecard() {
  const router = useRouter();
  const { createScorecard } = useScorecards();
  const [name, setName] = useState('');
  const [columns, setColumns] = useState(6);

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Create Scorecard</h1>
      <input
        className="border p-2 w-full mb-4"
        placeholder="Scorecard name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <label className="block mb-4">
        <span className="mr-2">Columns</span>
        <select
          className="border p-1"
          value={columns}
          onChange={e => setColumns(parseInt(e.target.value))}
        >
          {[1,2,3,4,5,6].map(n => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </label>
      <button
        className="bg-blue-600 text-white px-4 py-2"
        onClick={() => {
          const card = createScorecard(name || 'Untitled', columns);
          router.push(`/scorecards/${card.id}`);
        }}
      >
        Create
      </button>
    </main>
  );
}
