'use client';
import type React from 'react';
import { uploadImage } from '@/hooks/useImageUpload';
import type { MovieEditHandlerDeps } from '@/hooks/useMovieEditTypes';

export function createMovieEditHandlers(deps: MovieEditHandlerDeps) {
  const {
    id,
    form,
    setForm,
    router,
    movieData,
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

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setIsSaving(true);
    try {
      const promises: Promise<unknown>[] = [
        updateMovie.mutateAsync({
          id,
          title: form.title,
          poster_url: form.poster_url || null,
          backdrop_url: form.backdrop_url || null,
          release_date: form.release_date,
          runtime: form.runtime ? Number(form.runtime) : null,
          genres: form.genres,
          certification: (form.certification || null) as 'U' | 'UA' | 'A' | null,
          synopsis: form.synopsis || null,
          trailer_url: form.trailer_url || null,
          in_theaters: form.in_theaters,
          backdrop_focus_x: form.backdrop_focus_x,
          backdrop_focus_y: form.backdrop_focus_y,
          spotlight_focus_x: movieData?.spotlight_focus_x ?? null,
          spotlight_focus_y: movieData?.spotlight_focus_y ?? null,
          detail_focus_x: movieData?.detail_focus_x ?? null,
          detail_focus_y: movieData?.detail_focus_y ?? null,
        }),
      ];

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

      await Promise.all(promises);
      resetPendingState();
      setInitialForm({ ...form });
      setSaveStatus('success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Save failed: ${msg}`);
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete() {
    if (confirm('Are you sure? This cannot be undone.')) {
      try {
        await deleteMovie.mutateAsync(id);
        router.push('/movies');
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : JSON.stringify(err);
        alert(`Delete failed: ${msg}`);
      }
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
    handleSubmit,
    handleDelete,
    setUploadingPoster,
    setUploadingBackdrop,
  };
}
