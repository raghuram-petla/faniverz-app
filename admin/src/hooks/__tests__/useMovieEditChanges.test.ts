import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

vi.mock('@/hooks/useFormChanges', () => ({
  useFormChanges: vi.fn(() => ({ changes: [] })),
}));

vi.mock('@/hooks/useMovieEditChangesRevert', () => ({
  revertEntity: vi.fn(),
}));

import { useMovieEditChanges } from '@/hooks/useMovieEditChanges';
import { useFormChanges } from '@/hooks/useFormChanges';
import { revertEntity } from '@/hooks/useMovieEditChangesRevert';
import type { UseMovieEditChangesParams } from '@/hooks/useMovieEditTypes';
import type { OTTPlatform, ProductionHouse } from '@shared/types';

function makeForm(overrides = {}) {
  return {
    title: 'Test Movie',
    poster_url: '',
    backdrop_url: '',
    release_date: '2025-01-01',
    runtime: '120',
    certification: 'UA',
    synopsis: '',
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
    genres: ['Action', 'Drama'],
    ...overrides,
  };
}

function makeParams(overrides: Partial<UseMovieEditChangesParams> = {}): UseMovieEditChangesParams {
  const form = makeForm();
  return {
    form,
    initialForm: form,
    setForm: vi.fn(),
    setInitialForm: vi.fn(),
    pendingCastAdds: [],
    pendingCastRemoveIds: new Set(),
    localCastOrder: null,
    castData: [],
    setPendingCastAdds: vi.fn(),
    setPendingCastRemoveIds: vi.fn(),
    setLocalCastOrder: vi.fn(),
    pendingVideoAdds: [],
    pendingVideoRemoveIds: new Set(),
    videosData: [],
    setPendingVideoAdds: vi.fn(),
    setPendingVideoRemoveIds: vi.fn(),
    pendingPosterAdds: [],
    pendingPosterRemoveIds: new Set(),
    postersData: [],
    pendingMainPosterId: null,
    savedMainPosterId: null,
    setPendingPosterAdds: vi.fn(),
    setPendingPosterRemoveIds: vi.fn(),
    setPendingMainPosterId: vi.fn(),
    pendingPlatformAdds: [],
    pendingPlatformRemoveIds: new Set(),
    moviePlatforms: [],
    setPendingPlatformAdds: vi.fn(),
    setPendingPlatformRemoveIds: vi.fn(),
    pendingPHAdds: [],
    pendingPHRemoveIds: new Set(),
    movieProductionHouses: [],
    setPendingPHAdds: vi.fn(),
    setPendingPHRemoveIds: vi.fn(),
    pendingRunAdds: [],
    pendingRunRemoveIds: new Set(),
    pendingRunEndIds: new Map(),
    theatricalRuns: [],
    setPendingRunAdds: vi.fn(),
    setPendingRunRemoveIds: vi.fn(),
    setPendingRunEndIds: vi.fn(),
    resetPendingState: vi.fn(),
    ...overrides,
  };
}

describe('useMovieEditChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFormChanges).mockReturnValue({ changes: [], isDirty: false, changeCount: 0 });
  });

  it('returns empty changes when no diffs', () => {
    const { result } = renderHook(() => useMovieEditChanges(makeParams()));
    expect(result.current.changes).toEqual([]);
    expect(result.current.changeCount).toBe(0);
  });

  it('includes basic field changes from useFormChanges', () => {
    vi.mocked(useFormChanges).mockReturnValue({
      changes: [
        {
          key: 'title',
          label: 'Title',
          type: 'text',
          oldValue: 'Old',
          newValue: 'New',
          oldDisplay: 'Old',
          newDisplay: 'New',
        },
      ],
    } as ReturnType<typeof useFormChanges>);

    const { result } = renderHook(() => useMovieEditChanges(makeParams()));
    expect(result.current.changes).toHaveLength(1);
    expect(result.current.changes[0].key).toBe('title');
  });

  it('generates genre change when genres differ', () => {
    const initialForm = makeForm({ genres: ['Action'] });
    const form = makeForm({ genres: ['Action', 'Drama'] });

    const { result } = renderHook(() => useMovieEditChanges(makeParams({ form, initialForm })));

    const genreChange = result.current.changes.find((c) => c.key === 'genres');
    expect(genreChange).toBeTruthy();
    expect(genreChange?.newDisplay).toContain('+ Drama');
  });

  it('shows removed genres in old display', () => {
    const initialForm = makeForm({ genres: ['Action', 'Drama'] });
    const form = makeForm({ genres: ['Action'] });

    const { result } = renderHook(() => useMovieEditChanges(makeParams({ form, initialForm })));

    const genreChange = result.current.changes.find((c) => c.key === 'genres');
    expect(genreChange?.oldDisplay).toContain('- Drama');
  });

  it('returns no genre changes when genres are identical', () => {
    const { result } = renderHook(() => useMovieEditChanges(makeParams()));
    const genreChange = result.current.changes.find((c) => c.key === 'genres');
    expect(genreChange).toBeUndefined();
  });

  it('returns no genre changes when initialForm is null', () => {
    const { result } = renderHook(() => useMovieEditChanges(makeParams({ initialForm: null })));
    const genreChange = result.current.changes.find((c) => c.key === 'genres');
    expect(genreChange).toBeUndefined();
  });

  it('generates change for pending cast add', () => {
    const params = makeParams({
      pendingCastAdds: [
        {
          _id: 'uuid-1',
          actor_id: 'actor-1',
          credit_type: 'cast',
          role_name: 'Hero',
          role_order: null,
          display_order: 0,
          _actor: { id: 'actor-1', name: 'Prabhas' } as never,
        },
      ],
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const castChange = result.current.changes.find((c) => c.key.startsWith('entity:cast-add-'));
    expect(castChange).toBeTruthy();
    expect(castChange?.newDisplay).toContain('+ Prabhas');
    expect(castChange?.newDisplay).toContain('as Hero');
  });

  it('generates change for pending cast remove', () => {
    const params = makeParams({
      pendingCastRemoveIds: new Set(['cast-id-1']),
      castData: [
        {
          id: 'cast-id-1',
          actor: { name: 'Mahesh Babu' },
          actor_id: 'actor-1',
          movie_id: 'movie-1',
          role_name: null,
          display_order: 0,
          created_at: '2025-01-01',
        } as never,
      ],
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const castChange = result.current.changes.find((c) => c.key.startsWith('entity:cast-remove-'));
    expect(castChange).toBeTruthy();
    expect(castChange?.oldDisplay).toBe('Mahesh Babu');
    expect(castChange?.newDisplay).toBe('(removed)');
  });

  it('generates change when localCastOrder is set', () => {
    const params = makeParams({
      localCastOrder: ['id-1', 'id-2'],
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const castOrderChange = result.current.changes.find((c) => c.key === 'entity:cast-reorder');
    expect(castOrderChange).toBeTruthy();
    expect(castOrderChange?.newDisplay).toBe('Reordered');
  });

  it('generates change for pending video add', () => {
    const params = makeParams({
      pendingVideoAdds: [
        {
          _id: 'vid-uuid',
          youtube_id: 'abc123',
          title: 'New Trailer',
          video_type: 'trailer' as const,
          display_order: 0,
          description: null,
          video_date: null,
        },
      ],
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const vidChange = result.current.changes.find((c) => c.key.startsWith('entity:video-add-'));
    expect(vidChange).toBeTruthy();
    expect(vidChange?.newDisplay).toContain('+ New Trailer');
  });

  it('generates change for pending platform add', () => {
    const params = makeParams({
      pendingPlatformAdds: [
        {
          platform_id: 'netflix',
          available_from: null,
          streaming_url: null,
          _platform: { name: 'Netflix' } as never,
        },
      ],
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const platChange = result.current.changes.find((c) => c.key.startsWith('entity:platform-add-'));
    expect(platChange).toBeTruthy();
    expect(platChange?.newDisplay).toContain('+ Netflix');
  });

  it('generates change for pending platform remove', () => {
    const params = makeParams({
      pendingPlatformRemoveIds: new Set(['netflix']),
      moviePlatforms: [
        {
          platform_id: 'netflix',
          movie_id: 'movie-1',
          platform: { name: 'Netflix' } as never,
        } as never,
      ],
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const platChange = result.current.changes.find((c) =>
      c.key.startsWith('entity:platform-remove-'),
    );
    expect(platChange).toBeTruthy();
    expect(platChange?.oldDisplay).toBe('Netflix');
  });

  it('generates change for main poster when pending differs from saved', () => {
    const params = makeParams({
      pendingMainPosterId: 'poster-new',
      savedMainPosterId: 'poster-old',
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const mainPosterChange = result.current.changes.find((c) => c.key === 'entity:main-poster');
    expect(mainPosterChange).toBeTruthy();
  });

  it('does not generate main poster change when pending matches saved', () => {
    const params = makeParams({
      pendingMainPosterId: 'poster-1',
      savedMainPosterId: 'poster-1',
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const mainPosterChange = result.current.changes.find((c) => c.key === 'entity:main-poster');
    expect(mainPosterChange).toBeUndefined();
  });

  it('generates change for pending theatrical run add', () => {
    const params = makeParams({
      pendingRunAdds: [
        {
          _id: 'run-uuid',
          movie_id: 'movie-1',
          release_date: '2025-06-01',
          label: 'Worldwide',
          end_date: null,
          release_type: 'theatrical',
          created_at: '',
        } as never,
      ],
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const runChange = result.current.changes.find((c) => c.key.startsWith('entity:run-add-'));
    expect(runChange).toBeTruthy();
    expect(runChange?.newDisplay).toContain('2025-06-01');
    expect(runChange?.newDisplay).toContain('(Worldwide)');
  });

  it('generates run end change from pendingRunEndIds', () => {
    const endIds = new Map([['run-id-1', '2025-12-31']]);
    const params = makeParams({
      pendingRunEndIds: endIds,
      theatricalRuns: [
        {
          id: 'run-id-1',
          release_date: '2025-06-01',
          label: null,
          end_date: null,
          movie_id: 'movie-1',
          release_type: 'theatrical',
          created_at: '',
        } as never,
      ],
    });

    const { result } = renderHook(() => useMovieEditChanges(params));
    const runEndChange = result.current.changes.find((c) => c.key.startsWith('entity:run-end-'));
    expect(runEndChange).toBeTruthy();
    expect(runEndChange?.newDisplay).toContain('ends 2025-12-31');
  });

  describe('onRevertField', () => {
    it('does nothing when initialForm is null', () => {
      const setForm = vi.fn();
      const { result } = renderHook(() =>
        useMovieEditChanges(makeParams({ initialForm: null, setForm })),
      );

      result.current.onRevertField('title');
      expect(setForm).not.toHaveBeenCalled();
    });

    it('reverts genre field', () => {
      const setForm = vi.fn();
      const initialForm = makeForm({ genres: ['Action'] });
      const form = makeForm({ genres: ['Action', 'Drama'] });

      const { result } = renderHook(() =>
        useMovieEditChanges(makeParams({ form, initialForm, setForm })),
      );

      result.current.onRevertField('genres');
      expect(setForm).toHaveBeenCalledWith(expect.any(Function));
    });

    it('calls revertEntity for entity keys', () => {
      const { result } = renderHook(() => useMovieEditChanges(makeParams()));
      result.current.onRevertField('entity:cast-add-uuid-1');
      expect(revertEntity).toHaveBeenCalledWith('entity:cast-add-uuid-1', expect.anything());
    });

    it('reverts basic field by key', () => {
      const setForm = vi.fn();
      const initialForm = makeForm({ title: 'Original Title' });
      const form = makeForm({ title: 'Changed Title' });

      const { result } = renderHook(() =>
        useMovieEditChanges(makeParams({ form, initialForm, setForm })),
      );

      result.current.onRevertField('title');
      expect(setForm).toHaveBeenCalledWith(expect.any(Function));
    });
  });

  describe('onDiscard', () => {
    it('calls resetPendingState', () => {
      const resetPendingState = vi.fn();
      const { result } = renderHook(() => useMovieEditChanges(makeParams({ resetPendingState })));

      result.current.onDiscard();
      expect(resetPendingState).toHaveBeenCalled();
    });

    it('calls setForm with initialForm when initialForm is set', () => {
      const setForm = vi.fn();
      const initialForm = makeForm({ title: 'Original' });

      const { result } = renderHook(() =>
        useMovieEditChanges(makeParams({ initialForm, setForm })),
      );

      result.current.onDiscard();
      expect(setForm).toHaveBeenCalledWith(initialForm);
    });

    it('does not call setForm when initialForm is null', () => {
      const setForm = vi.fn();
      const { result } = renderHook(() =>
        useMovieEditChanges(makeParams({ initialForm: null, setForm })),
      );

      result.current.onDiscard();
      expect(setForm).not.toHaveBeenCalled();
    });
  });

  describe('entity changes — cast/video/poster fallback branches', () => {
    it('uses "Unknown" when cast add has no _actor', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingCastAdds: [
              {
                _id: 'c1',
                _actor: undefined,
                role_name: '',
                display_order: 0,
                credit_type: 'cast',
              },
            ] as never[],
          }),
        ),
      );
      const castChange = result.current.changes.find((c) => c.key.includes('cast-add'));
      expect(castChange!.newValue).toContain('Unknown');
    });

    it('uses video id when video is not found for remove', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingVideoRemoveIds: new Set(['v99']),
            videosData: [],
          }),
        ),
      );
      const videoChange = result.current.changes.find((c) => c.key.includes('video-remove'));
      expect(videoChange!.oldValue).toBe('v99');
    });

    it('uses poster id when poster is not found for remove', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingPosterRemoveIds: new Set(['p99']),
            postersData: [],
          }),
        ),
      );
      const posterChange = result.current.changes.find((c) => c.key.includes('poster-remove'));
      expect(posterChange!.oldValue).toBe('p99');
    });
  });

  describe('entity changes — platform branches', () => {
    it('generates platform add changes with available_from', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingPlatformAdds: [
              {
                platform_id: 'p1',
                available_from: '2025-06-01',
                streaming_url: null,
                _platform: { id: 'p1', name: 'Netflix' } as OTTPlatform,
              },
            ],
          }),
        ),
      );
      const platformChange = result.current.changes.find((c) => c.key.includes('platform-add'));
      expect(platformChange).toBeDefined();
      expect(platformChange!.newValue).toContain('Netflix');
      expect(platformChange!.newValue).toContain('from 2025-06-01');
    });

    it('generates platform add changes without available_from', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingPlatformAdds: [
              {
                platform_id: 'p1',
                available_from: null,
                streaming_url: null,
                _platform: { id: 'p1', name: 'Netflix' } as OTTPlatform,
              },
            ],
          }),
        ),
      );
      const platformChange = result.current.changes.find((c) => c.key.includes('platform-add'));
      expect(platformChange!.newValue).toBe('+ Netflix');
    });

    it('uses platform_id when _platform is null', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
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
      const platformChange = result.current.changes.find((c) => c.key.includes('platform-add'));
      expect(platformChange!.newValue).toBe('+ p1');
    });

    it('generates platform remove changes with platform name', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingPlatformRemoveIds: new Set(['p1']),
            moviePlatforms: [
              { platform_id: 'p1', platform: { id: 'p1', name: 'Netflix' } },
            ] as never[],
          }),
        ),
      );
      const platformChange = result.current.changes.find((c) => c.key.includes('platform-remove'));
      expect(platformChange!.oldValue).toBe('Netflix');
    });

    it('uses platform_id when moviePlatform has no platform object', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingPlatformRemoveIds: new Set(['p1']),
            moviePlatforms: [] as never[],
          }),
        ),
      );
      const platformChange = result.current.changes.find((c) => c.key.includes('platform-remove'));
      expect(platformChange!.oldValue).toBe('p1');
    });
  });

  describe('entity changes — production house branches', () => {
    it('generates PH add changes with name', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingPHAdds: [
              {
                production_house_id: 'ph1',
                _ph: { id: 'ph1', name: 'Studio A' } as ProductionHouse,
              },
            ],
          }),
        ),
      );
      const phChange = result.current.changes.find((c) => c.key.includes('ph-add'));
      expect(phChange!.newValue).toBe('+ Studio A');
    });

    it('uses production_house_id when _ph is null', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingPHAdds: [
              {
                production_house_id: 'ph1',
                _ph: undefined,
              },
            ],
          }),
        ),
      );
      const phChange = result.current.changes.find((c) => c.key.includes('ph-add'));
      expect(phChange!.newValue).toBe('+ ph1');
    });

    it('generates PH remove changes with PH name', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingPHRemoveIds: new Set(['ph1']),
            movieProductionHouses: [
              { production_house_id: 'ph1', production_house: { id: 'ph1', name: 'Studio A' } },
            ] as never[],
          }),
        ),
      );
      const phChange = result.current.changes.find((c) => c.key.includes('ph-remove'));
      expect(phChange!.oldValue).toBe('Studio A');
    });

    it('uses PH id when production_house object is missing', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingPHRemoveIds: new Set(['ph1']),
            movieProductionHouses: [] as never[],
          }),
        ),
      );
      const phChange = result.current.changes.find((c) => c.key.includes('ph-remove'));
      expect(phChange!.oldValue).toBe('ph1');
    });
  });

  describe('entity changes — theatrical run branches', () => {
    it('generates run remove changes with release_date', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingRunRemoveIds: new Set(['r1']),
            theatricalRuns: [{ id: 'r1', release_date: '2025-03-15', label: 'Regular' }] as never[],
          }),
        ),
      );
      const runChange = result.current.changes.find((c) => c.key.includes('run-remove'));
      expect(runChange!.oldValue).toBe('2025-03-15');
    });

    it('uses run id when run is not found', () => {
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingRunRemoveIds: new Set(['r1']),
            theatricalRuns: [] as never[],
          }),
        ),
      );
      const runChange = result.current.changes.find((c) => c.key.includes('run-remove'));
      expect(runChange!.oldValue).toBe('r1');
    });

    it('generates run end changes with release_date', () => {
      const endIds = new Map([['r1', '2025-04-15']]);
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingRunEndIds: endIds,
            theatricalRuns: [{ id: 'r1', release_date: '2025-03-01', label: null }] as never[],
          }),
        ),
      );
      const endChange = result.current.changes.find((c) => c.key.includes('run-end'));
      expect(endChange!.oldValue).toBe('2025-03-01');
      expect(endChange!.newValue).toBe('ends 2025-04-15');
    });

    it('uses run id when run is not found for end date change', () => {
      const endIds = new Map([['r99', '2025-04-15']]);
      const { result } = renderHook(() =>
        useMovieEditChanges(
          makeParams({
            pendingRunEndIds: endIds,
            theatricalRuns: [] as never[],
          }),
        ),
      );
      const endChange = result.current.changes.find((c) => c.key.includes('run-end'));
      expect(endChange!.oldValue).toBe('r99');
    });
  });
});
