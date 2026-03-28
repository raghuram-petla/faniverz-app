import { ArrowLeft, Trash2 } from 'lucide-react';

/** @contract Props for the sticky header bar on the movie edit page */
export interface MovieEditHeaderProps {
  title: string | null;
  onBack: () => void;
  canDelete: boolean;
  onDelete: () => void;
}

/**
 * @contract Sticky header with back button, movie title, and optional delete action.
 * Rendered at the top of the EditMoviePage.
 */
export function MovieEditHeader({ title, onBack, canDelete, onDelete }: MovieEditHeaderProps) {
  return (
    <div className="sticky top-0 z-30 backdrop-blur bg-surface/95 border-b border-outline -mx-4 px-4 py-3 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-2 rounded-lg bg-input hover:bg-input-active">
          <ArrowLeft className="w-4 h-4 text-on-surface" />
        </button>
        <h1 className="text-2xl font-bold text-on-surface">
          Edit Movie
          {title && <span className="text-on-surface-muted font-normal"> — {title}</span>}
        </h1>
      </div>
      {/* @invariant Top-level delete: only root/super_admin */}
      {canDelete && (
        <button
          onClick={onDelete}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600/20 text-status-red hover:bg-red-600/30 text-sm"
        >
          <Trash2 className="w-4 h-4" /> Delete
        </button>
      )}
    </div>
  );
}
