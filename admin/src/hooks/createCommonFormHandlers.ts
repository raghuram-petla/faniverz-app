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
  } = deps;

  function updateField(field: string, value: string | string[] | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

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

  function handleVideoRemove(videoId: string, isPending: boolean) {
    if (isPending) {
      const idx = Number(videoId.replace('pending-video-', ''));
      setPendingVideoAdds((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setPendingVideoRemoveIds((prev) => new Set([...prev, videoId]));
    }
  }

  function handlePosterRemove(posterId: string, isPending: boolean) {
    if (isPending) {
      const idx = Number(posterId.replace('pending-poster-', ''));
      setPendingPosterAdds((prev) => prev.filter((_, i) => i !== idx));
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
      const idx = Number(castId.replace('pending-cast-', ''));
      setPendingCastAdds((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setPendingCastRemoveIds((prev) => new Set([...prev, castId]));
    }
  }

  function handleRunRemove(runId: string, isPending: boolean) {
    if (isPending) {
      const idx = Number(runId.replace('pending-run-', ''));
      setPendingRunAdds((prev) => prev.filter((_, i) => i !== idx));
    } else {
      setPendingRunRemoveIds((prev) => new Set([...prev, runId]));
    }
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
  };
}
