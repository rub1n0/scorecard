'use client';
import Link from 'next/link';
import { useScorecards } from './scorecards/store';
import { useState } from 'react';
import { EditIcon } from './components/icons';

export default function HomePage() {
  const { scorecards, updateScorecard } = useScorecards();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Scorecards</h1>
      <ul className="space-y-2">
        {scorecards.map(card => (
          <li key={card.id}>
            {editingId === card.id ? (
              <>
                <input
                  className="border p-1 mr-2"
                  value={name}
                  onChange={e => setName(e.target.value)}
                />
                <button
                  className="underline mr-2"
                  onClick={() => {
                    updateScorecard({ ...card, name });
                    setEditingId(null);
                  }}
                >
                  Save
                </button>
                <button className="underline" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </>
            ) : (
              <>
                <Link href={`/scorecards/${card.id}`} className="text-blue-500 underline">
                  {card.name}
                </Link>
                <button
                  className="ml-2 text-sm"
                  onClick={() => {
                    setEditingId(card.id);
                    setName(card.name);
                  }}
                  aria-label="Rename"
                >
                  <EditIcon className="text-lg" />
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
