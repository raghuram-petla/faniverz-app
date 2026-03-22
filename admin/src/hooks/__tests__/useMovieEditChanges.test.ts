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

function makeForm(overrides = {}) {
  return {
    title: 'Test Movie',
    poster_url: '',
    backdrop_url: '',
    release_date: '2025-01-01',
    runtime: 120,
    certification: 'UA',
    synopsis: '',
    trailer_url: '',
    in_theaters: false,
    premiere_date: '',
    original_language: 'te',
    is_featured: false,
    tmdb_id: null,
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
    pendingCastAdds: [],
    pendingCastRemoveIds: new Set(),
    localCastOrder: null,
    castData: [],
    pendingVideoAdds: [],
    pendingVideoRemoveIds: new Set(),
    videosData: [],
    pendingPosterAdds: [],
    pendingPosterRemoveIds: new Set(),
    postersData: [],
    pendingMainPosterId: null,
    savedMainPosterId: null,
    pendingPlatformAdds: [],
    pendingPlatformRemoveIds: new Set(),
    moviePlatforms: [],
    pendingPHAdds: [],
    pendingPHRemoveIds: new Set(),
    movieProductionHouses: [],
    pendingRunAdds: [],
    pendingRunRemoveIds: new Set(),
    pendingRunEndIds: new Map(),
    theatricalRuns: [],
    resetPendingState: vi.fn(),
    ...overrides,
  };
}

describe('useMovieEditChanges', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useFormChanges).mockReturnValue({ changes: [] } as ReturnType<typeof useFormChanges>);
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
          movie_id: 'movie-1',
          actor_id: 'actor-1',
          role_name: 'Hero',
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
          movie_id: 'movie-1',
          youtube_id: 'abc123',
          title: 'New Trailer',
          video_type: 'trailer',
          display_order: 0,
          created_at: '',
          description: null,
          video_date: null,
        } as never,
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
          country_code: 'US',
          availability_type: 'flatrate',
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
});
