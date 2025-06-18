'use client';
import Link from 'next/link';
import { useScorecards } from './scorecards/store';
import ImportExport from './components/ImportExport';

export default function HomePage() {
  const { scorecards } = useScorecards();
  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Scorecards</h1>
      <ul className="space-y-2">
        {scorecards.map(card => (
          <li key={card.id}>
            <Link href={`/scorecards/${card.id}`} className="text-blue-500 underline">
              {card.name}
            </Link>
          </li>
        ))}
      </ul>
      <Link href="/scorecards/new" className="mt-4 inline-block text-blue-500 underline">
        Create Scorecard
      </Link>
      <ImportExport />
    </main>
  );
}
