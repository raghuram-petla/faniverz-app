'use client';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { AdminFeedCard } from './AdminFeedCard';
import type { NewsFeedItem } from '@/lib/types';

export interface SortableFeedListProps {
  items: NewsFeedItem[];
  onDragEnd: (event: DragEndEvent) => void;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleFeature: (id: string, featured: boolean) => void;
  onEdit: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function SortableFeedList({
  items,
  onDragEnd,
  onTogglePin,
  onToggleFeature,
  onEdit,
  onDelete,
}: SortableFeedListProps) {
  /** @edge distance: 5 prevents accidental drags when clicking action buttons on feed cards */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-on-surface-muted">
        No feed items found for this filter.
      </div>
    );
  }

  // @coupling onDragEnd handler in parent must call reorder mutation to persist new sort_order
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {items.map((item) => (
            <AdminFeedCard
              key={item.id}
              item={item}
              onTogglePin={onTogglePin}
              onToggleFeature={onToggleFeature}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
