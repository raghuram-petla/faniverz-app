'use client';
import { Pin, Star, Trash2, X } from 'lucide-react';

export interface FeedBulkActionsProps {
  selectedCount: number;
  onPinSelected: () => void;
  onUnpinSelected: () => void;
  onFeatureSelected: () => void;
  onDeleteSelected: () => void;
  onClearSelection: () => void;
}

export function FeedBulkActions({
  selectedCount,
  onPinSelected,
  onUnpinSelected,
  onFeatureSelected,
  onDeleteSelected,
  onClearSelection,
}: FeedBulkActionsProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="flex items-center gap-3 bg-surface-elevated rounded-lg px-4 py-3">
      <span className="text-sm text-on-surface font-medium">{selectedCount} selected</span>

      <div className="flex items-center gap-2 ml-auto">
        <button
          onClick={onPinSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-600/10 text-red-400 hover:bg-red-600/20"
        >
          <Pin className="w-3.5 h-3.5" />
          Pin
        </button>
        <button
          onClick={onUnpinSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-input text-on-surface-muted hover:bg-surface"
        >
          <Pin className="w-3.5 h-3.5" />
          Unpin
        </button>
        <button
          onClick={onFeatureSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-yellow-600/10 text-yellow-400 hover:bg-yellow-600/20"
        >
          <Star className="w-3.5 h-3.5" />
          Feature
        </button>
        <button
          onClick={onDeleteSelected}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm bg-red-600/10 text-red-400 hover:bg-red-600/20"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
        <button
          onClick={onClearSelection}
          className="p-1.5 rounded-lg text-on-surface-subtle hover:bg-input"
          title="Clear selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
