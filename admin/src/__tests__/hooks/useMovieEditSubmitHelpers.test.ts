import { describe, it, expect, vi, beforeEach } from 'vitest';
import { buildChildMutationPromises } from '@/hooks/useMovieEditSubmitHelpers';
import type { MovieEditHandlerDeps } from '@/hooks/useMovieEditTypes';

vi.mock('@/lib/admin-crud-client', () => ({
  crudFetch: vi.fn().mockResolvedValue({}),
}));

function createMockDeps(overrides?: Partial<MovieEditHandlerDeps>): MovieEditHandlerDeps {
  return {
    id: 'movie-1',
    form: {
      title: 'Test',
      poster_url: '',
      backdrop_url: '',
      release_date: '',
      runtime: '',
      genres: [],
      certification: '',
      synopsis: '',
      in_theaters: false,
      premiere_date: '',
      original_language: '',
      is_featured: false,
      tmdb_id: '',
      tagline: '',
      backdrop_focus_x: null,
      backdrop_focus_y: null,
      poster_focus_x: null,
      poster_focus_y: null,
    },
    setForm: vi.fn(),
    router: { push: vi.fn() } as never,
    queryClient: { invalidateQueries: vi.fn() } as never,
    movieData: null,
    // Pending state
    localCastOrder: null,
    pendingCastAdds: [],
    pendingCastRemoveIds: new Set(),
    pendingVideoAdds: [],
    pendingVideoRemoveIds: new Set(),
    pendingPosterAdds: [],
    pendingPosterRemoveIds: new Set(),
    pendingMainPosterId: null,
    postersData: [],
    pendingPlatformAdds: [],
    pendingPlatformRemoveIds: new Set(),
    pendingPHAdds: [],
    pendingPHRemoveIds: new Set(),
    pendingRunAdds: [],
    pendingRunRemoveIds: new Set(),
    pendingRunEndIds: new Map(),
    // Setters
    setPendingCastAdds: vi.fn(),
    setPendingCastRemoveIds: vi.fn(),
    setPendingVideoAdds: vi.fn(),
    setPendingVideoRemoveIds: vi.fn(),
    setPendingPosterAdds: vi.fn(),
    setPendingPosterRemoveIds: vi.fn(),
    setPendingPlatformAdds: vi.fn(),
    setPendingPlatformRemoveIds: vi.fn(),
    setPendingPHAdds: vi.fn(),
    setPendingPHRemoveIds: vi.fn(),
    setPendingRunAdds: vi.fn(),
    setPendingRunRemoveIds: vi.fn(),
    setPendingRunEndIds: vi.fn(),
    // Mutations
    updateMovie: { mutateAsync: vi.fn() },
    deleteMovie: { mutateAsync: vi.fn() },
    addCast: { mutateAsync: vi.fn().mockResolvedValue({}) },
    removeCast: { mutateAsync: vi.fn().mockResolvedValue({}) },
    updateCastOrder: { mutateAsync: vi.fn().mockResolvedValue({}) },
    addVideo: { mutateAsync: vi.fn().mockResolvedValue({}) },
    removeVideo: { mutateAsync: vi.fn().mockResolvedValue({}) },
    addPoster: { mutateAsync: vi.fn().mockResolvedValue({}) },
    removePoster: { mutateAsync: vi.fn().mockResolvedValue({}) },
    setMainPoster: { mutateAsync: vi.fn().mockResolvedValue({}) },
    setMainBackdrop: { mutateAsync: vi.fn().mockResolvedValue({}) },
    addMoviePlatform: { mutateAsync: vi.fn().mockResolvedValue({}) },
    removeMoviePlatform: { mutateAsync: vi.fn().mockResolvedValue({}) },
    addMovieProductionHouse: { mutateAsync: vi.fn().mockResolvedValue({}) },
    removeMovieProductionHouse: { mutateAsync: vi.fn().mockResolvedValue({}) },
    addTheatricalRun: { mutateAsync: vi.fn().mockResolvedValue({}) },
    removeTheatricalRun: { mutateAsync: vi.fn().mockResolvedValue({}) },
    updateTheatricalRun: { mutateAsync: vi.fn().mockResolvedValue({}) },
    // Callbacks
    resetPendingState: vi.fn(),
    setInitialForm: vi.fn(),
    setIsSaving: vi.fn(),
    setSaveStatus: vi.fn(),
    setUploadingPoster: vi.fn(),
    setUploadingBackdrop: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('buildChildMutationPromises', () => {
  it('returns empty array when no pending changes', async () => {
    const deps = createMockDeps();
    const promises = await buildChildMutationPromises(deps);

    expect(promises).toEqual([]);
  });

  it('adds cast via addCast.mutateAsync for each pending cast add', async () => {
    const deps = createMockDeps({
      pendingCastAdds: [
        {
          _id: 'pending-c1',
          _actor: { id: 'a1', name: 'Actor 1' } as never,
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: 'Hero',
          character_name: null,
          role_order: null,
          display_order: 0,
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);

    expect(promises.length).toBe(1);
    await Promise.all(promises);
    expect(deps.addCast.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        movie_id: 'movie-1',
        actor_id: 'a1',
        credit_type: 'cast',
        display_order: 0,
      }),
    );
  });

  it('removes cast via removeCast.mutateAsync for each pending removal', async () => {
    const deps = createMockDeps({
      pendingCastRemoveIds: new Set(['c1', 'c2']),
    });

    const promises = await buildChildMutationPromises(deps);

    expect(promises.length).toBe(2);
    await Promise.all(promises);
    expect(deps.removeCast.mutateAsync).toHaveBeenCalledWith({
      id: 'c1',
      movieId: 'movie-1',
    });
    expect(deps.removeCast.mutateAsync).toHaveBeenCalledWith({
      id: 'c2',
      movieId: 'movie-1',
    });
  });

  it('updates cast order when localCastOrder is set, excluding pending IDs', async () => {
    const deps = createMockDeps({
      localCastOrder: ['c1', 'pending-c2', 'c3'],
      pendingCastAdds: [
        {
          _id: 'pending-c2',
          _actor: null as never,
          actor_id: 'a2',
          credit_type: 'cast' as const,
          role_name: '',
          character_name: null,
          role_order: null,
          display_order: 1,
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    // updateCastOrder with only server IDs
    expect(deps.updateCastOrder.mutateAsync).toHaveBeenCalledWith({
      movieId: 'movie-1',
      items: [
        { id: 'c1', display_order: 0 },
        { id: 'c3', display_order: 2 },
      ],
    });
    // pending cast add uses position from localCastOrder
    expect(deps.addCast.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ display_order: 1 }),
    );
  });

  it('adds videos for pending video adds', async () => {
    const deps = createMockDeps({
      pendingVideoAdds: [
        {
          _id: 'pv1',
          youtube_id: 'yt123',
          title: 'Trailer',
          video_type: 'trailer' as never,
          description: null,
          video_date: null,
          display_order: 0,
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.addVideo.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        movie_id: 'movie-1',
        youtube_id: 'yt123',
        title: 'Trailer',
      }),
    );
  });

  it('removes videos for pending video removals', async () => {
    const deps = createMockDeps({
      pendingVideoRemoveIds: new Set(['v1']),
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.removeVideo.mutateAsync).toHaveBeenCalledWith({
      id: 'v1',
      movieId: 'movie-1',
    });
  });

  it('adds posters with correct is_main_poster based on pendingMainPosterId', async () => {
    const deps = createMockDeps({
      pendingMainPosterId: 'pp2',
      pendingPosterAdds: [
        {
          _id: 'pp1',
          image_url: 'https://img1.jpg',
          title: 'Poster 1',
          description: null,
          poster_date: null,
          is_main_poster: true,
          is_main_backdrop: false,
          image_type: 'poster' as const,
          display_order: 0,
        },
        {
          _id: 'pp2',
          image_url: 'https://img2.jpg',
          title: 'Poster 2',
          description: null,
          poster_date: null,
          is_main_poster: false,
          is_main_backdrop: false,
          image_type: 'poster' as const,
          display_order: 1,
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    // pp1 should NOT be main (despite is_main_poster:true) because pendingMainPosterId overrides
    expect(deps.addPoster.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: 'https://img1.jpg',
        is_main_poster: false,
      }),
    );
    // pp2 should be main
    expect(deps.addPoster.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        image_url: 'https://img2.jpg',
        is_main_poster: true,
      }),
    );
  });

  it('removes posters for pending poster removals', async () => {
    const deps = createMockDeps({
      pendingPosterRemoveIds: new Set(['p1']),
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.removePoster.mutateAsync).toHaveBeenCalledWith({
      id: 'p1',
      movieId: 'movie-1',
    });
  });

  it('sets main poster for existing DB poster when pendingMainPosterId is not a pending add', async () => {
    const deps = createMockDeps({
      pendingMainPosterId: 'existing-poster-1',
      pendingPosterAdds: [],
      pendingPosterRemoveIds: new Set(),
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.setMainPoster.mutateAsync).toHaveBeenCalledWith({
      id: 'existing-poster-1',
      movieId: 'movie-1',
    });
  });

  it('does NOT set main poster for pending-add IDs', async () => {
    const deps = createMockDeps({
      pendingMainPosterId: 'pp1',
      pendingPosterAdds: [
        {
          _id: 'pp1',
          image_url: 'https://img.jpg',
          title: 'New',
          description: null,
          poster_date: null,
          is_main_poster: true,
          is_main_backdrop: false,
          image_type: 'poster' as const,
          display_order: 0,
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.setMainPoster.mutateAsync).not.toHaveBeenCalled();
  });

  it('does NOT set main poster for removed poster IDs', async () => {
    const deps = createMockDeps({
      pendingMainPosterId: 'removed-poster-1',
      pendingPosterRemoveIds: new Set(['removed-poster-1']),
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.setMainPoster.mutateAsync).not.toHaveBeenCalled();
  });

  it('sets main backdrop when backdrop_url matches a poster image', async () => {
    const deps = createMockDeps({
      form: {
        title: 'Test',
        poster_url: '',
        backdrop_url: 'https://backdrop.jpg',
        release_date: '',
        runtime: '',
        genres: [],
        certification: '',
        synopsis: '',
        in_theaters: false,
        premiere_date: '',
        original_language: '',
        is_featured: false,
        tmdb_id: '',
        tagline: '',
        backdrop_focus_x: null,
        backdrop_focus_y: null,
        poster_focus_x: null,
        poster_focus_y: null,
      } as never,
      postersData: [{ id: 'bd1', image_url: 'https://backdrop.jpg' }],
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.setMainBackdrop.mutateAsync).toHaveBeenCalledWith({
      id: 'bd1',
      movieId: 'movie-1',
    });
  });

  it('adds platforms for pending platform adds', async () => {
    const deps = createMockDeps({
      pendingPlatformAdds: [
        {
          platform_id: 'plat1',
          available_from: '2026-01-01',
          streaming_url: 'https://stream.com',
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.addMoviePlatform.mutateAsync).toHaveBeenCalledWith({
      movie_id: 'movie-1',
      platform_id: 'plat1',
      available_from: '2026-01-01',
      streaming_url: 'https://stream.com',
    });
  });

  it('removes platforms for pending platform removals', async () => {
    const deps = createMockDeps({
      pendingPlatformRemoveIds: new Set(['plat1']),
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.removeMoviePlatform.mutateAsync).toHaveBeenCalledWith({
      movieId: 'movie-1',
      platformId: 'plat1',
    });
  });

  it('adds production houses for pending PH adds', async () => {
    const deps = createMockDeps({
      pendingPHAdds: [{ production_house_id: 'ph1' }],
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.addMovieProductionHouse.mutateAsync).toHaveBeenCalledWith({
      movieId: 'movie-1',
      productionHouseId: 'ph1',
    });
  });

  it('removes production houses for pending PH removals', async () => {
    const deps = createMockDeps({
      pendingPHRemoveIds: new Set(['ph1']),
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.removeMovieProductionHouse.mutateAsync).toHaveBeenCalledWith({
      movieId: 'movie-1',
      productionHouseId: 'ph1',
    });
  });

  it('adds theatrical runs for pending run adds', async () => {
    const deps = createMockDeps({
      pendingRunAdds: [
        {
          _id: 'pr1',
          release_date: '2026-03-01',
          label: 'Re-release',
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.addTheatricalRun.mutateAsync).toHaveBeenCalledWith({
      movie_id: 'movie-1',
      release_date: '2026-03-01',
      label: 'Re-release',
    });
  });

  it('removes theatrical runs for pending run removals', async () => {
    const deps = createMockDeps({
      pendingRunRemoveIds: new Set(['r1']),
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.removeTheatricalRun.mutateAsync).toHaveBeenCalledWith({
      id: 'r1',
      movieId: 'movie-1',
    });
  });

  it('updates theatrical runs for pending run end dates', async () => {
    const deps = createMockDeps({
      pendingRunEndIds: new Map([['r1', '2026-04-01']]),
    });

    const promises = await buildChildMutationPromises(deps);

    await Promise.all(promises);
    expect(deps.updateTheatricalRun.mutateAsync).toHaveBeenCalledWith({
      id: 'r1',
      movieId: 'movie-1',
      end_date: '2026-04-01',
    });
  });

  it('skips updateCastOrder when localCastOrder has only pending IDs', async () => {
    const deps = createMockDeps({
      localCastOrder: ['pending-c1'],
      pendingCastAdds: [
        {
          _id: 'pending-c1',
          _actor: null as never,
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: '',
          character_name: null,
          role_order: null,
          display_order: 0,
        },
      ],
    });

    await buildChildMutationPromises(deps);
    // All IDs are pending, so updates array is empty — updateCastOrder should NOT be called
    expect(deps.updateCastOrder.mutateAsync).not.toHaveBeenCalled();
  });

  it('uses original display_order when cast _id not found in localCastOrder', async () => {
    const deps = createMockDeps({
      localCastOrder: ['other-id'],
      pendingCastAdds: [
        {
          _id: 'pending-not-in-order',
          _actor: null as never,
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: '',
          character_name: null,
          role_order: null,
          display_order: 42,
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);
    await Promise.all(promises);
    // indexOf returns -1, so displayOrder stays as original (42)
    expect(deps.addCast.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ display_order: 42 }),
    );
  });

  it('uses original is_main_poster when pendingMainPosterId is null', async () => {
    const deps = createMockDeps({
      pendingMainPosterId: null,
      pendingPosterAdds: [
        {
          _id: 'pp1',
          image_url: 'https://img.jpg',
          title: 'P1',
          description: null,
          poster_date: null,
          is_main_poster: true,
          is_main_backdrop: false,
          image_type: 'poster' as const,
          display_order: 0,
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);
    await Promise.all(promises);
    // With null pendingMainPosterId, falls back to p.is_main_poster which is true
    expect(deps.addPoster.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ is_main_poster: true }),
    );
  });

  it('skips setMainBackdrop when currentMainBackdrop matches backdropImage', async () => {
    const deps = createMockDeps({
      form: {
        title: 'Test',
        poster_url: '',
        backdrop_url: 'https://backdrop.jpg',
        release_date: '',
        runtime: '',
        genres: [],
        certification: '',
        synopsis: '',
        in_theaters: false,
        premiere_date: '',
        original_language: '',
        is_featured: false,
        tmdb_id: '',
        tagline: '',
        backdrop_focus_x: null,
        backdrop_focus_y: null,
        poster_focus_x: null,
        poster_focus_y: null,
      } as never,
      postersData: [{ id: 'bd1', image_url: 'https://backdrop.jpg', is_main_backdrop: true }],
    });

    const promises = await buildChildMutationPromises(deps);
    await Promise.all(promises);
    // currentMainBackdrop.id === backdropImage.id, so no setMainBackdrop call
    expect(deps.setMainBackdrop.mutateAsync).not.toHaveBeenCalled();
  });

  it('uses addCast without localCastOrder (no reorder)', async () => {
    const deps = createMockDeps({
      localCastOrder: null,
      pendingCastAdds: [
        {
          _id: 'pending-c1',
          _actor: null as never,
          actor_id: 'a1',
          credit_type: 'cast' as const,
          role_name: '',
          character_name: null,
          role_order: null,
          display_order: 5,
        },
      ],
    });

    const promises = await buildChildMutationPromises(deps);
    await Promise.all(promises);
    // No localCastOrder, so display_order stays as original
    expect(deps.addCast.mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ display_order: 5 }),
    );
    expect(deps.updateCastOrder.mutateAsync).not.toHaveBeenCalled();
  });

  it('combines multiple entity types into a single promise array', async () => {
    const deps = createMockDeps({
      pendingCastRemoveIds: new Set(['c1']),
      pendingVideoAdds: [
        {
          _id: 'pv1',
          youtube_id: 'yt1',
          title: 'T',
          video_type: 'trailer' as never,
          description: null,
          video_date: null,
          display_order: 0,
        },
      ],
      pendingPlatformAdds: [{ platform_id: 'pl1', available_from: null, streaming_url: null }],
    });

    const promises = await buildChildMutationPromises(deps);

    expect(promises.length).toBe(3);
  });
});
