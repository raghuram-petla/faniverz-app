'use client';
import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { type DragEndEvent } from '@dnd-kit/core';
import type { MovieCast, Actor } from '@/lib/types';
import { ActorSearchDropdown } from './ActorSearchDropdown';
import { SortableList } from './SortableCastList';

const ROLE_ORDER_OPTIONS = [
  { value: 1, label: '1 — Director' },
  { value: 2, label: '2 — Producer' },
  { value: 3, label: '3 — Music Director' },
  { value: 4, label: '4 — Director of Photography' },
  { value: 5, label: '5 — Editor' },
  { value: 6, label: '6 — Art Director' },
  { value: 7, label: '7 — Stunt Choreographer' },
  { value: 8, label: '8 — Choreographer' },
  { value: 9, label: '9 — Lyricist' },
];

const EMPTY_CAST_FORM = {
  actor_id: '',
  credit_type: 'cast' as 'cast' | 'crew',
  role_name: '',
  role_order: '',
};

export type PendingCastAdd = {
  actor_id: string;
  credit_type: 'cast' | 'crew';
  role_name: string | null;
  role_order: number | null;
  display_order: number;
  _actor?: Actor;
};

interface Props {
  visibleCast: MovieCast[];
  actors: Actor[];
  castSearchQuery: string;
  setCastSearchQuery: (q: string) => void;
  onAdd: (cast: PendingCastAdd) => void;
  onRemove: (id: string, isPending: boolean) => void;
  onReorder: (newOrder: string[]) => void;
}

export function CastSection({
  visibleCast,
  actors,
  castSearchQuery,
  setCastSearchQuery,
  onAdd,
  onRemove,
  onReorder,
}: Props) {
  const [castForm, setCastForm] = useState(EMPTY_CAST_FORM);

  const castItems = useMemo(
    () => visibleCast.filter((c) => c.credit_type === 'cast'),
    [visibleCast],
  );
  const crewItems = useMemo(
    () => visibleCast.filter((c) => c.credit_type === 'crew'),
    [visibleCast],
  );

  function handleCastDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = castItems.findIndex((c) => c.id === active.id);
    const newIndex = castItems.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(castItems, oldIndex, newIndex);
    onReorder([...reordered.map((c) => c.id), ...crewItems.map((c) => c.id)]);
  }

  function handleCrewDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = crewItems.findIndex((c) => c.id === active.id);
    const newIndex = crewItems.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(crewItems, oldIndex, newIndex);
    onReorder([...castItems.map((c) => c.id), ...reordered.map((c) => c.id)]);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!castForm.actor_id) {
      if (castSearchQuery) {
        alert('Please select an actor from the dropdown. Type at least 2 characters to search.');
      }
      return;
    }
    const actor = actors.find((a) => a.id === castForm.actor_id);
    onAdd({
      actor_id: castForm.actor_id,
      credit_type: castForm.credit_type,
      role_name: castForm.role_name || null,
      role_order:
        castForm.credit_type === 'crew' && castForm.role_order ? Number(castForm.role_order) : null,
      display_order: visibleCast.length,
      _actor: actor,
    });
    setCastForm(EMPTY_CAST_FORM);
    setCastSearchQuery('');
  }

  return (
    <div className="space-y-6">
      {/* ─── Cast Section ─── */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-on-surface">Cast</h3>
        {castItems.length > 0 ? (
          <SortableList items={castItems} onDragEnd={handleCastDragEnd} onRemove={onRemove} />
        ) : (
          <p className="text-sm text-on-surface-disabled">No cast members added yet.</p>
        )}
      </div>

      {/* ─── Crew Section ─── */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-on-surface">Crew</h3>
        {crewItems.length > 0 ? (
          <SortableList items={crewItems} onDragEnd={handleCrewDragEnd} onRemove={onRemove} />
        ) : (
          <p className="text-sm text-on-surface-disabled">No crew members added yet.</p>
        )}
      </div>

      {/* ─── Add Form ─── */}
      <form onSubmit={handleSubmit} className="bg-surface-elevated rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-on-surface-muted">Add Cast / Crew</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-on-surface-subtle mb-1">Type</label>
            <select
              value={castForm.credit_type}
              onChange={(e) =>
                setCastForm((p) => ({
                  ...p,
                  credit_type: e.target.value as 'cast' | 'crew',
                  role_order: '',
                }))
              }
              className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="cast">Cast (Actor)</option>
              <option value="crew">Crew (Technician)</option>
            </select>
          </div>
          <ActorSearchDropdown
            actors={actors}
            searchQuery={castSearchQuery}
            onSearchChange={(q) => {
              setCastSearchQuery(q);
              setCastForm((p) => ({ ...p, actor_id: '' }));
            }}
            onSelect={(a) => {
              setCastForm((p) => ({ ...p, actor_id: a.id }));
              setCastSearchQuery(a.name);
            }}
            selectedActorId={castForm.actor_id}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-on-surface-subtle mb-1">
              {castForm.credit_type === 'cast' ? 'Character Name' : 'Role Title'}
            </label>
            <input
              type="text"
              placeholder={castForm.credit_type === 'cast' ? 'e.g. Arjun' : 'e.g. Director'}
              value={castForm.role_name}
              onChange={(e) => setCastForm((p) => ({ ...p, role_name: e.target.value }))}
              className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          {castForm.credit_type === 'crew' && (
            <div>
              <label className="block text-xs text-on-surface-subtle mb-1">Role Order</label>
              <select
                value={castForm.role_order}
                onChange={(e) => setCastForm((p) => ({ ...p, role_order: e.target.value }))}
                className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="">Select role…</option>
                {ROLE_ORDER_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <button
          type="submit"
          disabled={!castForm.actor_id}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-on-surface text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </form>
    </div>
  );
}
