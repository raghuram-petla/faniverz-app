import { ChevronLeft, ChevronRight } from 'lucide-react';

export interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalCount: number;
  pageSize: number;
  onPrevious: () => void;
  onNext: () => void;
}

export function PaginationControls({
  page,
  totalPages,
  totalCount,
  pageSize,
  onPrevious,
  onNext,
}: PaginationControlsProps) {
  const from = page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-on-surface-muted">
        Showing {from}--{to} of {totalCount}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={onPrevious}
          disabled={page === 0}
          className="p-2 rounded-lg bg-surface-card border border-outline text-on-surface-muted hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm text-on-surface-muted px-2">
          Page {page + 1} of {totalPages}
        </span>
        <button
          onClick={onNext}
          disabled={page >= totalPages - 1}
          className="p-2 rounded-lg bg-surface-card border border-outline text-on-surface-muted hover:bg-surface-elevated disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
