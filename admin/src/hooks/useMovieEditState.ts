'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { createMovieEditHandlers } from '@/hooks/useMovieEditHandlers';
import { useMovieEditDerived } from '@/hooks/useMovieEditDerived';
import { useMovieEditPendingState } from '@/hooks/useMovieEditPendingState';
import { useMovieEditData } from '@/hooks/useMovieEditData';
import { useMovieEditPendingIds } from '@/hooks/useMovieEditPendingIds';
import { useMovieEditFormSync } from '@/hooks/useMovieEditFormSync';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

export type { MovieForm };
export type {
  PendingVideoAdd,
  PendingPosterAdd,
  PendingPlatformAdd,
  PendingPHAdd,
  PendingAvailabilityAdd,
} from '@/hooks/useMovieEditTypes';

// @contract Orchestrator hook for movie edit page — composes data fetching, state, derived, and handlers
// @coupling Delegates to useMovieEditDerived for visible lists and createMovieEditHandlers for actions
export function useMovieEditState(id: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const data = useMovieEditData(id);
  const {
    movie,
    isLoading,
    isError,
    error: loadError,
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
    availabilityData,
    addMovieAvailability,
    removeMovieAvailability,
  } = data;

  // Upload state
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);

  // Form state — hydrated from server data by useMovieEditFormSync
  const { form, setForm, initialForm, setInitialForm, patchFormFields } = useMovieEditFormSync(
    id,
    movie,
  );

  // Pending changes (deferred to Save)
  const pending = useMovieEditPendingState();

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  useEffect(() => {
    pending.resetPendingState();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    /* v8 ignore start -- saveStatus is set by mocked handlers; timer cleanup is standard React */
    if (saveStatus === 'success') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
    /* v8 ignore stop */
  }, [saveStatus]);

  const derived = useMovieEditDerived({
    id,
    castData,
    videosData,
    postersData,
    moviePlatforms,
    movieProductionHouses,
    availabilityData,
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
    addMovieAvailability,
    removeMovieAvailability,
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

  const { pendingCastIds, pendingVideoIds, pendingAvailabilityIds, pendingRunIds } =
    useMovieEditPendingIds(pending);

  return {
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
      availabilityData,
      theatricalRuns,
      savedMainPosterId: derived.savedMainPosterId,
    },
    isLoading,
    isError,
    loadError,
    movie,
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
    setPendingAvailabilityAdds: pending.setPendingAvailabilityAdds,
    setPendingCastAdds: pending.setPendingCastAdds,
    setPendingRunAdds: pending.setPendingRunAdds,
    setPendingMainPosterId: pending.setPendingMainPosterId,
    setLocalCastOrder: pending.setLocalCastOrder,
    handleVideoRemove: handlers.handleVideoRemove,
    handlePosterRemove: handlers.handlePosterRemove,
    handlePlatformRemove: handlers.handlePlatformRemove,
    handleAvailabilityRemove: handlers.handleAvailabilityRemove,
    handlePHRemove: handlers.handlePHRemove,
    handleCastRemove: handlers.handleCastRemove,
    handleRunRemove: handlers.handleRunRemove,
    handleRunEnd: handlers.handleRunEnd,
    visibleCast: derived.visibleCast,
    visibleVideos: derived.visibleVideos,
    visiblePosters: derived.visiblePosters,
    visiblePlatforms: derived.visiblePlatforms,
    visibleProductionHouses: derived.visibleProductionHouses,
    visibleAvailability: derived.visibleAvailability,
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
    pendingAvailabilityAdds: pending.pendingAvailabilityAdds,
    pendingRunEndIds: pending.pendingRunEndIds,
    pendingCastIds,
    pendingVideoIds,
    pendingAvailabilityIds,
    pendingRunIds,
    isDirty: derived.isDirty,
    patchFormFields,
    isSaving,
    saveStatus,
    handleSubmit: handlers.handleSubmit,
    handleDelete: handlers.handleDelete,
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
