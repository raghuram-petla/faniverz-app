'use client';
import type { MovieEditHandlerDeps } from '@/hooks/useMovieEditTypes';

// @contract Builds child-entity mutation promises (cast, videos, posters, platforms, PH, runs)
// @sideeffect Fires sequential crudFetch when a pending poster will become main
export async function buildChildMutationPromises(deps: MovieEditHandlerDeps) {
  const {
    id,
    form,
    localCastOrder,
    pendingCastAdds,
    pendingCastRemoveIds,
    pendingVideoAdds,
    pendingVideoRemoveIds,
    pendingPosterAdds,
    pendingPosterRemoveIds,
    pendingMainPosterId,
    postersData,
    pendingPlatformAdds,
    pendingPlatformRemoveIds,
    pendingPHAdds,
    pendingPHRemoveIds,
    pendingRunAdds,
    pendingRunRemoveIds,
    pendingRunEndIds,
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
    pendingAvailabilityAdds,
    pendingAvailabilityRemoveIds,
    addMovieAvailability,
    removeMovieAvailability,
    addMovieProductionHouse,
    removeMovieProductionHouse,
    addTheatricalRun,
    updateTheatricalRun,
    removeTheatricalRun,
  } = deps;

  const promises: Promise<unknown>[] = [];

  // @invariant Only server-persisted cast IDs get order updates; pending _ids are excluded
  // @sync: pendingCastAdds use stable crypto.randomUUID() _ids — exclude via Set lookup
  if (localCastOrder) {
    const pendingIds = new Set(pendingCastAdds.map((c) => c._id));
    const updates: { id: string; display_order: number }[] = [];
    for (let idx = 0; idx < localCastOrder.length; idx++) {
      const cid = localCastOrder[idx];
      if (!pendingIds.has(cid)) {
        updates.push({ id: cid, display_order: idx });
      }
    }
    if (updates.length > 0) {
      promises.push(updateCastOrder.mutateAsync({ movieId: id, items: updates }));
    }
  }
  for (let i = 0; i < pendingCastAdds.length; i++) {
    const { _actor, _id, ...c } = pendingCastAdds[i];
    void _actor;
    let displayOrder = c.display_order;
    if (localCastOrder) {
      // @sync: uses stable _id instead of index-based 'pending-cast-N'
      const pos = localCastOrder.indexOf(_id);
      if (pos !== -1) displayOrder = pos;
    }
    promises.push(addCast.mutateAsync({ movie_id: id, ...c, display_order: displayOrder }));
  }
  for (const castId of pendingCastRemoveIds) {
    promises.push(removeCast.mutateAsync({ id: castId, movieId: id }));
  }
  for (const v of pendingVideoAdds) {
    const { _id, ...videoData } = v;
    void _id;
    promises.push(addVideo.mutateAsync({ movie_id: id, ...videoData }));
  }
  for (const videoId of pendingVideoRemoveIds) {
    promises.push(removeVideo.mutateAsync({ id: videoId, movieId: id }));
  }
  // @contract compute is_main_poster for each pending poster using pendingMainPosterId override
  const pendingPostersToAdd = pendingPosterAdds.map((p) => {
    const isMain = pendingMainPosterId ? p._id === pendingMainPosterId : p.is_main_poster;
    const { _id, ...posterData } = p;
    void _id;
    return { movie_id: id, ...posterData, is_main_poster: isMain };
  });
  const willInsertMain = pendingPostersToAdd.some((p) => p.is_main_poster);

  // @edge if a pending poster will be main, unset is_main_poster on existing DB posters first
  // (must be sequential — DB unique constraint rejects two is_main_poster=true rows)
  if (willInsertMain) {
    const { crudFetch } = await import('@/lib/admin-crud-client');
    await crudFetch('PATCH', {
      table: 'movie_images',
      filters: { movie_id: id, is_main_poster: true },
      data: { is_main_poster: false },
      returnOne: false,
    }).catch(() => {
      // If no main poster exists, PATCH may return empty — that's OK
    });
  }
  for (const p of pendingPostersToAdd) {
    promises.push(addPoster.mutateAsync(p));
  }
  for (const posterId of pendingPosterRemoveIds) {
    promises.push(removePoster.mutateAsync({ id: posterId, movieId: id }));
  }
  // @edge setMainPoster only for existing DB posters — skip pending (by UUID Set) and removed
  const pendingPosterIds = new Set(pendingPosterAdds.map((p) => p._id));
  if (
    pendingMainPosterId &&
    !pendingPosterIds.has(pendingMainPosterId) &&
    !pendingPosterRemoveIds.has(pendingMainPosterId)
  ) {
    promises.push(setMainPoster.mutateAsync({ id: pendingMainPosterId, movieId: id }));
  }
  // @contract sync is_main_backdrop when backdrop_url changed — find matching image by URL
  const backdropImage = postersData.find((p) => p.image_url === form.backdrop_url);
  if (backdropImage) {
    const currentMainBackdrop = postersData.find(
      (p) => 'is_main_backdrop' in p && (p as { is_main_backdrop: boolean }).is_main_backdrop,
    );
    if (!currentMainBackdrop || currentMainBackdrop.id !== backdropImage.id) {
      promises.push(setMainBackdrop.mutateAsync({ id: backdropImage.id, movieId: id }));
    }
  }
  for (const p of pendingPlatformAdds) {
    promises.push(
      addMoviePlatform.mutateAsync({
        movie_id: id,
        platform_id: p.platform_id,
        available_from: p.available_from,
        streaming_url: p.streaming_url,
      }),
    );
  }
  for (const platformId of pendingPlatformRemoveIds) {
    promises.push(removeMoviePlatform.mutateAsync({ movieId: id, platformId }));
  }
  for (const a of pendingAvailabilityAdds) {
    promises.push(
      addMovieAvailability.mutateAsync({
        movie_id: id,
        platform_id: a.platform_id,
        country_code: a.country_code,
        availability_type: a.availability_type,
        available_from: a.available_from,
        streaming_url: a.streaming_url,
      }),
    );
  }
  for (const availId of pendingAvailabilityRemoveIds) {
    promises.push(removeMovieAvailability.mutateAsync({ id: availId, movie_id: id }));
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
    promises.push(removeMovieProductionHouse.mutateAsync({ movieId: id, productionHouseId: phId }));
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
    promises.push(updateTheatricalRun.mutateAsync({ id: runId, movieId: id, end_date: endDate }));
  }

  return promises;
}
