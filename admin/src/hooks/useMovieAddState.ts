'use client';
import { useState, useRef } from 'react';
import type React from 'react';
import { useRouter } from 'next/navigation';
import { useCreateMovie } from '@/hooks/useAdminMovies';
import { useAdminActors, useAddCast } from '@/hooks/useAdminCast';
import { useAddTheatricalRun } from '@/hooks/useAdminTheatricalRuns';
import { useAddVideo } from '@/hooks/useAdminVideos';
import { useAddPoster } from '@/hooks/useAdminPosters';
import { useAddMovieProductionHouse } from '@/hooks/useMovieProductionHouses';
import { useAdminProductionHouses } from '@/hooks/useAdminProductionHouses';
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
  director: '',
  original_language: '',
  is_featured: false,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
};

export function useMovieAddState() {
  const router = useRouter();

  // Reference data
  const [castSearchQuery, setCastSearchQuery] = useState('');
  const { data: actorsData } = useAdminActors(castSearchQuery);
  const actors = actorsData?.pages.flat() ?? [];
  const { data: allPlatforms = [] } = useAdminPlatforms();
  const { data: allProductionHousesData } = useAdminProductionHouses();
  const allProductionHouses = allProductionHousesData?.pages.flat() ?? [];

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
  const posterInputRef = useRef<HTMLInputElement>(null);
  const backdropInputRef = useRef<HTMLInputElement>(null);
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

  // ── Two-phase submit ──
  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!form.title.trim()) {
      alert('Title is required');
      return;
    }
    setIsSaving(true);
    try {
      const movie = await createMovie.mutateAsync({
        title: form.title,
        poster_url: form.poster_url || null,
        backdrop_url: form.backdrop_url || null,
        release_date: form.release_date || null,
        runtime: form.runtime ? Number(form.runtime) : null,
        genres: form.genres,
        certification: (form.certification || null) as 'U' | 'UA' | 'A' | null,
        synopsis: form.synopsis || null,
        trailer_url: form.trailer_url || null,
        in_theaters: form.in_theaters,
        director: form.director || null,
        original_language: form.original_language || null,
        is_featured: form.is_featured,
        backdrop_focus_x: form.backdrop_focus_x,
        backdrop_focus_y: form.backdrop_focus_y,
        spotlight_focus_x: null,
        spotlight_focus_y: null,
        detail_focus_x: null,
        detail_focus_y: null,
      } as Record<string, unknown>);
      const movieId = movie.id;

      // Phase 2: add all pending relations
      const promises: Promise<unknown>[] = [];
      for (let i = 0; i < pending.pendingCastAdds.length; i++) {
        const { _actor, ...c } = pending.pendingCastAdds[i];
        void _actor;
        let displayOrder = c.display_order;
        if (pending.localCastOrder) {
          const pos = pending.localCastOrder.indexOf(`pending-cast-${i}`);
          if (pos !== -1) displayOrder = pos;
        }
        promises.push(
          addCast.mutateAsync({ movie_id: movieId, ...c, display_order: displayOrder }),
        );
      }
      for (const v of pending.pendingVideoAdds) {
        promises.push(addVideo.mutateAsync({ movie_id: movieId, ...v }));
      }
      for (let i = 0; i < pending.pendingPosterAdds.length; i++) {
        const p = pending.pendingPosterAdds[i];
        const isMain = pending.pendingMainPosterId
          ? pending.pendingMainPosterId === `pending-poster-${i}`
          : p.is_main;
        promises.push(addPoster.mutateAsync({ movie_id: movieId, ...p, is_main: isMain }));
      }
      for (const p of pending.pendingPlatformAdds) {
        promises.push(
          addMoviePlatform.mutateAsync({
            movie_id: movieId,
            platform_id: p.platform_id,
            available_from: p.available_from,
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

  return {
    form,
    setForm,
    ...common,
    uploadingPoster,
    setUploadingPoster,
    uploadingBackdrop,
    setUploadingBackdrop,
    posterInputRef,
    backdropInputRef,
    setPendingVideoAdds: pending.setPendingVideoAdds,
    setPendingPosterAdds: pending.setPendingPosterAdds,
    setPendingPlatformAdds: pending.setPendingPlatformAdds,
    setPendingPHAdds: pending.setPendingPHAdds,
    setPendingCastAdds: pending.setPendingCastAdds,
    setPendingRunAdds: pending.setPendingRunAdds,
    setPendingMainPosterId: pending.setPendingMainPosterId,
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
    allProductionHouses,
    pendingPlatformAdds: pending.pendingPlatformAdds,
    pendingPHAdds: pending.pendingPHAdds,
    isDirty: derived.isDirty,
    isSaving,
    handleSubmit,
  };
}
