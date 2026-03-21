'use client';
import type React from 'react';
import { uploadImage } from '@/hooks/useImageUpload';
import type {
  MovieForm,
  PendingVideoAdd,
  PendingPosterAdd,
  PendingPlatformAdd,
  PendingPHAdd,
} from '@/hooks/useMovieEditTypes';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type { PendingRun } from '@/components/movie-edit/TheatricalRunsSection';

// @contract All setter functions must match the pending-state shape from useMovieEditPendingState
export interface CommonFormDeps {
  setForm: React.Dispatch<React.SetStateAction<MovieForm>>;
  setPendingVideoAdds: React.Dispatch<React.SetStateAction<PendingVideoAdd[]>>;
  setPendingVideoRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingPosterAdds: React.Dispatch<React.SetStateAction<PendingPosterAdd[]>>;
  setPendingPosterRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingPlatformAdds: React.Dispatch<React.SetStateAction<PendingPlatformAdd[]>>;
  setPendingPlatformRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingPHAdds: React.Dispatch<React.SetStateAction<PendingPHAdd[]>>;
  setPendingPHRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingCastAdds: React.Dispatch<React.SetStateAction<PendingCastAdd[]>>;
  setPendingCastRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingRunAdds: React.Dispatch<React.SetStateAction<PendingRun[]>>;
  setPendingRunRemoveIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  setPendingRunEndIds: React.Dispatch<React.SetStateAction<Map<string, string>>>;
}

/**
 * Shared form handlers used by both movie-edit and movie-add flows.
 * Eliminates duplication of updateField, toggleGenre, handleImageUpload,
 * and the 6 remove handlers.
 */
export function createCommonFormHandlers(deps: CommonFormDeps) {
  const {
    setForm,
    setPendingVideoAdds,
    setPendingVideoRemoveIds,
    setPendingPosterAdds,
    setPendingPosterRemoveIds,
    setPendingPlatformAdds,
    setPendingPlatformRemoveIds,
    setPendingPHAdds,
    setPendingPHRemoveIds,
    setPendingCastAdds,
    setPendingCastRemoveIds,
    setPendingRunAdds,
    setPendingRunRemoveIds,
    setPendingRunEndIds,
  } = deps;

  // @contract field must match a key from MovieForm; no runtime validation
  function updateField(field: string, value: string | string[] | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // @sideeffect Uploads image to storage endpoint, then updates form field with returned URL
  // @boundary Uses uploadImage from useImageUpload — delegates to Supabase Storage
  async function handleImageUpload(
    file: File,
    endpoint: string,
    field: 'poster_url' | 'backdrop_url',
    setUploading: (v: boolean) => void,
  ) {
    setUploading(true);
    try {
      const url = await uploadImage(file, endpoint);
      setForm((prev) => ({ ...prev, [field]: url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function toggleGenre(genre: string) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  }

  // @invariant isPending=true means id is a stable _id; isPending=false means a real DB UUID
  function handleVideoRemove(videoId: string, isPending: boolean) {
    if (isPending) {
      // @contract uses stable _id — no index-shift bugs on removal
      setPendingVideoAdds((prev) => prev.filter((v) => v._id !== videoId));
    } else {
      setPendingVideoRemoveIds((prev) => new Set([...prev, videoId]));
    }
  }

  function handlePosterRemove(posterId: string, isPending: boolean) {
    if (isPending) {
      // @contract uses stable _id — no index-shift bugs on removal
      setPendingPosterAdds((prev) => prev.filter((p) => p._id !== posterId));
    } else {
      setPendingPosterRemoveIds((prev) => new Set([...prev, posterId]));
    }
  }

  function handlePlatformRemove(platformId: string, isPending: boolean) {
    if (isPending) {
      setPendingPlatformAdds((prev) => prev.filter((p) => p.platform_id !== platformId));
    } else {
      setPendingPlatformRemoveIds((prev) => new Set([...prev, platformId]));
    }
  }

  function handlePHRemove(phId: string, isPending: boolean) {
    if (isPending) {
      setPendingPHAdds((prev) => prev.filter((p) => p.production_house_id !== phId));
    } else {
      setPendingPHRemoveIds((prev) => new Set([...prev, phId]));
    }
  }

  function handleCastRemove(castId: string, isPending: boolean) {
    if (isPending) {
      // @contract uses stable _id — no index-shift bugs on removal
      setPendingCastAdds((prev) => prev.filter((c) => c._id !== castId));
    } else {
      setPendingCastRemoveIds((prev) => new Set([...prev, castId]));
    }
  }

  // @sync: uses stable _id UUID for removal — no index-shift bugs when removing out-of-order
  // @invariant isPending=true means runId is a stable _id UUID; isPending=false means a real DB UUID
  function handleRunRemove(runId: string, isPending: boolean) {
    if (isPending) {
      // @contract uses stable _id — no index-shift bugs on removal (mirrors cast/video pattern)
      setPendingRunAdds((prev) => prev.filter((r) => r._id !== runId));
    } else {
      setPendingRunRemoveIds((prev) => new Set([...prev, runId]));
    }
  }

  // @sideeffect: queues a run to have its end_date set on save
  function handleRunEnd(runId: string, endDate: string) {
    setPendingRunEndIds((prev) => new Map(prev).set(runId, endDate));
  }

  return {
    updateField,
    handleImageUpload,
    toggleGenre,
    handleVideoRemove,
    handlePosterRemove,
    handlePlatformRemove,
    handlePHRemove,
    handleCastRemove,
    handleRunRemove,
    handleRunEnd,
  };
}
