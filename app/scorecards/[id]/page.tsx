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
import SortableItem from '../../components/SortableItem';
import { nanoid } from 'nanoid';
import { DuplicateIcon, EditIcon, TrashIcon, CheckIcon } from '../../components/icons';

export default function ScorecardPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { scorecards, updateScorecard, removeScorecard } = useScorecards();
  const card = scorecards.find(c => c.id === params.id);
  const [editingName, setEditingName] = useState(false);
  const [name, setName] = useState(card?.name || '');
  const [columns, setColumns] = useState(card?.columns ?? 6);
  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!card) {
      router.replace('/');
    }
  }, [card, router]);

  useEffect(() => {
    if (card) {
      setName(card.name);
      setColumns(card.columns ?? 6);
    }
  }, [card]);

  if (!card) return null;
  const current = card;

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

  function deleteCard() {
    if (confirm('Delete this scorecard?')) {
      removeScorecard(current.id);
      router.push('/');
    }
  }

  return (
    <main className="p-4">
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
        {!editMode && (
          <button
            className="text-sm"
            onClick={() => setEditMode(true)}
            aria-label="Edit"
          >
            <EditIcon className="text-xl" />
          </button>
        )}
        {editMode && !editingName && (
          <>
            <button
              className="text-sm"
              onClick={() => setEditingName(true)}
              aria-label="Rename"
            >
              <EditIcon className="text-xl" />
            </button>
            <button
              className="text-sm"
              onClick={deleteCard}
              aria-label="Delete"
            >
              <TrashIcon className="text-xl text-red-600" />
            </button>
          </>
        )}
      </div>
      {editMode && (
        <div className="mt-4 flex items-center gap-4">
          <button className="bg-blue-600 text-white px-3 py-1" onClick={addTile}>
            Add Tile
          </button>
          <button
            className="text-sm"
            onClick={() => setEditMode(false)}
            aria-label="Done"
          >
            <CheckIcon className="text-xl" />
          </button>
          <label className="flex items-center gap-1">
            <span>Columns:</span>
            <select
              className="border p-1"
              value={columns}
              onChange={e => {
                const cols = parseInt(e.target.value);
                setColumns(cols);
                updateScorecard({ ...current, columns: cols });
              }}
            >
              {[1,2,3,4,5,6].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={current.tiles.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {(() => {
            const colMap: Record<number, string> = {
              1: 'md:grid-cols-1',
              2: 'md:grid-cols-2',
              3: 'md:grid-cols-3',
              4: 'md:grid-cols-4',
              5: 'md:grid-cols-5',
              6: 'md:grid-cols-6',
            };
            const colClass = colMap[current.columns ?? 6] || 'md:grid-cols-6';
            return (
              <div className={`grid gap-4 mt-4 ${colClass}`}>
                {current.tiles.map(tile => (
                  <SortableItem key={tile.id} id={tile.id}>
                    <div className="space-y-2">
                      <TileView tile={tile} editMode={editMode} />
                      {editMode && (
                        <div className="flex gap-2 text-sm">
                          <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => duplicateTile(tile)}
                            aria-label="Duplicate"
                          >
                            <DuplicateIcon className="text-xl" />
                          </button>
                          <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() => removeTile(tile.id)}
                            aria-label="Remove"
                          >
                            <TrashIcon className="text-xl text-red-600" />
                          </button>
                          <button
                            onPointerDown={e => e.stopPropagation()}
                            onClick={() =>
                              router.push(`/scorecards/${current.id}/input?edit=${tile.id}`)
                            }
                            aria-label="Edit"
                          >
                            <EditIcon className="text-xl" />
                          </button>
                        </div>
                      )}
                    </div>
                  </SortableItem>
                ))}
              </div>
            );
          })()}
        </SortableContext>
      </DndContext>
    </main>
  );
}
