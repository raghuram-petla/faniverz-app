'use client';
import { useState, useMemo, useCallback } from 'react';
import { Plus } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import { type DragEndEvent } from '@dnd-kit/core';
import type { MovieCast, Actor } from '@/lib/types';
import { FormInput, FormSelect } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';
import { useCreateActor } from '@/hooks/useAdminCast';
import { ActorSearchDropdown } from './ActorSearchDropdown';
import { SortableList } from './SortableCastList';

// @invariant role_order values 1-9 match the display hierarchy in the mobile app's crew section
const ROLE_ORDER_OPTIONS = [
  { value: '1', label: '1 — Director' },
  { value: '2', label: '2 — Producer' },
  { value: '3', label: '3 — Music Director' },
  { value: '4', label: '4 — Director of Photography' },
  { value: '5', label: '5 — Editor' },
  { value: '6', label: '6 — Art Director' },
  { value: '7', label: '7 — Stunt Choreographer' },
  { value: '8', label: '8 — Choreographer' },
  { value: '9', label: '9 — Lyricist' },
];

const CREDIT_TYPE_OPTIONS = [
  { value: 'cast', label: 'Cast (Actor)' },
  { value: 'crew', label: 'Crew (Technician)' },
];

const EMPTY_CAST_FORM = {
  actor_id: '',
  credit_type: 'cast' as 'cast' | 'crew',
  role_name: '',
  role_order: '',
};

export type PendingCastAdd = {
  // @contract: stable ID for removal — prevents index-shift bugs when removing pending items
  _id: string;
  actor_id: string;
  credit_type: 'cast' | 'crew';
  // @nullable role_name — optional character name for cast, role title for crew
  role_name: string | null;
  // @nullable role_order — only set for crew; null for cast members
  role_order: number | null;
  display_order: number;
  // @coupling _actor carries display data; stripped before DB save
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
  showAddForm: boolean;
  onCloseAddForm: () => void;
  // @sync: Set of _id values for pending (unsaved) cast items — replaces startsWith('pending-cast-')
  // after _id migration, pending items carry stable UUIDs, not 'pending-cast-N' strings
  pendingIds: Set<string>;
}

export function CastSection({
  visibleCast,
  actors,
  castSearchQuery,
  setCastSearchQuery,
  onAdd,
  onRemove,
  onReorder,
  showAddForm,
  onCloseAddForm,
  pendingIds,
}: Props) {
  const [castForm, setCastForm] = useState(EMPTY_CAST_FORM);
  const createActor = useCreateActor();

  // @sideeffect creates actor with just a name, then auto-selects in the form
  const handleQuickAdd = useCallback(
    async (name: string) => {
      const personType = castForm.credit_type === 'crew' ? 'technician' : 'actor';
      const created = await createActor.mutateAsync({
        name,
        person_type: personType,
        photo_url: null,
        birth_date: null,
        height_cm: null,
      } as Partial<Actor>);
      const newActor = created as Actor;
      setCastForm((p) => ({ ...p, actor_id: newActor.id }));
      setCastSearchQuery(newActor.name);
    },
    [castForm.credit_type, createActor, setCastSearchQuery],
  );

  // @invariant cast and crew are rendered in separate drag-and-drop lists
  const castItems = useMemo(
    () => visibleCast.filter((c) => c.credit_type === 'cast'),
    [visibleCast],
  );
  const crewItems = useMemo(
    () => visibleCast.filter((c) => c.credit_type === 'crew'),
    [visibleCast],
  );

  // @contract reorder preserves cast-before-crew order; only cast items are rearranged
  function handleCastDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = castItems.findIndex((c) => c.id === active.id);
    const newIndex = castItems.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(castItems, oldIndex, newIndex);
    {
      /* v8 ignore start */
    }
    onReorder([...reordered.map((c) => c.id), ...crewItems.map((c) => c.id)]);
    {
      /* v8 ignore stop */
    }
  }

  function handleCrewDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = crewItems.findIndex((c) => c.id === active.id);
    const newIndex = crewItems.findIndex((c) => c.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    const reordered = arrayMove(crewItems, oldIndex, newIndex);
    {
      /* v8 ignore start */
    }
    onReorder([...castItems.map((c) => c.id), ...reordered.map((c) => c.id)]);
    {
      /* v8 ignore stop */
    }
  }

  // @edge actor_id empty + searchQuery present: user typed but didn't select from dropdown
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
      _id: crypto.randomUUID(),
      actor_id: castForm.actor_id,
      credit_type: castForm.credit_type,
      role_name: castForm.role_name || null,
      // @boundary role_order only applies to crew; cast members always get null
      role_order:
        castForm.credit_type === 'crew' && castForm.role_order ? Number(castForm.role_order) : null,
      display_order: visibleCast.length,
      _actor: actor,
    });
    setCastForm(EMPTY_CAST_FORM);
    setCastSearchQuery('');
    onCloseAddForm();
  }

  return (
    <div className="space-y-6">
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-surface-elevated rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-on-surface-muted">Add Cast / Crew</p>
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="Type"
              variant="compact"
              value={castForm.credit_type}
              options={CREDIT_TYPE_OPTIONS}
              onValueChange={(v) =>
                setCastForm((p) => ({
                  ...p,
                  credit_type: v as 'cast' | 'crew',
                  role_order: '',
                }))
              }
            />
            <ActorSearchDropdown
              actors={actors}
              searchQuery={castSearchQuery}
              onSearchChange={(q) => {
                setCastSearchQuery(q.trimStart());
                setCastForm((p) => ({ ...p, actor_id: '' }));
              }}
              onSelect={(a) => {
                setCastForm((p) => ({ ...p, actor_id: a.id }));
                setCastSearchQuery(a.name);
              }}
              selectedActorId={castForm.actor_id}
              onQuickAdd={handleQuickAdd}
              quickAddPending={createActor.isPending}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label={castForm.credit_type === 'cast' ? 'Character Name' : 'Role Title'}
              variant="compact"
              type="text"
              placeholder={castForm.credit_type === 'cast' ? 'e.g. Arjun' : 'e.g. Director'}
              value={castForm.role_name}
              onValueChange={(v) => setCastForm((p) => ({ ...p, role_name: v }))}
            />
            {castForm.credit_type === 'crew' && (
              <FormSelect
                label="Role Order"
                variant="compact"
                value={castForm.role_order}
                options={ROLE_ORDER_OPTIONS}
                placeholder="Select role…"
                onValueChange={(v) => setCastForm((p) => ({ ...p, role_order: v }))}
              />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!castForm.actor_id}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Entry
            </Button>
            <button
              type="button"
              onClick={() => {
                onCloseAddForm();
                setCastForm(EMPTY_CAST_FORM);
                setCastSearchQuery('');
              }}
              className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Cast Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-on-surface">Cast</h3>
        {castItems.length > 0 ? (
          <SortableList
            items={castItems}
            onDragEnd={handleCastDragEnd}
            onRemove={onRemove}
            pendingIds={pendingIds}
          />
        ) : (
          <p className="text-sm text-on-surface-disabled">No cast members added yet.</p>
        )}
      </div>

      {/* Crew Section */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-on-surface">Crew</h3>
        {crewItems.length > 0 ? (
          <SortableList
            items={crewItems}
            onDragEnd={handleCrewDragEnd}
            onRemove={onRemove}
            pendingIds={pendingIds}
          />
        ) : (
          <p className="text-sm text-on-surface-disabled">No crew members added yet.</p>
        )}
      </div>
    </div>
  );
}
