'use client';
import { useState, useMemo } from 'react';
import { GripVertical, Plus, User, X } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MovieCast, Actor } from '@/lib/types';

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

function SortableCastItem({ entry, onRemove }: { entry: MovieCast; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: entry.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60 shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
        {entry.actor?.photo_url ? (
          <img
            src={entry.actor.photo_url}
            alt={entry.actor.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-4 h-4 text-white/40" />
        )}
      </div>
      <span className="text-white font-medium flex-1 truncate">
        {entry.actor?.name ?? entry.actor_id}
      </span>
      {entry.role_name && (
        <span className="text-white/60 text-sm truncate max-w-[120px]">{entry.role_name}</span>
      )}
      {entry.role_order != null && (
        <span className="text-xs bg-white/10 text-white/60 px-2 py-0.5 rounded">
          #{entry.role_order}
        </span>
      )}
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
        aria-label={`Remove ${entry.actor?.name}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function SortableList({
  items,
  onDragEnd,
  onRemove,
}: {
  items: MovieCast[];
  onDragEnd: (event: DragEndEvent) => void;
  onRemove: (id: string, isPending: boolean) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (items.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((c) => c.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((entry) => (
            <SortableCastItem
              key={entry.id}
              entry={entry}
              onRemove={() => onRemove(entry.id, entry.id.startsWith('pending-cast-'))}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

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
  const [dropdownOpen, setDropdownOpen] = useState(false);

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
    <div className="space-y-6 mt-8">
      {/* ─── Cast Section ─── */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white">Cast</h2>
        {castItems.length > 0 ? (
          <SortableList items={castItems} onDragEnd={handleCastDragEnd} onRemove={onRemove} />
        ) : (
          <p className="text-sm text-white/30">No cast members added yet.</p>
        )}
      </div>

      {/* ─── Crew Section ─── */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-white">Crew</h2>
        {crewItems.length > 0 ? (
          <SortableList items={crewItems} onDragEnd={handleCrewDragEnd} onRemove={onRemove} />
        ) : (
          <p className="text-sm text-white/30">No crew members added yet.</p>
        )}
      </div>

      {/* ─── Add Form ─── */}
      <form onSubmit={handleSubmit} className="bg-white/5 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white/60">Add Cast / Crew</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Type</label>
            <select
              value={castForm.credit_type}
              onChange={(e) =>
                setCastForm((p) => ({
                  ...p,
                  credit_type: e.target.value as 'cast' | 'crew',
                  role_order: '',
                }))
              }
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="cast">Cast (Actor)</option>
              <option value="crew">Crew (Technician)</option>
            </select>
          </div>
          <div className="relative">
            <label className="block text-xs text-white/40 mb-1">Person *</label>
            <input
              type="text"
              placeholder="Type to search…"
              value={castSearchQuery}
              onChange={(e) => {
                setCastSearchQuery(e.target.value);
                setCastForm((p) => ({ ...p, actor_id: '' }));
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
            {dropdownOpen && castSearchQuery.length >= 2 && !castForm.actor_id && (
              <div className="absolute z-40 top-full mt-1 left-0 right-0 bg-zinc-800 border border-white/10 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {actors.length > 0 ? (
                  actors.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setCastForm((p) => ({ ...p, actor_id: a.id }));
                        setCastSearchQuery(a.name);
                        setDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white hover:bg-white/10 text-left"
                    >
                      <div className="w-6 h-6 rounded-full bg-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                        {a.photo_url ? (
                          <img src={a.photo_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-3 h-3 text-white/40" />
                        )}
                      </div>
                      {a.name}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-white/40">No matching actors found</p>
                )}
              </div>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">
              {castForm.credit_type === 'cast' ? 'Character Name' : 'Role Title'}
            </label>
            <input
              type="text"
              placeholder={castForm.credit_type === 'cast' ? 'e.g. Arjun' : 'e.g. Director'}
              value={castForm.role_name}
              onChange={(e) => setCastForm((p) => ({ ...p, role_name: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          {castForm.credit_type === 'crew' && (
            <div>
              <label className="block text-xs text-white/40 mb-1">Role Order</label>
              <select
                value={castForm.role_order}
                onChange={(e) => setCastForm((p) => ({ ...p, role_order: e.target.value }))}
                className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
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
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Entry
        </button>
      </form>
    </div>
  );
}
