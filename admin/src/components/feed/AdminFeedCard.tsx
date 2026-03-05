'use client';
import { Pin, Star, Pencil, Trash2, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { NewsFeedItem } from '@/lib/types';

const TYPE_COLORS: Record<string, string> = {
  trailer: 'bg-blue-600',
  teaser: 'bg-blue-500',
  glimpse: 'bg-blue-400',
  promo: 'bg-blue-400',
  song: 'bg-purple-600',
  poster: 'bg-green-600',
  bts: 'bg-orange-500',
  interview: 'bg-orange-500',
  event: 'bg-orange-400',
  making: 'bg-orange-400',
  'short-film': 'bg-pink-600',
  update: 'bg-gray-500',
};

export interface AdminFeedCardProps {
  item: NewsFeedItem;
  onTogglePin: (id: string, pinned: boolean) => void;
  onToggleFeature: (id: string, featured: boolean) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AdminFeedCard({
  item,
  onTogglePin,
  onToggleFeature,
  onEdit,
  onDelete,
}: AdminFeedCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  const badgeColor = TYPE_COLORS[item.content_type] ?? 'bg-gray-600';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3"
    >
      {/* Drag handle */}
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-on-surface-subtle hover:text-on-surface-muted shrink-0"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="w-4 h-4" />
      </button>

      {/* Thumbnail */}
      <div className="w-16 h-10 rounded-md overflow-hidden bg-input shrink-0">
        {item.thumbnail_url ? (
          <img src={item.thumbnail_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-surface" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-bold text-white px-1.5 py-0.5 rounded ${badgeColor}`}>
            {item.content_type.toUpperCase()}
          </span>
          {item.movie?.title ? (
            <span className="text-xs text-on-surface-muted truncate">{item.movie.title}</span>
          ) : null}
        </div>
        <p className="text-sm text-on-surface font-medium truncate">{item.title}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={() => onTogglePin(item.id, !item.is_pinned)}
          className={`p-1.5 rounded-lg transition-colors ${
            item.is_pinned
              ? 'bg-red-600/20 text-red-400'
              : 'text-on-surface-subtle hover:text-on-surface-muted hover:bg-input'
          }`}
          title={item.is_pinned ? 'Unpin' : 'Pin to top'}
        >
          <Pin className="w-4 h-4" />
        </button>
        <button
          onClick={() => onToggleFeature(item.id, !item.is_featured)}
          className={`p-1.5 rounded-lg transition-colors ${
            item.is_featured
              ? 'bg-yellow-600/20 text-yellow-400'
              : 'text-on-surface-subtle hover:text-on-surface-muted hover:bg-input'
          }`}
          title={item.is_featured ? 'Unfeature' : 'Feature'}
        >
          <Star className="w-4 h-4" />
        </button>
        <button
          onClick={() => onEdit(item.id)}
          className="p-1.5 rounded-lg text-on-surface-subtle hover:text-on-surface-muted hover:bg-input"
          title="Edit"
        >
          <Pencil className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className="p-1.5 rounded-lg text-on-surface-subtle hover:text-red-400 hover:bg-input"
          title="Delete"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
