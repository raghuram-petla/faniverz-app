'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus, Loader2 } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';
import Link from 'next/link';
import {
  useAdminFeed,
  useDeleteFeedItem,
  useTogglePinFeed,
  useToggleFeatureFeed,
  useReorderFeed,
} from '@/hooks/useAdminFeed';
import { FeedFilterTabs } from '@/components/feed/FeedFilterTabs';
import { SortableFeedList } from '@/components/feed/SortableFeedList';
import { FeedMobilePreview } from '@/components/feed/FeedMobilePreview';
import type { FeedType } from '@/lib/types';
import type { DragEndEvent } from '@dnd-kit/core';

// @contract Feed items support drag-and-drop reordering via @dnd-kit. Reorder sends ALL item
// display_order values in a single batch mutation (not just the moved item).
// @coupling FeedMobilePreview renders a live phone-frame preview of the current item list.
export default function FeedPage() {
  const { isReadOnly } = usePermissions();
  const router = useRouter();
  // @contract Filter 'all' maps to undefined (no server-side filter applied)
  const [filter, setFilter] = useState<FeedType | 'all'>('all');
  const queryFilter = filter === 'all' ? undefined : filter;
  const { data: items = [], isLoading } = useAdminFeed(queryFilter);
  const deleteMutation = useDeleteFeedItem();
  const pinMutation = useTogglePinFeed();
  const featureMutation = useToggleFeatureFeed();
  const reorderMutation = useReorderFeed();

  // @sideeffect Reorders all items optimistically — sends full display_order map to backend via batch update
  // @assumes items array is TanStack Query cache (optimistic update not applied locally — relies on re-fetch)
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(items, oldIndex, newIndex);
      // @sync Sends reorder batch — all items get new display_order indices
      const updates = reordered.map((item, idx) => ({ id: item.id, display_order: idx }));
      reorderMutation.mutate(updates);
    },
    [items, reorderMutation],
  );

  const handleDelete = useCallback(
    (id: string) => {
      if (!confirm('Delete this feed item?')) return;
      deleteMutation.mutate(id);
    },
    [deleteMutation],
  );

  const handleTogglePin = useCallback(
    (id: string, is_pinned: boolean) => pinMutation.mutate({ id, is_pinned }),
    [pinMutation],
  );

  const handleToggleFeature = useCallback(
    (id: string, is_featured: boolean) => featureMutation.mutate({ id, is_featured }),
    [featureMutation],
  );

  const handleEdit = useCallback((id: string) => router.push(`/feed/${id}`), [router]);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FeedFilterTabs selected={filter} onChange={setFilter} />
        {!isReadOnly && (
          <Link
            href="/feed/new"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium ml-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Update
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : (
        <div className="flex gap-6">
          {/* Left: Sortable list */}
          <div className="flex-1 min-w-0">
            <SortableFeedList
              items={items}
              onDragEnd={handleDragEnd}
              onTogglePin={handleTogglePin}
              onToggleFeature={handleToggleFeature}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </div>

          {/* Right: Mobile preview */}
          <div className="shrink-0">
            <FeedMobilePreview items={items} />
          </div>
        </div>
      )}
    </div>
  );
}
