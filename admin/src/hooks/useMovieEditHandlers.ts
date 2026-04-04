'use client';
import type React from 'react';
import type { Movie } from '@/lib/types';
import type { MovieEditHandlerDeps } from '@/hooks/useMovieEditTypes';
import { createCommonFormHandlers } from '@/hooks/createCommonFormHandlers';
import { buildChildMutationPromises } from '@/hooks/useMovieEditSubmitHelpers';
import { validateMovieForm, formatErrors } from '@/lib/movie-validation';

// @coupling Consumes full MovieEditHandlerDeps — tightly coupled to useMovieEditState
// @contract Returns all form handlers including shared ones from createCommonFormHandlers
export function createMovieEditHandlers(deps: MovieEditHandlerDeps) {
  const {
    id,
    form,
    setForm,
    router,
    queryClient,
    movieData,
    pendingPosterAdds,
    pendingMainPosterId,
    postersData,
    updateMovie,
    deleteMovie,
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
      // @contract compute poster_url: check pending adds first, then existing DB posters
      // @edge when promoting an existing DB poster, look it up in postersData to avoid
      //       racing updateMovie (old url) vs setMainPoster (new url) on movies.poster_url
      const pendingMainPoster = pendingMainPosterId
        ? pendingPosterAdds.find((p) => p._id === pendingMainPosterId)
        : pendingPosterAdds.find((p) => p.is_main_poster);
      const existingMainPoster =
        pendingMainPosterId && !pendingMainPoster
          ? postersData.find((p) => p.id === pendingMainPosterId)
          : null;
      const effectivePosterUrl =
        pendingMainPoster?.image_url ?? existingMainPoster?.image_url ?? form.poster_url;

      // @contract: spread all editable + preserved focal point fields into the update payload
      const movieUpdate: Partial<Movie> & { id: string } = {
        id,
        title: form.title,
        poster_url: effectivePosterUrl || null,
        backdrop_url: form.backdrop_url || null,
        release_date: form.release_date || null,
        runtime: form.runtime ? Number(form.runtime) : null,
        genres: form.genres,
        certification: (form.certification || null) as 'U' | 'UA' | 'A' | null,
        synopsis: form.synopsis || null,
        in_theaters: form.in_theaters,
        premiere_date: form.premiere_date || null,
        original_language: form.original_language || null,
        is_featured: form.is_featured,
        tmdb_id: form.tmdb_id ? Number(form.tmdb_id) : null,
        tagline: form.tagline || null,
        backdrop_focus_x: form.backdrop_focus_x,
        backdrop_focus_y: form.backdrop_focus_y,
        poster_focus_x: form.poster_focus_x,
        poster_focus_y: form.poster_focus_y,
        // @invariant Focus coordinates preserved from original movie — not editable in form
        spotlight_focus_x: movieData?.spotlight_focus_x ?? null,
        spotlight_focus_y: movieData?.spotlight_focus_y ?? null,
        detail_focus_x: movieData?.detail_focus_x ?? null,
        detail_focus_y: movieData?.detail_focus_y ?? null,
      };

      const childPromises = await buildChildMutationPromises(deps);
      const promises: Promise<unknown>[] = [
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Query caches stale Movie shape
        updateMovie.mutateAsync(movieUpdate as any),
        ...childPromises,
      ];

      // @contract: allSettled so partial failures don't prevent other operations from completing.
      // @edge: if updateMovie fails but child operations succeed, the movie row has stale data
      // but cast/videos/posters are updated. The admin sees "1 operation(s) failed" and can retry,
      // but the retry re-sends ALL child ops too (idempotent due to upsert semantics on most, but
      // cast/poster adds create duplicates if the previous attempt's add succeeded).
      const results = await Promise.allSettled(promises);
      const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      if (failures.length > 0) {
        const msgs = failures.map((f) => f.reason?.message ?? String(f.reason));
        alert(`${failures.length} operation(s) failed:\n${msgs.join('\n')}`);
        // @edge Don't reset pending state on failure — preserves failed operations for retry
        return;
      }
      // @contract Use functional updater on setForm to read latest state — avoids stale closure race
      //           where useEffect updates form mid-await and setInitialForm({ ...form }) writes back stale data
      // @sideeffect Sets initialForm inside setForm updater to capture the true current form values,
      //             ensuring isDirty becomes false immediately (not after refetch)
      const savedPosterUrl = effectivePosterUrl || form.poster_url;
      resetPendingState();
      setForm((currentForm) => {
        const updated = { ...currentForm, poster_url: savedPosterUrl };
        setInitialForm(updated);
        return updated;
      });
      setSaveStatus('success');
      // @sideeffect: invalidate theater-related queries so navigating to In Theaters shows fresh data
      queryClient.invalidateQueries({ queryKey: ['admin', 'theater-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'upcoming-movies'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'upcoming-rereleases'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'theater-search'] });
      // @sideeffect: movie edits may change dashboard-relevant fields
      queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
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
