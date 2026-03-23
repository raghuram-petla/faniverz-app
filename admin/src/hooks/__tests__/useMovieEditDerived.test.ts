import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMovieEditDerived } from '@/hooks/useMovieEditDerived';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

// Build a minimal default params object
function makeParams(overrides: Partial<Parameters<typeof useMovieEditDerived>[0]> = {}) {
  const defaultForm: MovieForm = {
    title: 'Test Movie',
    release_date: '2024-01-01',
    synopsis: '',
    tagline: '',
    poster_url: '',
    backdrop_url: '',
    director: '',
    runtime: '',
    imdb_id: '',
    tmdb_id: '',
    certification: '',
    original_language: '',
    status: 'released',
    title_te: '',
    synopsis_te: '',
    budget: '',
    revenue: '',
    tmdb_vote_average: '',
    tmdb_vote_count: '',
  } as unknown as MovieForm;

  return {
    id: 'movie-1',
    castData: [],
    pendingCastAdds: [],
    pendingCastRemoveIds: new Set<string>(),
    localCastOrder: null,
    videosData: [],
    pendingVideoAdds: [],
    pendingVideoRemoveIds: new Set<string>(),
    postersData: [],
    pendingPosterAdds: [],
    pendingPosterRemoveIds: new Set<string>(),
    pendingMainPosterId: null,
    moviePlatforms: [],
    pendingPlatformAdds: [],
    pendingPlatformRemoveIds: new Set<string>(),
    movieProductionHouses: [],
    pendingPHAdds: [],
    pendingPHRemoveIds: new Set<string>(),
    theatricalRuns: [],
    pendingRunAdds: [],
    pendingRunRemoveIds: new Set<string>(),
    pendingRunEndIds: new Map<string, string>(),
    form: defaultForm,
    initialForm: defaultForm,
    ...overrides,
  };
}

describe('useMovieEditDerived', () => {
  describe('visibleCast', () => {
    it('returns empty when no cast', () => {
      const { result } = renderHook(() => useMovieEditDerived(makeParams()));
      expect(result.current.visibleCast).toEqual([]);
    });

    it('filters out cast with pending remove IDs', () => {
      const cast = [
        {
          id: 'c1',
          movie_id: 'movie-1',
          actor_id: 'a1',
          credit_type: 'lead',
          role_name: null,
          role_order: null,
          display_order: 0,
          actor: null,
          created_at: '',
        },
        {
          id: 'c2',
          movie_id: 'movie-1',
          actor_id: 'a2',
          credit_type: 'lead',
          role_name: null,
          role_order: null,
          display_order: 1,
          actor: null,
          created_at: '',
        },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            castData: cast,
            pendingCastRemoveIds: new Set(['c1']),
          }),
        ),
      );
      expect(result.current.visibleCast).toHaveLength(1);
      expect(result.current.visibleCast[0].id).toBe('c2');
    });

    it('includes pending cast adds', () => {
      const actor = {
        id: 'a1',
        name: 'Actor',
        bio: null,
        photo_url: null,
        tmdb_id: null,
        created_at: '',
        updated_at: '',
      };
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingCastAdds: [
              {
                _id: 'pending-c1',
                actor_id: 'a1',
                credit_type: 'lead',
                role_name: null,
                role_order: null,
                display_order: 0,
                _actor: actor,
              },
            ],
          }),
        ),
      );
      expect(result.current.visibleCast).toHaveLength(1);
      expect(result.current.visibleCast[0].id).toBe('pending-c1');
    });

    it('sorts by localCastOrder when provided', () => {
      const cast = [
        {
          id: 'c1',
          movie_id: 'movie-1',
          actor_id: 'a1',
          credit_type: 'lead',
          role_name: null,
          role_order: null,
          display_order: 0,
          actor: null,
          created_at: '',
        },
        {
          id: 'c2',
          movie_id: 'movie-1',
          actor_id: 'a2',
          credit_type: 'lead',
          role_name: null,
          role_order: null,
          display_order: 1,
          actor: null,
          created_at: '',
        },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            castData: cast,
            localCastOrder: ['c2', 'c1'],
          }),
        ),
      );
      expect(result.current.visibleCast[0].id).toBe('c2');
      expect(result.current.visibleCast[1].id).toBe('c1');
    });
  });

  describe('visibleVideos', () => {
    it('returns empty when no videos', () => {
      const { result } = renderHook(() => useMovieEditDerived(makeParams()));
      expect(result.current.visibleVideos).toEqual([]);
    });

    it('filters out videos with pending remove IDs', () => {
      const videos = [
        {
          id: 'v1',
          movie_id: 'movie-1',
          youtube_id: 'abc',
          title: 'Trailer',
          video_type: 'trailer' as const,
          description: null,
          video_date: null,
          display_order: 0,
          created_at: '',
        },
        {
          id: 'v2',
          movie_id: 'movie-1',
          youtube_id: 'def',
          title: 'Clip',
          video_type: 'clip' as const,
          description: null,
          video_date: null,
          display_order: 1,
          created_at: '',
        },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            videosData: videos,
            pendingVideoRemoveIds: new Set(['v1']),
          }),
        ),
      );
      expect(result.current.visibleVideos).toHaveLength(1);
      expect(result.current.visibleVideos[0].id).toBe('v2');
    });

    it('includes pending video adds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingVideoAdds: [
              {
                _id: 'pending-v1',
                youtube_id: 'xyz',
                title: 'New Video',
                video_type: 'trailer',
                description: null,
                video_date: null,
                display_order: 0,
              },
            ],
          }),
        ),
      );
      expect(result.current.visibleVideos).toHaveLength(1);
      expect(result.current.visibleVideos[0].id).toBe('pending-v1');
    });
  });

  describe('visiblePosters', () => {
    it('returns empty when no posters', () => {
      const { result } = renderHook(() => useMovieEditDerived(makeParams()));
      expect(result.current.visiblePosters).toEqual([]);
    });

    it('filters out posters with pending remove IDs', () => {
      const posters = [
        {
          id: 'p1',
          movie_id: 'movie-1',
          image_url: 'a.jpg',
          image_type: 'poster' as const,
          is_main_poster: true,
          is_main_backdrop: false,
          display_order: 0,
          created_at: '',
        },
        {
          id: 'p2',
          movie_id: 'movie-1',
          image_url: 'b.jpg',
          image_type: 'poster' as const,
          is_main_poster: false,
          is_main_backdrop: false,
          display_order: 1,
          created_at: '',
        },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            postersData: posters,
            pendingPosterRemoveIds: new Set(['p1']),
          }),
        ),
      );
      expect(result.current.visiblePosters).toHaveLength(1);
    });

    it('applies pendingMainPosterId to override is_main_poster', () => {
      const posters = [
        {
          id: 'p1',
          movie_id: 'movie-1',
          image_url: 'a.jpg',
          image_type: 'poster' as const,
          is_main_poster: true,
          is_main_backdrop: false,
          display_order: 0,
          created_at: '',
        },
        {
          id: 'p2',
          movie_id: 'movie-1',
          image_url: 'b.jpg',
          image_type: 'poster' as const,
          is_main_poster: false,
          is_main_backdrop: false,
          display_order: 1,
          created_at: '',
        },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            postersData: posters,
            pendingMainPosterId: 'p2',
          }),
        ),
      );
      const p1 = result.current.visiblePosters.find((p) => p.id === 'p1');
      const p2 = result.current.visiblePosters.find((p) => p.id === 'p2');
      expect(p1?.is_main_poster).toBe(false);
      expect(p2?.is_main_poster).toBe(true);
    });

    it('savedMainPosterId is the server main poster id', () => {
      const posters = [
        {
          id: 'p1',
          movie_id: 'movie-1',
          image_url: 'a.jpg',
          image_type: 'poster' as const,
          is_main_poster: true,
          is_main_backdrop: false,
          display_order: 0,
          created_at: '',
        },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(makeParams({ postersData: posters })),
      );
      expect(result.current.savedMainPosterId).toBe('p1');
    });

    it('savedMainPosterId is null when no main poster', () => {
      const { result } = renderHook(() => useMovieEditDerived(makeParams()));
      expect(result.current.savedMainPosterId).toBeNull();
    });
  });

  describe('visiblePlatforms', () => {
    it('returns empty when no platforms', () => {
      const { result } = renderHook(() => useMovieEditDerived(makeParams()));
      expect(result.current.visiblePlatforms).toEqual([]);
    });

    it('filters out platforms with pending remove IDs', () => {
      const platforms = [
        { platform_id: 'plat-1', movie_id: 'movie-1', available_from: null },
        { platform_id: 'plat-2', movie_id: 'movie-1', available_from: null },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            moviePlatforms: platforms,
            pendingPlatformRemoveIds: new Set(['plat-1']),
          }),
        ),
      );
      expect(result.current.visiblePlatforms).toHaveLength(1);
      expect(result.current.visiblePlatforms[0].platform_id).toBe('plat-2');
    });

    it('includes pending platform adds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingPlatformAdds: [
              {
                platform_id: 'plat-new',
                available_from: null,
                streaming_url: null,
                _platform: undefined,
              },
            ],
          }),
        ),
      );
      expect(result.current.visiblePlatforms).toHaveLength(1);
      expect(result.current.visiblePlatforms[0].platform_id).toBe('plat-new');
    });
  });

  describe('visibleProductionHouses', () => {
    it('returns empty when no production houses', () => {
      const { result } = renderHook(() => useMovieEditDerived(makeParams()));
      expect(result.current.visibleProductionHouses).toEqual([]);
    });

    it('filters out PHs with pending remove IDs', () => {
      const phs = [
        { production_house_id: 'ph-1', movie_id: 'movie-1' },
        { production_house_id: 'ph-2', movie_id: 'movie-1' },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            movieProductionHouses: phs,
            pendingPHRemoveIds: new Set(['ph-1']),
          }),
        ),
      );
      expect(result.current.visibleProductionHouses).toHaveLength(1);
      expect(result.current.visibleProductionHouses[0].production_house_id).toBe('ph-2');
    });
  });

  describe('visibleRuns', () => {
    it('returns empty when no theatrical runs', () => {
      const { result } = renderHook(() => useMovieEditDerived(makeParams()));
      expect(result.current.visibleRuns).toEqual([]);
    });

    it('filters out runs with pending remove IDs', () => {
      const runs = [
        {
          id: 'r1',
          movie_id: 'movie-1',
          release_date: '2024-01-01',
          end_date: null,
          label: null,
          created_at: '',
        },
        {
          id: 'r2',
          movie_id: 'movie-1',
          release_date: '2024-06-01',
          end_date: null,
          label: null,
          created_at: '',
        },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            theatricalRuns: runs,
            pendingRunRemoveIds: new Set(['r1']),
          }),
        ),
      );
      expect(result.current.visibleRuns).toHaveLength(1);
      expect(result.current.visibleRuns[0].id).toBe('r2');
    });

    it('includes pending run adds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingRunAdds: [
              {
                _id: 'pending-r1',
                release_date: '2024-12-01',
                label: 'Worldwide',
              },
            ],
          }),
        ),
      );
      expect(result.current.visibleRuns).toHaveLength(1);
      expect(result.current.visibleRuns[0].id).toBe('pending-r1');
    });
  });

  describe('isDirty', () => {
    it('returns false when initialForm is null', () => {
      const { result } = renderHook(() => useMovieEditDerived(makeParams({ initialForm: null })));
      expect(result.current.isDirty).toBe(false);
    });

    it('returns false when nothing has changed', () => {
      const { result } = renderHook(() => useMovieEditDerived(makeParams()));
      expect(result.current.isDirty).toBe(false);
    });

    it('returns true when localCastOrder is set', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(makeParams({ localCastOrder: ['c1', 'c2'] })),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when there are pending cast adds', () => {
      const actor = {
        id: 'a1',
        name: 'Actor',
        bio: null,
        photo_url: null,
        tmdb_id: null,
        created_at: '',
        updated_at: '',
      };
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingCastAdds: [
              {
                _id: 'pc1',
                actor_id: 'a1',
                credit_type: 'lead',
                role_name: null,
                role_order: null,
                display_order: 0,
                _actor: actor,
              },
            ],
          }),
        ),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when there are pending cast removes', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(makeParams({ pendingCastRemoveIds: new Set(['c1']) })),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when there are pending video adds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingVideoAdds: [
              {
                _id: 'pv1',
                youtube_id: 'abc',
                title: 'T',
                video_type: 'trailer',
                description: null,
                video_date: null,
                display_order: 0,
              },
            ],
          }),
        ),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when there are pending video removes', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(makeParams({ pendingVideoRemoveIds: new Set(['v1']) })),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when there are pending platform adds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingPlatformAdds: [
              {
                platform_id: 'p1',
                available_from: null,
                streaming_url: null,
                _platform: undefined,
              },
            ],
          }),
        ),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when there are pending PH adds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingPHAdds: [{ production_house_id: 'ph1', _ph: undefined }],
          }),
        ),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when there are pending run adds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingRunAdds: [{ _id: 'r1', release_date: '2024-01-01', label: null }],
          }),
        ),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when there are pending run end IDs', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            pendingRunEndIds: new Map([['r1', '2024-12-31']]),
          }),
        ),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when form field differs from initialForm', () => {
      const params = makeParams();
      const modifiedForm = { ...params.form, title: 'Changed Title' } as MovieForm;
      const { result } = renderHook(() => useMovieEditDerived(makeParams({ form: modifiedForm })));
      expect(result.current.isDirty).toBe(true);
    });

    it('returns false when pendingMainPosterId matches savedMainPosterId', () => {
      const posters = [
        {
          id: 'p1',
          movie_id: 'movie-1',
          image_url: 'a.jpg',
          image_type: 'poster' as const,
          is_main_poster: true,
          is_main_backdrop: false,
          display_order: 0,
          created_at: '',
        },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            postersData: posters,
            pendingMainPosterId: 'p1', // same as server main
          }),
        ),
      );
      expect(result.current.isDirty).toBe(false);
    });

    it('returns true when pendingMainPosterId differs from savedMainPosterId', () => {
      const posters = [
        {
          id: 'p1',
          movie_id: 'movie-1',
          image_url: 'a.jpg',
          image_type: 'poster' as const,
          is_main_poster: true,
          is_main_backdrop: false,
          display_order: 0,
          created_at: '',
        },
        {
          id: 'p2',
          movie_id: 'movie-1',
          image_url: 'b.jpg',
          image_type: 'poster' as const,
          is_main_poster: false,
          is_main_backdrop: false,
          display_order: 1,
          created_at: '',
        },
      ];
      const { result } = renderHook(() =>
        useMovieEditDerived(
          makeParams({
            postersData: posters,
            pendingMainPosterId: 'p2', // different from server main p1
          }),
        ),
      );
      expect(result.current.isDirty).toBe(true);
    });
  });
});
