'use client';
import { GripVertical, User, X } from 'lucide-react';
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
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { MovieCast } from '@/lib/types';
import { getImageUrl } from '@shared/imageUrl';

// @coupling @dnd-kit/sortable — each item must have a unique id for drag tracking
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
      className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-on-surface-subtle hover:text-on-surface-muted shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-8 h-8 rounded-full bg-input overflow-hidden shrink-0 flex items-center justify-center">
        {entry.actor?.photo_url ? (
          <img
            src={getImageUrl(entry.actor.photo_url, 'sm') ?? entry.actor.photo_url}
            alt={entry.actor.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-4 h-4 text-on-surface-subtle" />
        )}
      </div>
      {/* @nullable actor relation may not be joined — falls back to raw actor_id */}
      <span className="text-on-surface font-medium flex-1 truncate">
        {entry.actor?.name ?? entry.actor_id}
      </span>
      {entry.role_name && (
        <span className="text-on-surface-muted text-sm truncate max-w-[120px]">
          {entry.role_name}
        </span>
      )}
      {entry.role_order != null && (
        <span className="text-xs bg-input text-on-surface-muted px-2 py-0.5 rounded">
          #{entry.role_order}
        </span>
      )}
      <button
        onClick={onRemove}
        className="p-1 rounded hover:bg-input text-on-surface-subtle hover:text-status-red"
        aria-label={`Remove ${entry.actor?.name}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// @contract renders a drag-and-drop sortable list; parent handles reorder logic in onDragEnd
export function SortableList({
  items,
  onDragEnd,
  onRemove,
}: {
  items: MovieCast[];
  onDragEnd: (event: DragEndEvent) => void;
  // @boundary isPending flag lets parent decide DB delete vs pending-state removal
  onRemove: (id: string, isPending: boolean) => void;
}) {
  // @assumes 5px distance constraint prevents accidental drags on click
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // @edge empty list — skip DndContext setup entirely
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
