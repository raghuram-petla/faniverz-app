'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import { useAdminProductionHouses } from '@/hooks/useAdminProductionHouses';
import {
  useMoviePlatforms,
  useAddMoviePlatform,
  useRemoveMoviePlatform,
} from '@/hooks/useAdminOtt';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { createMovieEditHandlers } from '@/hooks/useMovieEditHandlers';
import { useMovieEditDerived } from '@/hooks/useMovieEditDerived';
import type {
  MovieForm,
  PendingVideoAdd,
  PendingPosterAdd,
  PendingPlatformAdd,
  PendingPHAdd,
} from '@/hooks/useMovieEditTypes';
import type { VideoType } from '@/lib/types';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type { PendingRun } from '@/components/movie-edit/TheatricalRunsSection';
import type { OTTPlatform, ProductionHouse } from '@shared/types';

export type { MovieForm };

export function useMovieEditState(id: string) {
  const router = useRouter();
  const { data: movie, isLoading } = useAdminMovie(id);
  const updateMovie = useUpdateMovie();
  const deleteMovie = useDeleteMovie();

  const { data: castData = [] } = useMovieCast(id);
  const [castSearchQuery, setCastSearchQuery] = useState('');
  const { data: actorsData } = useAdminActors(castSearchQuery);
  const actors = actorsData?.pages.flat() ?? [];
  const addCast = useAddCast();
  const removeCast = useRemoveCast();
  const updateCastOrder = useUpdateCastOrder();

  const { data: theatricalRuns = [] } = useMovieTheatricalRuns(id);
  const addTheatricalRun = useAddTheatricalRun();
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
  const { data: allProductionHousesData } = useAdminProductionHouses();
  const allProductionHouses = allProductionHousesData?.pages.flat() ?? [];

  const { data: moviePlatforms = [] } = useMoviePlatforms(id);
  const { data: allPlatforms = [] } = useAdminPlatforms();
  const addMoviePlatform = useAddMoviePlatform();
  const removeMoviePlatform = useRemoveMoviePlatform();

  // Upload state
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const posterInputRef = useRef<HTMLInputElement>(null);
  const backdropInputRef = useRef<HTMLInputElement>(null);

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
    director: '',
    trailer_url: '',
    in_theaters: false,
    backdrop_focus_x: null,
    backdrop_focus_y: null,
    spotlight_focus_x: null,
    spotlight_focus_y: null,
    detail_focus_x: null,
    detail_focus_y: null,
  });

  // ─── Pending changes (deferred to Save) ───
  const [pendingCastAdds, setPendingCastAdds] = useState<PendingCastAdd[]>([]);
  const [pendingCastRemoveIds, setPendingCastRemoveIds] = useState<Set<string>>(new Set());
  const [localCastOrder, setLocalCastOrder] = useState<string[] | null>(null);

  const [pendingVideoAdds, setPendingVideoAdds] = useState<PendingVideoAdd[]>([]);
  const [pendingVideoRemoveIds, setPendingVideoRemoveIds] = useState<Set<string>>(new Set());

  const [pendingPosterAdds, setPendingPosterAdds] = useState<PendingPosterAdd[]>([]);
  const [pendingPosterRemoveIds, setPendingPosterRemoveIds] = useState<Set<string>>(new Set());
  const [pendingMainPosterId, setPendingMainPosterId] = useState<string | null>(null);

  const [pendingPlatformAdds, setPendingPlatformAdds] = useState<PendingPlatformAdd[]>([]);
  const [pendingPlatformRemoveIds, setPendingPlatformRemoveIds] = useState<Set<string>>(new Set());

  const [pendingPHAdds, setPendingPHAdds] = useState<PendingPHAdd[]>([]);
  const [pendingPHRemoveIds, setPendingPHRemoveIds] = useState<Set<string>>(new Set());

  const [pendingRunAdds, setPendingRunAdds] = useState<PendingRun[]>([]);
  const [pendingRunRemoveIds, setPendingRunRemoveIds] = useState<Set<string>>(new Set());

  // ─── Track initial form state for dirty detection ───
  const [initialForm, setInitialForm] = useState<MovieForm | null>(null);

  // ─── Save & Delete state ───
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success'>('idle');

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
  }

  // ─── Data hydration effect ───
  useEffect(() => {
    if (movie) {
      const loaded: MovieForm = {
        title: movie.title,
        poster_url: movie.poster_url ?? '',
        backdrop_url: movie.backdrop_url ?? '',
        release_date: movie.release_date,
        runtime: movie.runtime?.toString() ?? '',
        genres: movie.genres ?? [],
        certification: movie.certification ?? '',
        synopsis: movie.synopsis ?? '',
        director: movie.director ?? '',
        trailer_url: movie.trailer_url ?? '',
        in_theaters: movie.in_theaters,
        backdrop_focus_x: movie.backdrop_focus_x ?? null,
        backdrop_focus_y: movie.backdrop_focus_y ?? null,
        spotlight_focus_x: movie.spotlight_focus_x ?? null,
        spotlight_focus_y: movie.spotlight_focus_y ?? null,
        detail_focus_x: movie.detail_focus_x ?? null,
        detail_focus_y: movie.detail_focus_y ?? null,
      };
      setForm(loaded);
      setInitialForm(loaded);
      resetPendingState();
    }
  }, [movie]);

  // ─── Save status reset timer ───
  useEffect(() => {
    if (saveStatus === 'success') {
      const timer = setTimeout(() => setSaveStatus('idle'), 3000);
      return () => clearTimeout(timer);
    }
  }, [saveStatus]);

  // ─── Derived visible lists + isDirty ───
  const derived = useMovieEditDerived({
    id,
    castData,
    pendingCastAdds,
    pendingCastRemoveIds,
    localCastOrder,
    videosData,
    pendingVideoAdds,
    pendingVideoRemoveIds,
    postersData,
    pendingPosterAdds,
    pendingPosterRemoveIds,
    pendingMainPosterId,
    moviePlatforms,
    pendingPlatformAdds,
    pendingPlatformRemoveIds,
    movieProductionHouses,
    pendingPHAdds,
    pendingPHRemoveIds,
    theatricalRuns,
    pendingRunAdds,
    pendingRunRemoveIds,
    form,
    initialForm,
  });

  // ─── Warn on unsaved navigation ───
  useUnsavedChangesWarning(derived.isDirty);

  // ─── Compose handlers ───
  const handlers = createMovieEditHandlers({
    id,
    form,
    setForm,
    router,
    setPendingCastAdds,
    setPendingCastRemoveIds,
    setPendingVideoAdds,
    setPendingVideoRemoveIds,
    setPendingPosterAdds,
    setPendingPosterRemoveIds,
    setPendingPlatformAdds,
    setPendingPlatformRemoveIds,
    setPendingPHAdds,
    setPendingPHRemoveIds,
    setPendingRunAdds,
    setPendingRunRemoveIds,
    localCastOrder,
    pendingCastAdds,
    pendingCastRemoveIds,
    pendingVideoAdds,
    pendingVideoRemoveIds,
    pendingPosterAdds,
    pendingPosterRemoveIds,
    pendingMainPosterId,
    pendingPlatformAdds,
    pendingPlatformRemoveIds,
    pendingPHAdds,
    pendingPHRemoveIds,
    pendingRunAdds,
    pendingRunRemoveIds,
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
    removeTheatricalRun,
    resetPendingState,
    setInitialForm,
    setIsSaving,
    setSaveStatus,
    setUploadingPoster,
    setUploadingBackdrop,
  });

  return {
    // Loading
    isLoading,
    // Form
    form,
    setForm,
    updateField: handlers.updateField,
    toggleGenre: handlers.toggleGenre,
    // Upload
    uploadingPoster,
    setUploadingPoster,
    uploadingBackdrop,
    setUploadingBackdrop,
    posterInputRef,
    backdropInputRef,
    handleImageUpload: handlers.handleImageUpload,
    handleBackdropClick: handlers.handleBackdropClick,
    // Pending state setters
    setPendingVideoAdds,
    setPendingPosterAdds,
    setPendingPlatformAdds,
    setPendingPHAdds,
    setPendingCastAdds,
    setPendingRunAdds,
    setPendingMainPosterId,
    setLocalCastOrder,
    // Remove handlers
    handleVideoRemove: handlers.handleVideoRemove,
    handlePosterRemove: handlers.handlePosterRemove,
    handlePlatformRemove: handlers.handlePlatformRemove,
    handlePHRemove: handlers.handlePHRemove,
    handleCastRemove: handlers.handleCastRemove,
    handleRunRemove: handlers.handleRunRemove,
    // Visible (derived) lists
    visibleCast: derived.visibleCast,
    visibleVideos: derived.visibleVideos,
    visiblePosters: derived.visiblePosters,
    visiblePlatforms: derived.visiblePlatforms,
    visibleProductionHouses: derived.visibleProductionHouses,
    visibleRuns: derived.visibleRuns,
    // Cast search
    actors,
    castSearchQuery,
    setCastSearchQuery,
    // Platform / PH data
    allPlatforms,
    allProductionHouses,
    // Pending adds (needed for section components)
    pendingPlatformAdds,
    pendingPHAdds,
    // Save/delete
    isDirty: derived.isDirty,
    isSaving,
    saveStatus,
    handleSubmit: handlers.handleSubmit,
    handleDelete: handlers.handleDelete,
  };
}

// ─── Re-export pending add types needed by consumers ───
export type { PendingVideoAdd, PendingPosterAdd, PendingPlatformAdd, PendingPHAdd };
// Kept for backwards compat – VideoType is used by consumers of this hook
export type { VideoType };
export type { OTTPlatform, ProductionHouse };
