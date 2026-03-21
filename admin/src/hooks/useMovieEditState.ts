'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { createMovieEditHandlers } from '@/hooks/useMovieEditHandlers';
import { useMovieEditDerived } from '@/hooks/useMovieEditDerived';
import { useMovieEditPendingState } from '@/hooks/useMovieEditPendingState';
import { useMovieEditData } from '@/hooks/useMovieEditData';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

export type { MovieForm };
export type {
  PendingVideoAdd,
  PendingPosterAdd,
  PendingPlatformAdd,
  PendingPHAdd,
} from '@/hooks/useMovieEditTypes';
export type { VideoType } from '@/lib/types';
export type { OTTPlatform, ProductionHouse } from '@shared/types';

// @contract Orchestrator hook for movie edit page — composes data fetching, state, derived, and handlers
// @coupling Delegates to useMovieEditDerived for visible lists and createMovieEditHandlers for actions
export function useMovieEditState(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const data = useMovieEditData(id);
  const {
    movie,
    isLoading,
    updateMovie,
    deleteMovie,
    castData,
    castSearchQuery,
    setCastSearchQuery,
    actors,
    addCast,
    removeCast,
    updateCastOrder,
    theatricalRuns,
    addTheatricalRun,
    updateTheatricalRun,
    removeTheatricalRun,
    videosData,
    addVideo,
    removeVideo,
    postersData,
    addPoster,
    removePoster,
    setMainPoster,
    setMainBackdrop,
    movieProductionHouses,
    addMovieProductionHouse,
    removeMovieProductionHouse,
    phSearchQuery,
    setPHSearchQuery,
    phSearchResults,
    createProductionHouse,
    moviePlatforms,
    allPlatforms,
    addMoviePlatform,
    removeMoviePlatform,
  } = data;

  // Upload state
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);

  // Form state
  const [form, setForm] = useState<MovieForm>({
    title: '',
    poster_url: '',
    backdrop_url: '',
    release_date: '',
    runtime: '',
    genres: [] as string[],
    certification: '' as string,
    synopsis: '',
    trailer_url: '',
    in_theaters: false,
    premiere_date: '',
    original_language: '',
    is_featured: false,
    tmdb_id: '',
    backdrop_focus_x: null,
    backdrop_focus_y: null,
    poster_focus_x: null,
    poster_focus_y: null,
  });

  // Pending changes (deferred to Save)
  const pending = useMovieEditPendingState();

  const [initialForm, setInitialForm] = useState<MovieForm | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  // @sideeffect Resets pending state when the movie id changes (navigation to different movie)
  // @contract Does NOT reset on background refetches — only on id change to preserve unsaved edits
  useEffect(() => {
    pending.resetPendingState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // @sideeffect Hydrates form state from server data when movie loads or refetches
  // @contract Does NOT reset pending state here — that is handled by the [id] effect above
  // @edge Only updates form + initialForm; pending state is intentionally preserved across refetches
  useEffect(() => {
    if (movie) {
      const loaded: MovieForm = {
        title: movie.title,
        poster_url: movie.poster_url ?? '',
        backdrop_url: movie.backdrop_url ?? '',
        release_date: movie.release_date ?? '',
        runtime: movie.runtime?.toString() ?? '',
        genres: movie.genres ?? [],
        certification: movie.certification ?? '',
        synopsis: movie.synopsis ?? '',
        trailer_url: movie.trailer_url ?? '',
        in_theaters: movie.in_theaters,
        premiere_date: movie.premiere_date ?? '',
        original_language: movie.original_language ?? '',
        is_featured: movie.is_featured,
        tmdb_id: movie.tmdb_id?.toString() ?? '',
        backdrop_focus_x: movie.backdrop_focus_x ?? null,
        backdrop_focus_y: movie.backdrop_focus_y ?? null,
        poster_focus_x: movie.poster_focus_x ?? null,
        poster_focus_y: movie.poster_focus_y ?? null,
      };
      setForm(loaded);
      setInitialForm(loaded);
    }
  }, [movie]);
  useEffect(() => {
    if (saveStatus === 'success') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  const derived = useMovieEditDerived({
    id,
    castData,
    videosData,
    postersData,
    moviePlatforms,
    movieProductionHouses,
    theatricalRuns,
    form,
    initialForm,
    ...pending,
  });

  useUnsavedChangesWarning(derived.isDirty);

  const handlers = createMovieEditHandlers({
    id,
    form,
    setForm,
    router,
    queryClient,
    // @nullable movieData — null while movie is loading; handlers guard against this
    movieData: movie
      ? {
          spotlight_focus_x: movie.spotlight_focus_x ?? null,
          spotlight_focus_y: movie.spotlight_focus_y ?? null,
          detail_focus_x: movie.detail_focus_x ?? null,
          detail_focus_y: movie.detail_focus_y ?? null,
        }
      : null,
    ...pending,
    postersData,
    updateMovie,
    deleteMovie,
    addCast,
    removeCast,
    updateCastOrder,
    addVideo,
    removeVideo,
    addPoster,
    removePoster,
    setMainPoster,
    setMainBackdrop,
    addMoviePlatform,
    removeMoviePlatform,
    addMovieProductionHouse,
    removeMovieProductionHouse,
    addTheatricalRun,
    updateTheatricalRun,
    removeTheatricalRun,
    setInitialForm,
    setIsSaving,
    setSaveStatus,
    setUploadingPoster,
    setUploadingBackdrop,
  });

  return {
    // @contract Pre-built params for useMovieEditChanges — avoids 40-line prop spread in edit page
    changesParams: {
      form,
      initialForm,
      setForm,
      setInitialForm,
      ...pending,
      castData,
      videosData,
      postersData,
      moviePlatforms,
      movieProductionHouses,
      theatricalRuns,
      savedMainPosterId: derived.savedMainPosterId,
    },
    isLoading,
    form,
    setForm,
    updateField: handlers.updateField,
    toggleGenre: handlers.toggleGenre,
    uploadingPoster,
    setUploadingPoster,
    uploadingBackdrop,
    setUploadingBackdrop,
    handleImageUpload: handlers.handleImageUpload,
    setPendingVideoAdds: pending.setPendingVideoAdds,
    setPendingPosterAdds: pending.setPendingPosterAdds,
    setPendingPlatformAdds: pending.setPendingPlatformAdds,
    setPendingPHAdds: pending.setPendingPHAdds,
    setPendingCastAdds: pending.setPendingCastAdds,
    setPendingRunAdds: pending.setPendingRunAdds,
    setPendingMainPosterId: pending.setPendingMainPosterId,
    setLocalCastOrder: pending.setLocalCastOrder,
    handleVideoRemove: handlers.handleVideoRemove,
    handlePosterRemove: handlers.handlePosterRemove,
    handlePlatformRemove: handlers.handlePlatformRemove,
    handlePHRemove: handlers.handlePHRemove,
    handleCastRemove: handlers.handleCastRemove,
    handleRunRemove: handlers.handleRunRemove,
    handleRunEnd: handlers.handleRunEnd,
    visibleCast: derived.visibleCast,
    visibleVideos: derived.visibleVideos,
    visiblePosters: derived.visiblePosters,
    visiblePlatforms: derived.visiblePlatforms,
    visibleProductionHouses: derived.visibleProductionHouses,
    visibleRuns: derived.visibleRuns,
    savedMainPosterId: derived.savedMainPosterId,
    actors,
    castSearchQuery,
    setCastSearchQuery,
    allPlatforms,
    phSearchResults,
    phSearchQuery,
    setPHSearchQuery,
    createProductionHouse,
    pendingPlatformAdds: pending.pendingPlatformAdds,
    pendingPHAdds: pending.pendingPHAdds,
    pendingRunEndIds: pending.pendingRunEndIds,
    isDirty: derived.isDirty,
    isSaving,
    saveStatus,
    handleSubmit: handlers.handleSubmit,
    handleDelete: handlers.handleDelete,
    // @contract deferred selection — updates form state + pending ID; persists on Save
    handleSelectMainPoster: (imageId: string) => {
      const img = derived.visiblePosters.find((p) => p.id === imageId);
      if (img) setForm((f) => ({ ...f, poster_url: img.image_url }));
      pending.setPendingMainPosterId(imageId);
    },
    handleSelectMainBackdrop: (imageId: string) => {
      const img = derived.visiblePosters.find((p) => p.id === imageId);
      if (img) setForm((f) => ({ ...f, backdrop_url: img.image_url }));
    },
  };
}
