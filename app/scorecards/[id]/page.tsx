'use client';
import { useParams, useRouter } from 'next/navigation';
import { useScorecards, Tile } from '../store';
import { useState, useEffect } from 'react';
import {
  DndContext,
  useSensor,
  PointerSensor,
  closestCenter,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import TileView from '../../components/Tile';
import { nanoid } from 'nanoid';

export default function ScorecardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { scorecards, updateScorecard } = useScorecards();
  const card = scorecards.find(c => c.id === params.id);
  if (!card) return <p className="p-4">Scorecard not found</p>;
  const current = card;
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(current.name);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('edit-mode');
    if (stored === 'true') setEditMode(true);
  }, []);

  useEffect(() => {
    localStorage.setItem('edit-mode', editMode ? 'true' : 'false');
  }, [editMode]);

  const sensors = [useSensor(PointerSensor)];

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = current.tiles.findIndex(t => t.id === active.id);
      const newIndex = current.tiles.findIndex(t => t.id === over.id);
      const newTiles = arrayMove(current.tiles, oldIndex, newIndex);
      updateScorecard({ ...current, tiles: newTiles });
    }
  }

  function addTile() {
    router.push(`/scorecards/${current.id}/add`);
  }

  function removeTile(id: string) {
    updateScorecard({ ...current, tiles: current.tiles.filter(t => t.id !== id) });
  }

  function duplicateTile(tile: Tile) {
    const copy = { ...tile, id: nanoid() };
    updateScorecard({ ...current, tiles: [...current.tiles, copy] });
  }

  return (
    <main className="p-4">
      <button className="text-blue-500 underline" onClick={() => router.push('/')}>Back</button>
      <div className="flex items-center gap-2 mt-4">
        {editingName ? (
          <>
            <input
              className="border p-1"
              value={name}
              onChange={e => setName(e.target.value)}
            />
            <button
              className="text-sm underline"
              onClick={() => {
                updateScorecard({ ...current, name });
                setEditingName(false);
              }}
            >
              Save
            </button>
          </>
        ) : (
          <h1 className="text-2xl font-bold">{current.name}</h1>
        )}
        <button className="text-sm underline" onClick={() => setEditMode(m => !m)}>
          {editMode ? 'Done' : 'Edit'}
        </button>
        {editMode && !editingName && (
          <button className="text-sm underline" onClick={() => setEditingName(true)}>
            Rename
          </button>
        )}
      </div>
      {editMode && (
        <button className="mt-4 bg-blue-600 text-white px-3 py-1" onClick={addTile}>
          Add Tile
        </button>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={current.tiles.map(t => t.id)} strategy={verticalListSortingStrategy}>
          <div className="grid md:grid-cols-6 gap-4 mt-4">
            {current.tiles.map(tile => (
              <div key={tile.id} id={tile.id} className="space-y-2">
                <TileView tile={tile} editMode={editMode} />
                {editMode && (
                  <div className="flex gap-2 text-sm">
                    <button className="underline" onClick={() => duplicateTile(tile)}>
                      Duplicate
                    </button>
                    <button className="underline text-red-600" onClick={() => removeTile(tile.id)}>
                      Remove
                    </button>
                    <button
                      className="underline"
                      onClick={() => router.push(`/scorecards/${current.id}/input?edit=${tile.id}`)}
                    >
                      Edit
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </main>
  );
}