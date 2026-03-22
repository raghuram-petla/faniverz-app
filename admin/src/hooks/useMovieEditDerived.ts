'use client';
import { useMemo } from 'react';
import type { MovieCast, VideoType, MovieImage } from '@/lib/types';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type {
  MovieForm,
  PendingVideoAdd,
  PendingPosterAdd,
  PendingPlatformAdd,
  PendingPHAdd,
} from '@/hooks/useMovieEditTypes';
import type { PendingRun } from '@/components/movie-edit/TheatricalRunsSection';
import type { OTTPlatform, ProductionHouse } from '@shared/types';

// Server data shape used by useMoviePlatforms
type MoviePlatformRow = {
  platform_id: string;
  movie_id: string;
  available_from: string | null;
  platform?: OTTPlatform;
};

// Server data shape used by useMovieProductionHouses
type MovieProductionHouseRow = {
  production_house_id: string;
  movie_id: string;
  production_house?: ProductionHouse;
};

interface TheatricalRun {
  id: string;
  movie_id: string;
  release_date: string;
  end_date: string | null;
  label: string | null;
  created_at: string;
}

interface VideoRow {
  id: string;
  movie_id: string;
  youtube_id: string;
  title: string;
  video_type: VideoType;
  description: string | null;
  video_date: string | null;
  display_order: number;
  created_at: string;
}

type PosterRow = MovieImage;

// @contract All visible* arrays merge server data with pending adds, minus pending removes
// @coupling Used by both useMovieEditState (edit flow) and useMovieAddState (add flow)
export function useMovieEditDerived(params: {
  id: string;
  castData: MovieCast[];
  pendingCastAdds: PendingCastAdd[];
  pendingCastRemoveIds: Set<string>;
  localCastOrder: string[] | null;
  videosData: VideoRow[];
  pendingVideoAdds: PendingVideoAdd[];
  pendingVideoRemoveIds: Set<string>;
  postersData: PosterRow[];
  pendingPosterAdds: PendingPosterAdd[];
  pendingPosterRemoveIds: Set<string>;
  pendingMainPosterId: string | null;
  moviePlatforms: MoviePlatformRow[];
  pendingPlatformAdds: PendingPlatformAdd[];
  pendingPlatformRemoveIds: Set<string>;
  movieProductionHouses: MovieProductionHouseRow[];
  pendingPHAdds: PendingPHAdd[];
  pendingPHRemoveIds: Set<string>;
  theatricalRuns: TheatricalRun[];
  pendingRunAdds: PendingRun[];
  pendingRunRemoveIds: Set<string>;
  pendingRunEndIds: Map<string, string>;
  form: MovieForm;
  initialForm: MovieForm | null;
}) {
  const {
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
    pendingRunEndIds,
    form,
    initialForm,
  } = params;

  // @contract Pending items use stable _id — safe across removals (no index-shift bugs)
  const visibleCast = useMemo(() => {
    const serverFiltered = castData.filter((c) => !pendingCastRemoveIds.has(c.id));
    const allItems = [
      ...serverFiltered,
      ...pendingCastAdds.map((p) => ({
        id: p._id,
        movie_id: id,
        actor_id: p.actor_id,
        credit_type: p.credit_type,
        role_name: p.role_name,
        role_order: p.role_order,
        display_order: p.display_order,
        actor: p._actor,
        created_at: '',
      })),
    ] as MovieCast[];
    // @edge If localCastOrder is set, items not in the order map fall back to their display_order
    if (!localCastOrder) return allItems;
    const orderMap = new Map(localCastOrder.map((cid, idx) => [cid, idx]));
    return allItems.sort(
      (a, b) => (orderMap.get(a.id) ?? a.display_order) - (orderMap.get(b.id) ?? b.display_order),
    );
  }, [castData, pendingCastAdds, pendingCastRemoveIds, localCastOrder, id]);

  const visibleVideos = useMemo(
    () => [
      ...videosData.filter((v) => !pendingVideoRemoveIds.has(v.id)),
      ...pendingVideoAdds.map(({ _id, ...rest }) => ({
        ...rest,
        id: _id,
        movie_id: id,
        created_at: '',
      })),
    ],
    [videosData, pendingVideoAdds, pendingVideoRemoveIds, id],
  );

  // @edge pendingMainPosterId overrides is_main_poster on ALL posters — ensures exactly one main poster
  // @edge also handles pending adds with is_main_poster:true when pendingMainPosterId is not yet set
  const visiblePosters = useMemo(() => {
    const items = [
      ...postersData.filter((p) => !pendingPosterRemoveIds.has(p.id)),
      ...pendingPosterAdds.map((p) => ({
        ...p,
        id: p._id,
        movie_id: id,
        created_at: '',
      })),
    ];
    // @contract effectiveMainId: explicit selection wins; fallback to any pending add with is_main_poster=true
    const effectiveMainId =
      pendingMainPosterId && items.some((p) => p.id === pendingMainPosterId)
        ? pendingMainPosterId
        : (pendingPosterAdds.find((p) => p.is_main_poster)?._id ?? null);
    if (effectiveMainId) {
      return items.map((p) => ({ ...p, is_main_poster: p.id === effectiveMainId }));
    }
    return items;
  }, [postersData, pendingPosterAdds, pendingPosterRemoveIds, pendingMainPosterId, id]);

  // @invariant Platforms are keyed by platform_id (not a surrogate id) — removal set uses platform_id
  // @contract: alias platforms (whose tmdb_provider_id is in another platform's tmdb_alias_ids) are hidden
  const visiblePlatforms = useMemo(() => {
    const all = [
      ...moviePlatforms.filter((mp) => !pendingPlatformRemoveIds.has(mp.platform_id)),
      ...pendingPlatformAdds.map((p) => ({
        movie_id: id,
        platform_id: p.platform_id,
        available_from: p.available_from,
        streaming_url: p.streaming_url,
        platform: p._platform,
      })),
    ];
    // Build set of all alias IDs across platforms in this movie
    const aliasProviderIds = new Set<number>();
    for (const mp of all) {
      for (const aid of mp.platform?.tmdb_alias_ids ?? []) aliasProviderIds.add(aid);
    }
    // Filter out platforms whose tmdb_provider_id is an alias of another
    return all.filter(
      (mp) => !mp.platform?.tmdb_provider_id || !aliasProviderIds.has(mp.platform.tmdb_provider_id),
    );
  }, [moviePlatforms, pendingPlatformAdds, pendingPlatformRemoveIds, id]);

  const visibleProductionHouses = useMemo(
    () => [
      ...movieProductionHouses.filter((mph) => !pendingPHRemoveIds.has(mph.production_house_id)),
      ...pendingPHAdds.map((p) => ({
        movie_id: id,
        production_house_id: p.production_house_id,
        production_house: p._ph,
      })),
    ],
    [movieProductionHouses, pendingPHAdds, pendingPHRemoveIds, id],
  );

  // @sync: uses stable _id (UUID) instead of index-based 'pending-run-N' — prevents index-shift
  // bugs when runs are removed out-of-order from the pending list
  const visibleRuns = useMemo(
    () => [
      ...theatricalRuns.filter((r) => !pendingRunRemoveIds.has(r.id)),
      ...pendingRunAdds.map((r) => ({
        id: r._id,
        movie_id: id,
        release_date: r.release_date,
        end_date: null,
        label: r.label,
        created_at: '',
      })),
    ],
    [theatricalRuns, pendingRunAdds, pendingRunRemoveIds, id],
  );

  // @contract savedMainPosterId reflects only the DB-persisted main poster — never changes during editing
  const savedMainPosterId = useMemo(
    () => postersData.find((p) => p.is_main_poster)?.id ?? null,
    [postersData],
  );

  // @edge JSON.stringify comparison for form fields — deep equality check on objects with no circular refs
  // @assumes initialForm is null only before movie data loads (add flow sets it to INITIAL_FORM immediately)
  const isDirty = useMemo(() => {
    if (!initialForm) return false;
    if (localCastOrder !== null) return true;
    if (pendingCastAdds.length > 0 || pendingCastRemoveIds.size > 0) return true;
    if (pendingVideoAdds.length > 0 || pendingVideoRemoveIds.size > 0) return true;
    if (pendingPosterAdds.length > 0 || pendingPosterRemoveIds.size > 0) return true;
    // @contract only dirty if pending main differs from the saved DB main — re-selecting the
    //           original main must not count as a change
    if (pendingMainPosterId !== null && pendingMainPosterId !== savedMainPosterId) return true;
    if (pendingPlatformAdds.length > 0 || pendingPlatformRemoveIds.size > 0) return true;
    if (pendingPHAdds.length > 0 || pendingPHRemoveIds.size > 0) return true;
    if (pendingRunAdds.length > 0 || pendingRunRemoveIds.size > 0) return true;
    if (pendingRunEndIds.size > 0) return true;
    // @contract: shallow field comparison avoids expensive JSON.stringify on every render
    const keys = Object.keys(form) as (keyof MovieForm)[];
    return keys.some((k) => form[k] !== initialForm[k]);
  }, [
    form,
    initialForm,
    localCastOrder,
    pendingCastAdds,
    pendingCastRemoveIds,
    pendingVideoAdds,
    pendingVideoRemoveIds,
    pendingPosterAdds,
    pendingPosterRemoveIds,
    pendingMainPosterId,
    savedMainPosterId,
    pendingPlatformAdds,
    pendingPlatformRemoveIds,
    pendingPHAdds,
    pendingPHRemoveIds,
    pendingRunAdds,
    pendingRunRemoveIds,
    pendingRunEndIds,
  ]);

  return {
    visibleCast,
    visibleVideos,
    visiblePosters,
    visiblePlatforms,
    visibleProductionHouses,
    visibleRuns,
    isDirty,
    savedMainPosterId,
  };
}
