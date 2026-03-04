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

export function SortableList({
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
