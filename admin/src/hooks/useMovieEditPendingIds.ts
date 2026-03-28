'use client';
import { useMemo } from 'react';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type { PendingRun } from '@/components/movie-edit/TheatricalRunsSection';
import type { PendingVideoAdd, PendingAvailabilityAdd } from '@/hooks/useMovieEditTypes';

// @contract Derives stable Set<string> references from pending add arrays — prevents unnecessary re-renders
// @coupling Consumed by useMovieEditState; relies on _id fields from pending types
export function useMovieEditPendingIds(pending: {
  pendingCastAdds: PendingCastAdd[];
  pendingVideoAdds: PendingVideoAdd[];
  pendingAvailabilityAdds: PendingAvailabilityAdd[];
  pendingRunAdds: PendingRun[];
}) {
  // @sync: memoized Sets of pending _ids — stable references prevent unnecessary re-renders
  const pendingCastIds = useMemo(
    () => new Set(pending.pendingCastAdds.map((c) => c._id)),
    [pending.pendingCastAdds],
  );
  const pendingVideoIds = useMemo(
    () => new Set(pending.pendingVideoAdds.map((v) => v._id)),
    [pending.pendingVideoAdds],
  );
  const pendingAvailabilityIds = useMemo(
    () => new Set(pending.pendingAvailabilityAdds.map((a) => a._id)),
    [pending.pendingAvailabilityAdds],
  );
  // @sync: mirrors pendingCastIds/pendingVideoIds pattern — Set of stable _id UUIDs for pending runs
  const pendingRunIds = useMemo(
    () => new Set(pending.pendingRunAdds.map((r) => r._id)),
    [pending.pendingRunAdds],
  );

  return { pendingCastIds, pendingVideoIds, pendingAvailabilityIds, pendingRunIds };
}
