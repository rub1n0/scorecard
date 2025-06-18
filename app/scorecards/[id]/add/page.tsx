'use client';
import { useParams, useRouter } from 'next/navigation';
import { useScorecards, Tile } from '../../store';
import { useState, useEffect } from 'react';
import { nanoid } from 'nanoid';

export default function AddTilePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { scorecards, updateScorecard } = useScorecards();
  const card = scorecards.find(c => c.id === params.id);

  useEffect(() => {
    if (!card) {
      router.replace('/');
    }
  }, [card, router]);

  if (!card) return null;
  const current = card;
  const [title, setTitle] = useState('');
  const [value, setValue] = useState('');
  const [spark, setSpark] = useState(false);
  const [area, setArea] = useState(false);
  const [units, setUnits] = useState('');
  const [unitSide, setUnitSide] = useState<'left' | 'right'>('right');
  const [precision, setPrecision] = useState('0');
  const [trendPrecision, setTrendPrecision] = useState('2');

  function save() {
    const num = parseFloat(value);
    const val = isNaN(num) ? null : num;
    const tile: Tile = {
      id: nanoid(),
      title: title || 'New KPI',
      value: val,
      previousValue: null,
      timestamp: val !== null ? new Date().toISOString() : null,
      history: val !== null ? [val] : [],
      showSparkline: spark,
      showArea: area,
      units: units || undefined,
      unitSide,
      precision: parseInt(precision) || 0,
      trendPrecision: parseInt(trendPrecision) || 0,
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
          className="border p-2 w-full mb-2"
          placeholder="Title"
          value={title}
          onChange={e => setTitle(e.target.value)}
        />
        <input
          className="border p-2 w-full mb-2"
          placeholder="Initial value"
          type="number"
          value={value}
          onChange={e => setValue(e.target.value)}
        />
        <label className="flex items-center gap-2 mb-2">
          <input
            type="checkbox"
            checked={spark}
            onChange={e => setSpark(e.target.checked)}
          />
          Enable sparkline
        </label>
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={area}
            onChange={e => setArea(e.target.checked)}
          />
          Sparkline area
        </label>
        <input
          className="border p-2 w-full mb-2"
          placeholder="Units"
          value={units}
          onChange={e => setUnits(e.target.value)}
        />
        <label className="flex items-center gap-2 mb-4">
          <span>Unit position</span>
          <select
            className="border p-1"
            value={unitSide}
            onChange={e => setUnitSide(e.target.value as 'left' | 'right')}
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
          </select>
        </label>
        <input
          className="border p-2 w-full mb-2"
          placeholder="Value precision"
          type="number"
          value={precision}
          onChange={e => setPrecision(e.target.value)}
        />
        <input
          className="border p-2 w-full mb-4"
          placeholder="Trend precision"
          type="number"
          value={trendPrecision}
          onChange={e => setTrendPrecision(e.target.value)}
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