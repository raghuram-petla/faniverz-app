'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAdminMovie, useUpdateMovie, useDeleteMovie } from '@/hooks/useAdminMovies';
import {
  useMovieCast,
  useAdminActors,
  useAddCast,
  useRemoveCast,
  useUpdateCastOrder,
} from '@/hooks/useAdminCast';
import {
  useMovieTheatricalRuns,
  useAddTheatricalRun,
  useUpdateTheatricalRun,
  useRemoveTheatricalRun,
} from '@/hooks/useAdminTheatricalRuns';
import { useMovieVideos, useAddVideo, useRemoveVideo } from '@/hooks/useAdminVideos';
import {
  useMoviePosters,
  useAddPoster,
  useRemovePoster,
  useSetMainPoster,
} from '@/hooks/useAdminPosters';
import {
  useMovieProductionHouses,
  useAddMovieProductionHouse,
  useRemoveMovieProductionHouse,
} from '@/hooks/useMovieProductionHouses';
import {
  useAdminProductionHouses,
  useCreateProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import {
  useMoviePlatforms,
  useAddMoviePlatform,
  useRemoveMoviePlatform,
} from '@/hooks/useAdminOtt';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { createMovieEditHandlers } from '@/hooks/useMovieEditHandlers';
import { useMovieEditDerived } from '@/hooks/useMovieEditDerived';
import { useMovieEditPendingState } from '@/hooks/useMovieEditPendingState';
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
  const { data: movie, isLoading } = useAdminMovie(id);
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();

  const { data: castData = [] } = useMovieCast(id);
  const [castSearchQuery, setCastSearchQuery] = useState('');
  const { data: actorsData } = useAdminActors(castSearchQuery.trim());
  const actors = actorsData?.pages.flat() ?? [];
  const addCast = useAddCast();
  const removeCast = useRemoveCast();
  const updateCastOrder = useUpdateCastOrder();

  const { data: theatricalRuns = [] } = useMovieTheatricalRuns(id);
  const addTheatricalRun = useAddTheatricalRun();
  const updateTheatricalRun = useUpdateTheatricalRun();
  const removeTheatricalRun = useRemoveTheatricalRun();

  const { data: videosData = [] } = useMovieVideos(id);
  const addVideo = useAddVideo();
  const removeVideo = useRemoveVideo();

  const { data: postersData = [] } = useMoviePosters(id);
  const addPoster = useAddPoster();
  const removePoster = useRemovePoster();
  const setMainPoster = useSetMainPoster();

  const { data: movieProductionHouses = [] } = useMovieProductionHouses(id);
  const addMovieProductionHouse = useAddMovieProductionHouse();
  const removeMovieProductionHouse = useRemoveMovieProductionHouse();
  const [phSearchQuery, setPHSearchQuery] = useState('');
  const { data: phSearchData } = useAdminProductionHouses(phSearchQuery.trim());
  const phSearchResults = phSearchData?.pages.flat() ?? [];
  const createProductionHouse = useCreateProductionHouse();

  const { data: moviePlatforms = [] } = useMoviePlatforms(id);
  const { data: allPlatforms = [] } = useAdminPlatforms();
  const addMoviePlatform = useAddMoviePlatform();
  const removeMoviePlatform = useRemoveMoviePlatform();

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
    backdrop_focus_x: null,
    backdrop_focus_y: null,
  });

  // Pending changes (deferred to Save)
  const pending = useMovieEditPendingState();

  const [initialForm, setInitialForm] = useState<MovieForm | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

  // @sideeffect Hydrates form state from server data when movie loads or refreshes
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
        backdrop_focus_x: movie.backdrop_focus_x ?? null,
        backdrop_focus_y: movie.backdrop_focus_y ?? null,
      };
      setForm(loaded);
      setInitialForm(loaded);
      pending.resetPendingState();
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
    initialForm,
    pendingCastAdds: pending.pendingCastAdds,
    pendingCastRemoveIds: pending.pendingCastRemoveIds,
    localCastOrder: pending.localCastOrder,
    pendingVideoAdds: pending.pendingVideoAdds,
    pendingVideoRemoveIds: pending.pendingVideoRemoveIds,
    pendingPosterAdds: pending.pendingPosterAdds,
    pendingPosterRemoveIds: pending.pendingPosterRemoveIds,
    pendingMainPosterId: pending.pendingMainPosterId,
    pendingPlatformRemoveIds: pending.pendingPlatformRemoveIds,
    pendingPHRemoveIds: pending.pendingPHRemoveIds,
    pendingRunAdds: pending.pendingRunAdds,
    pendingRunRemoveIds: pending.pendingRunRemoveIds,
    castData,
    videosData,
    postersData,
    moviePlatforms,
    movieProductionHouses,
    theatricalRuns,
    resetPendingState: pending.resetPendingState,
    setPendingCastRemoveIds: pending.setPendingCastRemoveIds,
    setPendingVideoRemoveIds: pending.setPendingVideoRemoveIds,
    setPendingPosterRemoveIds: pending.setPendingPosterRemoveIds,
    setPendingPlatformRemoveIds: pending.setPendingPlatformRemoveIds,
    setPendingPHRemoveIds: pending.setPendingPHRemoveIds,
    setPendingRunRemoveIds: pending.setPendingRunRemoveIds,
    setPendingRunEndIds: pending.setPendingRunEndIds,
    setInitialForm,
    isDirty: derived.isDirty,
    isSaving,
    saveStatus,
    handleSubmit: handlers.handleSubmit,
    handleDelete: handlers.handleDelete,
  };
}
