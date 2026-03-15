'use client';
import { useState } from 'react';
import type {
  PendingVideoAdd,
  PendingPosterAdd,
  PendingPlatformAdd,
  PendingPHAdd,
} from '@/hooks/useMovieEditTypes';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type { PendingRun } from '@/components/movie-edit/TheatricalRunsSection';

// @contract: all pending state is local-only; nothing is persisted until the parent form saves
// @invariant: add-lists and remove-sets for each entity are independent — an ID should not appear in both
// @coupling: consumed by useMovieEdit to batch-apply changes on save
export function useMovieEditPendingState() {
  const [pendingCastAdds, setPendingCastAdds] = useState<PendingCastAdd[]>([]);
  const [pendingCastRemoveIds, setPendingCastRemoveIds] = useState<Set<string>>(new Set());
  const [localCastOrder, setLocalCastOrder] = useState<string[] | null>(null);

  const [pendingVideoAdds, setPendingVideoAdds] = useState<PendingVideoAdd[]>([]);
  const [pendingVideoRemoveIds, setPendingVideoRemoveIds] = useState<Set<string>>(new Set());

  const [pendingPosterAdds, setPendingPosterAdds] = useState<PendingPosterAdd[]>([]);
  const [pendingPosterRemoveIds, setPendingPosterRemoveIds] = useState<Set<string>>(new Set());
  // @nullable: null means no main-poster change pending; string means user selected a new main poster
  const [pendingMainPosterId, setPendingMainPosterId] = useState<string | null>(null);

  const [pendingPlatformAdds, setPendingPlatformAdds] = useState<PendingPlatformAdd[]>([]);
  const [pendingPlatformRemoveIds, setPendingPlatformRemoveIds] = useState<Set<string>>(new Set());

  const [pendingPHAdds, setPendingPHAdds] = useState<PendingPHAdd[]>([]);
  const [pendingPHRemoveIds, setPendingPHRemoveIds] = useState<Set<string>>(new Set());

  const [pendingRunAdds, setPendingRunAdds] = useState<PendingRun[]>([]);
  const [pendingRunRemoveIds, setPendingRunRemoveIds] = useState<Set<string>>(new Set());
  // @contract: maps run ID → end_date string; queued for PATCH on save
  const [pendingRunEndIds, setPendingRunEndIds] = useState<Map<string, string>>(new Map());

  // @sideeffect: clears all 14 pending-state fields back to empty defaults
  function resetPendingState() {
    setPendingCastAdds([]);
    setPendingCastRemoveIds(new Set());
    setLocalCastOrder(null);
    setPendingVideoAdds([]);
    setPendingVideoRemoveIds(new Set());
    setPendingPosterAdds([]);
    setPendingPosterRemoveIds(new Set());
    setPendingMainPosterId(null);
    setPendingPlatformAdds([]);
    setPendingPlatformRemoveIds(new Set());
    setPendingPHAdds([]);
    setPendingPHRemoveIds(new Set());
    setPendingRunAdds([]);
    setPendingRunRemoveIds(new Set());
    setPendingRunEndIds(new Map());
  }

  return {
    pendingCastAdds,
    setPendingCastAdds,
    pendingCastRemoveIds,
    setPendingCastRemoveIds,
    localCastOrder,
    setLocalCastOrder,
    pendingVideoAdds,
    setPendingVideoAdds,
    pendingVideoRemoveIds,
    setPendingVideoRemoveIds,
    pendingPosterAdds,
    setPendingPosterAdds,
    pendingPosterRemoveIds,
    setPendingPosterRemoveIds,
    pendingMainPosterId,
    setPendingMainPosterId,
    pendingPlatformAdds,
    setPendingPlatformAdds,
    pendingPlatformRemoveIds,
    setPendingPlatformRemoveIds,
    pendingPHAdds,
    setPendingPHAdds,
    pendingPHRemoveIds,
    setPendingPHRemoveIds,
    pendingRunAdds,
    setPendingRunAdds,
    pendingRunRemoveIds,
    setPendingRunRemoveIds,
    pendingRunEndIds,
    setPendingRunEndIds,
    resetPendingState,
  };
}
