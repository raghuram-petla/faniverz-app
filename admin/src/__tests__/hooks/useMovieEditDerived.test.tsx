import { renderHook } from '@testing-library/react';
import { useMovieEditDerived } from '@/hooks/useMovieEditDerived';
import type { MovieForm } from '@/hooks/useMovieEditTypes';
import type { MovieCast } from '@/lib/types';
import type { Actor } from '@shared/types';

const defaultForm: MovieForm = {
  title: 'Test Movie',
  poster_url: '',
  backdrop_url: '',
  release_date: '2025-01-01',
  runtime: '',
  genres: [],
  certification: '',
  synopsis: '',
  trailer_url: '',
  in_theaters: false,
  premiere_date: '',
  original_language: '',
  is_featured: false,
  tmdb_id: '',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
};

function emptyParams(overrides: Record<string, unknown> = {}) {
  return {
    id: 'movie-1',
    castData: [] as MovieCast[],
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
    form: { ...defaultForm },
    initialForm: { ...defaultForm },
    ...overrides,
  };
}

describe('useMovieEditDerived', () => {
  describe('isDirty', () => {
    it('returns false when form matches initialForm', () => {
      const { result } = renderHook(() => useMovieEditDerived(emptyParams()));
      expect(result.current.isDirty).toBe(false);
    });

    it('returns true when form differs from initialForm', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          emptyParams({
            form: { ...defaultForm, title: 'Changed Title' },
          }),
        ),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns true when there are pending cast adds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          emptyParams({
            pendingCastAdds: [
              {
                actor_id: 'a1',
                credit_type: 'cast',
                role_name: 'Hero',
                role_order: 1,
                display_order: 0,
              },
            ],
          }),
        ),
      );
      expect(result.current.isDirty).toBe(true);
    });

    it('returns false when initialForm is null', () => {
      const { result } = renderHook(() => useMovieEditDerived(emptyParams({ initialForm: null })));
      expect(result.current.isDirty).toBe(false);
    });
  });

  describe('visibleCast', () => {
    const castData: MovieCast[] = [
      {
        id: 'c1',
        movie_id: 'movie-1',
        actor_id: 'a1',
        credit_type: 'cast',
        role_name: 'Hero',
        role_order: 1,
        display_order: 0,
        actor: { id: 'a1', name: 'Actor One', photo_url: null } as unknown as Actor,
      },
      {
        id: 'c2',
        movie_id: 'movie-1',
        actor_id: 'a2',
        credit_type: 'cast',
        role_name: 'Villain',
        role_order: 2,
        display_order: 1,
        actor: { id: 'a2', name: 'Actor Two', photo_url: null } as unknown as Actor,
      },
    ];

    it('filters out pendingCastRemoveIds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          emptyParams({
            castData,
            pendingCastRemoveIds: new Set(['c1']),
          }),
        ),
      );
      expect(result.current.visibleCast).toHaveLength(1);
      expect(result.current.visibleCast[0].id).toBe('c2');
    });

    it('includes pendingCastAdds', () => {
      const pendingActor = { id: 'a3', name: 'Actor Three', photo_url: null } as unknown as Actor;
      const { result } = renderHook(() =>
        useMovieEditDerived(
          emptyParams({
            castData,
            pendingCastAdds: [
              {
                actor_id: 'a3',
                credit_type: 'cast' as const,
                role_name: 'Sidekick',
                role_order: 3,
                display_order: 2,
                _actor: pendingActor,
              },
            ],
          }),
        ),
      );
      expect(result.current.visibleCast).toHaveLength(3);
      expect(result.current.visibleCast[2].actor_id).toBe('a3');
      expect(result.current.visibleCast[2].role_name).toBe('Sidekick');
    });
  });

  describe('visibleVideos', () => {
    const videosData = [
      {
        id: 'v1',
        movie_id: 'movie-1',
        youtube_id: 'yt1',
        title: 'Teaser',
        video_type: 'teaser' as const,
        description: null,
        video_date: null,
        display_order: 0,
        created_at: '',
      },
      {
        id: 'v2',
        movie_id: 'movie-1',
        youtube_id: 'yt2',
        title: 'Trailer',
        video_type: 'trailer' as const,
        description: null,
        video_date: null,
        display_order: 1,
        created_at: '',
      },
    ];

    it('filters out pendingVideoRemoveIds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          emptyParams({
            videosData,
            pendingVideoRemoveIds: new Set(['v1']),
          }),
        ),
      );
      expect(result.current.visibleVideos).toHaveLength(1);
      expect(result.current.visibleVideos[0].id).toBe('v2');
    });

    it('includes pendingVideoAdds', () => {
      const { result } = renderHook(() =>
        useMovieEditDerived(
          emptyParams({
            videosData,
            pendingVideoAdds: [
              {
                youtube_id: 'yt3',
                title: 'Song',
                video_type: 'song' as const,
                description: null,
                video_date: null,
                display_order: 2,
              },
            ],
          }),
        ),
      );
      expect(result.current.visibleVideos).toHaveLength(3);
      expect(result.current.visibleVideos[2].title).toBe('Song');
    });
  });
});
