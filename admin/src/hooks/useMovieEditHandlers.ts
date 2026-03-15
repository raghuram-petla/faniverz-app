'use client';
import type React from 'react';
import type { MovieEditHandlerDeps } from '@/hooks/useMovieEditTypes';
import { createCommonFormHandlers } from '@/hooks/createCommonFormHandlers';
import { validateMovieForm, formatErrors } from '@/lib/movie-validation';

// @coupling Consumes full MovieEditHandlerDeps — tightly coupled to useMovieEditState
// @contract Returns all form handlers including shared ones from createCommonFormHandlers
export function createMovieEditHandlers(deps: MovieEditHandlerDeps) {
  const {
    id,
    form,
    router,
    queryClient,
    movieData,
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
    pendingRunEndIds,
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
    resetPendingState,
    setInitialForm,
    setIsSaving,
    setSaveStatus,
    setUploadingPoster,
    setUploadingBackdrop,
  } = deps;

  // Shared form handlers (updateField, toggleGenre, handleImageUpload, 6 remove handlers)
  const common = createCommonFormHandlers(deps);

  // @sideeffect Fires all pending mutations (movie update + child adds/removes) via Promise.all
  // @edge All mutations fire concurrently — partial failure leaves DB in inconsistent state
  // @assumes Pending IDs starting with 'pending-' are never sent as removals
  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();

    // @boundary: validate form before persisting — block save on validation errors
    const validationErrors = validateMovieForm(form);
    if (validationErrors.length > 0) {
      alert(`Please fix the following errors:\n${formatErrors(validationErrors)}`);
      return;
    }

    setIsSaving(true);
    try {
      const promises: Promise<unknown>[] = [
        updateMovie.mutateAsync({
          id,
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
          premiere_date: form.premiere_date || null,
          original_language: form.original_language || null,
          is_featured: form.is_featured,
          backdrop_focus_x: form.backdrop_focus_x,
          backdrop_focus_y: form.backdrop_focus_y,
          // @invariant Focus coordinates preserved from original movie — not editable in form
          spotlight_focus_x: movieData?.spotlight_focus_x ?? null,
          spotlight_focus_y: movieData?.spotlight_focus_y ?? null,
          detail_focus_x: movieData?.detail_focus_x ?? null,
          detail_focus_y: movieData?.detail_focus_y ?? null,
        }),
      ];

      // @invariant Only server-persisted cast IDs get order updates; pending IDs are excluded
      if (localCastOrder) {
        const updates: { id: string; display_order: number }[] = [];
        for (let idx = 0; idx < localCastOrder.length; idx++) {
          const cid = localCastOrder[idx];
          if (!cid.startsWith('pending-')) {
            updates.push({ id: cid, display_order: idx });
          }
        }
        if (updates.length > 0) {
          promises.push(updateCastOrder.mutateAsync({ movieId: id, items: updates }));
        }
      }
      for (let i = 0; i < pendingCastAdds.length; i++) {
        const { _actor, ...c } = pendingCastAdds[i];
        void _actor;
        let displayOrder = c.display_order;
        if (localCastOrder) {
          const pos = localCastOrder.indexOf(`pending-cast-${i}`);
          if (pos !== -1) displayOrder = pos;
        }
        promises.push(addCast.mutateAsync({ movie_id: id, ...c, display_order: displayOrder }));
      }
      for (const castId of pendingCastRemoveIds) {
        promises.push(removeCast.mutateAsync({ id: castId, movieId: id }));
      }
      for (const v of pendingVideoAdds) {
        promises.push(addVideo.mutateAsync({ movie_id: id, ...v }));
      }
      for (const videoId of pendingVideoRemoveIds) {
        promises.push(removeVideo.mutateAsync({ id: videoId, movieId: id }));
      }
      for (const p of pendingPosterAdds) {
        promises.push(addPoster.mutateAsync({ movie_id: id, ...p }));
      }
      for (const posterId of pendingPosterRemoveIds) {
        promises.push(removePoster.mutateAsync({ id: posterId, movieId: id }));
      }
      // @edge Main poster can only be set on existing (server) posters — pending posters' is_main is set on add
      if (pendingMainPosterId && !pendingMainPosterId.startsWith('pending-')) {
        promises.push(setMainPoster.mutateAsync({ id: pendingMainPosterId, movieId: id }));
      }
      for (const p of pendingPlatformAdds) {
        promises.push(
          addMoviePlatform.mutateAsync({
            movie_id: id,
            platform_id: p.platform_id,
            available_from: p.available_from,
          }),
        );
      }
      for (const platformId of pendingPlatformRemoveIds) {
        promises.push(removeMoviePlatform.mutateAsync({ movieId: id, platformId }));
      }
      for (const ph of pendingPHAdds) {
        promises.push(
          addMovieProductionHouse.mutateAsync({
            movieId: id,
            productionHouseId: ph.production_house_id,
          }),
        );
      }
      for (const phId of pendingPHRemoveIds) {
        promises.push(
          removeMovieProductionHouse.mutateAsync({ movieId: id, productionHouseId: phId }),
        );
      }
      for (const r of pendingRunAdds) {
        promises.push(
          addTheatricalRun.mutateAsync({
            movie_id: id,
            release_date: r.release_date,
            label: r.label,
          }),
        );
      }
      for (const runId of pendingRunRemoveIds) {
        promises.push(removeTheatricalRun.mutateAsync({ id: runId, movieId: id }));
      }
      for (const [runId, endDate] of pendingRunEndIds) {
        promises.push(
          updateTheatricalRun.mutateAsync({ id: runId, movieId: id, end_date: endDate }),
        );
      }

      // @contract: allSettled so partial failures don't prevent other operations from completing
      const results = await Promise.allSettled(promises);
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failures.length > 0) {
        const msgs = failures.map((f) => f.reason?.message ?? String(f.reason));
        alert(`${failures.length} operation(s) failed:\n${msgs.join('\n')}`);
      }
      resetPendingState();
      setInitialForm({ ...form });
      setSaveStatus('success');
      // @sideeffect: invalidate theater-related queries so navigating to In Theaters shows fresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'theater-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'upcoming-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'upcoming-rereleases'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'theater-search'] });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }

  // @sideeffect Deletes movie and redirects to /movies — cascades handled by DB FK constraints
  // @sideeffect Also invalidates theater + dashboard caches since the deleted movie may be in theaters
  async function handleDelete() {
    if (confirm('Are you sure? This cannot be undone.')) {
      try {
        await deleteMovie.mutateAsync(id);
        queryClient.invalidateQueries({ queryKey: ['admin', 'theater-movies'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'upcoming-movies'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'upcoming-rereleases'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'theater-search'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'platform-movie-ids'] });
        queryClient.invalidateQueries({ queryKey: ['admin', 'ott'] });
        router.push('/movies');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        alert(`Delete failed: ${msg}`);
      }
    }
  }

  return {
    ...common,
    handleSubmit,
    handleDelete,
    setUploadingPoster,
    setUploadingBackdrop,
  };
}
