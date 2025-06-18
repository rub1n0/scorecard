'use client';
import { useRouter } from 'next/navigation';
import { useScorecards } from '../store';
import { useState } from 'react';

export default function NewScorecard() {
  const router = useRouter();
  const { createScorecard } = useScorecards();
  const [name, setName] = useState('');

  return (
    <main className="p-4 max-w-md mx-auto">
      <h1 className="text-xl font-bold mb-4">Create Scorecard</h1>
      <input
        className="border p-2 w-full mb-4"
        placeholder="Scorecard name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2"
        onClick={() => {
          const card = createScorecard(name || 'Untitled');
          router.push(`/scorecards/${card.id}`);
        }}
      >
        Create
      </button>
    </main>
  );
}
