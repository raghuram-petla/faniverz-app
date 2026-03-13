'use client';
import { Loader2 } from 'lucide-react';

// @contract renders null when hasNextPage is false; disabled during fetch
export interface LoadMoreButtonProps {
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  fetchNextPage: () => void;
}

export function LoadMoreButton({
  hasNextPage,
  isFetchingNextPage,
  fetchNextPage,
}: LoadMoreButtonProps) {
  // @edge no more pages — bail out entirely
  if (!hasNextPage) return null;

  return (
    <div className="flex justify-center">
      <button
        onClick={() => fetchNextPage()}
        disabled={isFetchingNextPage}
        className="flex items-center gap-2 bg-input hover:bg-input-hover text-on-surface px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
      >
        {isFetchingNextPage ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Loading...
          </>
        ) : (
          'Load More'
        )}
      </button>
    </div>
  );
}
