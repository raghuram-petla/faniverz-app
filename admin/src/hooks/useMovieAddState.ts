'use client';
import { useState, useMemo } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
import { useCreateMovie } from '@/hooks/useAdminMovies';
import { validateMovieForm, formatErrors } from '@/lib/movie-validation';
import { useAdminActors, useAddCast } from '@/hooks/useAdminCast';
import { useAddTheatricalRun } from '@/hooks/useAdminTheatricalRuns';
import { useAddVideo } from '@/hooks/useAdminVideos';
import { useAddPoster } from '@/hooks/useAdminPosters';
import { useAddMovieProductionHouse } from '@/hooks/useMovieProductionHouses';
import {
  useAdminProductionHouses,
  useCreateProductionHouse,
} from '@/hooks/useAdminProductionHouses';
import { useAddMoviePlatform } from '@/hooks/useAdminOtt';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useMovieEditDerived } from '@/hooks/useMovieEditDerived';
import { useMovieEditPendingState } from '@/hooks/useMovieEditPendingState';
import { createCommonFormHandlers } from '@/hooks/createCommonFormHandlers';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

const INITIAL_FORM: MovieForm = {
  title: '',
  poster_url: '',
  backdrop_url: '',
  release_date: '',
  runtime: '',
  genres: [],
  certification: '',
  synopsis: '',
  trailer_url: '',
  in_theaters: false,
  premiere_date: '',
  original_language: 'te',
  is_featured: false,
  tmdb_id: '',
  tagline: '',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
};

// @contract Returns a self-contained state bundle for the movie-add form
// @coupling Shares form handlers with movie-edit via createCommonFormHandlers
// @coupling Uses useMovieEditDerived with id='new' to compute visible lists and isDirty
export function useMovieAddState() {
  const router = useRouter();

  // Reference data
  const [castSearchQuery, setCastSearchQuery] = useState('');
  const { data: actorsData } = useAdminActors(castSearchQuery);
  const actors = actorsData?.pages.flat() ?? [];
  const { data: allPlatforms = [] } = useAdminPlatforms();
  const [phSearchQuery, setPHSearchQuery] = useState('');
  const { data: phSearchData } = useAdminProductionHouses(phSearchQuery.trim());
  const phSearchResults = phSearchData?.pages.flat() ?? [];
  const createProductionHouse = useCreateProductionHouse();

  // Mutations
  const createMovie = useCreateMovie();
  const addCast = useAddCast();
  const addVideo = useAddVideo();
  const addPoster = useAddPoster();
  const addMoviePlatform = useAddMoviePlatform();
  const addMovieProductionHouse = useAddMovieProductionHouse();
  const addTheatricalRun = useAddTheatricalRun();

  // Form state
  const [form, setForm] = useState<MovieForm>(INITIAL_FORM);
  const [uploadingPoster, setUploadingPoster] = useState(false);
  const [uploadingBackdrop, setUploadingBackdrop] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Pending state
  const pending = useMovieEditPendingState();

  // Derived visible lists
  const derived = useMovieEditDerived({
    id: 'new',
    castData: [],
    videosData: [],
    postersData: [],
    moviePlatforms: [],
    movieProductionHouses: [],
    theatricalRuns: [],
    form,
    initialForm: INITIAL_FORM,
    ...pending,
  });

  useUnsavedChangesWarning(derived.isDirty);

  // ── Shared handlers (updateField, toggleGenre, handleImageUpload, 6 remove handlers) ──
  const common = createCommonFormHandlers({ setForm, ...pending });

  // @sideeffect Two-phase submit: Phase 1 creates movie, Phase 2 adds all child relations
  // @edge If Phase 1 succeeds but Phase 2 fails, movie exists without its relations
  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    const validationErrors = validateMovieForm(form);
    if (validationErrors.length > 0) {
      alert(`Please fix the following errors:\n${formatErrors(validationErrors)}`);
      return;
    }
    setIsSaving(true);
    try {
      // @contract sync poster_url from the main poster in the gallery
      const mainPendingPoster = pending.pendingPosterAdds.find((p) =>
        pending.pendingMainPosterId ? p._id === pending.pendingMainPosterId : p.is_main_poster,
      );
      const effectivePosterUrl = mainPendingPoster ? mainPendingPoster.image_url : form.poster_url;

      const movie = await createMovie.mutateAsync({
        title: form.title,
        poster_url: effectivePosterUrl || null,
        backdrop_url: form.backdrop_url || null,
        release_date: form.release_date || null,
        runtime: form.runtime ? Number(form.runtime) : null,
        genres: form.genres,
        certification: (form.certification || null) as 'U' | 'UA' | 'A' | null,
        synopsis: form.synopsis || null,
        trailer_url: form.trailer_url || null,
        in_theaters: form.in_theaters,
        premiere_date: form.premiere_date || null,
        original_language: form.original_language || null,
        is_featured: form.is_featured,
        tmdb_id: form.tmdb_id ? Number(form.tmdb_id) : null,
        backdrop_focus_x: form.backdrop_focus_x,
        backdrop_focus_y: form.backdrop_focus_y,
        spotlight_focus_x: null,
        spotlight_focus_y: null,
        detail_focus_x: null,
        detail_focus_y: null,
      } as Record<string, unknown>);
      const movieId = movie.id;

      // @assumes movieId is a valid UUID returned from insert; used as FK for all child inserts
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < pending.pendingCastAdds.length; i++) {
        const { _actor, _id, ...c } = pending.pendingCastAdds[i];
        void _actor;
        let displayOrder = c.display_order;
        if (pending.localCastOrder) {
          // @sync: uses stable _id instead of index-based 'pending-cast-N'
          const pos = pending.localCastOrder.indexOf(_id);
          if (pos !== -1) displayOrder = pos;
        }
        promises.push(
          addCast.mutateAsync({ movie_id: movieId, ...c, display_order: displayOrder }),
        );
      }
      for (const v of pending.pendingVideoAdds) {
        const { _id, ...videoData } = v;
        void _id;
        promises.push(addVideo.mutateAsync({ movie_id: movieId, ...videoData }));
      }
      // @contract apply pendingMainPosterId override; uses stable _id for matching
      for (const p of pending.pendingPosterAdds) {
        const isMain = pending.pendingMainPosterId
          ? p._id === pending.pendingMainPosterId
          : p.is_main_poster;
        const { _id, ...posterData } = p;
        void _id;
        promises.push(
          addPoster.mutateAsync({ movie_id: movieId, ...posterData, is_main_poster: isMain }),
        );
      }
      for (const p of pending.pendingPlatformAdds) {
        promises.push(
          addMoviePlatform.mutateAsync({
            movie_id: movieId,
            platform_id: p.platform_id,
            available_from: p.available_from,
            streaming_url: p.streaming_url,
          }),
        );
      }
      for (const ph of pending.pendingPHAdds) {
        promises.push(
          addMovieProductionHouse.mutateAsync({
            movieId,
            productionHouseId: ph.production_house_id,
          }),
        );
      }
      for (const r of pending.pendingRunAdds) {
        promises.push(
          addTheatricalRun.mutateAsync({
            movie_id: movieId,
            release_date: r.release_date,
            label: r.label,
          }),
        );
      }
      await Promise.all(promises);
      router.push(`/movies/${movieId}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Failed to create movie: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }

  // @sync: memoized Sets of pending _ids — stable references prevent unnecessary re-renders
  // when CastSection/VideosSection/TheatricalRunsSection receive these as props
  const pendingCastIds = useMemo(
    () => new Set(pending.pendingCastAdds.map((c) => c._id)),
    [pending.pendingCastAdds],
  );
  const pendingVideoIds = useMemo(
    () => new Set(pending.pendingVideoAdds.map((v) => v._id)),
    [pending.pendingVideoAdds],
  );
  // @sync: mirrors pendingCastIds/pendingVideoIds pattern — Set of stable _id UUIDs for pending runs
  const pendingRunIds = useMemo(
    () => new Set(pending.pendingRunAdds.map((r) => r._id)),
    [pending.pendingRunAdds],
  );

  return {
    form,
    setForm,
    ...common,
    uploadingPoster,
    setUploadingPoster,
    uploadingBackdrop,
    setUploadingBackdrop,
    setPendingVideoAdds: pending.setPendingVideoAdds,
    setPendingPosterAdds: pending.setPendingPosterAdds,
    setPendingPlatformAdds: pending.setPendingPlatformAdds,
    setPendingPHAdds: pending.setPendingPHAdds,
    setPendingCastAdds: pending.setPendingCastAdds,
    setPendingRunAdds: pending.setPendingRunAdds,
    pendingMainPosterId: pending.pendingMainPosterId,
    setPendingMainPosterId: pending.setPendingMainPosterId,
    savedMainPosterId: derived.savedMainPosterId,
    setLocalCastOrder: pending.setLocalCastOrder,
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
    pendingCastIds,
    pendingVideoIds,
    pendingRunIds,
    isDirty: derived.isDirty,
    isSaving,
    handleSubmit,
  };
}
