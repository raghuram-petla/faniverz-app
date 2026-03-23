import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { UseMovieEditChangesParams } from '@/hooks/useMovieEditTypes';
import type { MovieForm } from '@/hooks/useMovieEditTypes';
import type { PendingCastAdd } from '@/components/movie-edit/CastSection';
import type { PendingRun } from '@/components/movie-edit/TheatricalRunsSection';
import type {
  PendingVideoAdd,
  PendingPosterAdd,
  PendingPlatformAdd,
  PendingPHAdd,
} from '@/hooks/useMovieEditTypes';

vi.mock('@/hooks/useFormChanges', () => ({
  useFormChanges: vi.fn(() => ({ changes: [], isDirty: false, changeCount: 0 })),
}));

vi.mock('@/hooks/useMovieEditChangesRevert', () => ({
  revertEntity: vi.fn(),
}));

import { useMovieEditChanges } from '@/hooks/useMovieEditChanges';
import { useFormChanges } from '@/hooks/useFormChanges';
import { revertEntity } from '@/hooks/useMovieEditChangesRevert';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeForm(overrides: Partial<MovieForm> = {}): MovieForm {
  return {
    title: 'Test Movie',
    poster_url: '',
    backdrop_url: '',
    release_date: '',
    runtime: '',
    genres: [],
    certification: '',
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
    ...overrides,
  };
}

function makeParams(overrides: Partial<UseMovieEditChangesParams> = {}): UseMovieEditChangesParams {
  return {
    form: makeForm(),
    initialForm: makeForm(),
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
    pendingMainPosterId: null,
    savedMainPosterId: null,
    postersData: [],
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

// ── Tests ────────────────────────────────────────────────────────────────────

describe('useMovieEditChanges', () => {
  it('returns empty changes when no diffs exist', () => {
    const params = makeParams();
    const { result } = renderHook(() => useMovieEditChanges(params));

    expect(result.current.changes).toEqual([]);
    expect(result.current.changeCount).toBe(0);
  });

  it('includes basic changes from useFormChanges', () => {
    const mockChange = {
      key: 'title',
      label: 'Title',
      type: 'text' as const,
      oldValue: 'Old',
      newValue: 'New',
      oldDisplay: 'Old',
      newDisplay: 'New',
    };
    vi.mocked(useFormChanges).mockReturnValue({
      changes: [mockChange],
      isDirty: true,
      changeCount: 1,
    });

    const params = makeParams();
    const { result } = renderHook(() => useMovieEditChanges(params));

    expect(result.current.changes).toContainEqual(mockChange);
    expect(result.current.changeCount).toBeGreaterThanOrEqual(1);

    vi.mocked(useFormChanges).mockReturnValue({
      changes: [],
      isDirty: false,
      changeCount: 0,
    });
  });

  // ── Genre changes ──────────────────────────────────────────────────────

  describe('genre changes', () => {
    it('detects added genres', () => {
      const params = makeParams({
        initialForm: makeForm({ genres: ['Action'] }),
        form: makeForm({ genres: ['Action', 'Drama'] }),
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const genreChange = result.current.changes.find((c) => c.key === 'genres');
      expect(genreChange).toBeDefined();
      expect(genreChange!.newDisplay).toContain('+ Drama');
    });

    it('detects removed genres', () => {
      const params = makeParams({
        initialForm: makeForm({ genres: ['Action', 'Drama'] }),
        form: makeForm({ genres: ['Action'] }),
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const genreChange = result.current.changes.find((c) => c.key === 'genres');
      expect(genreChange).toBeDefined();
      expect(genreChange!.oldDisplay).toContain('- Drama');
    });

    it('shows (none) when no genres added or removed side is empty', () => {
      const params = makeParams({
        initialForm: makeForm({ genres: [] }),
        form: makeForm({ genres: ['Comedy'] }),
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const genreChange = result.current.changes.find((c) => c.key === 'genres');
      expect(genreChange).toBeDefined();
      expect(genreChange!.oldDisplay).toBe('(none)');
      expect(genreChange!.newDisplay).toContain('+ Comedy');
    });

    it('returns no genre change when genres are identical', () => {
      const params = makeParams({
        initialForm: makeForm({ genres: ['Action'] }),
        form: makeForm({ genres: ['Action'] }),
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const genreChange = result.current.changes.find((c) => c.key === 'genres');
      expect(genreChange).toBeUndefined();
    });

    it('returns no genre changes when initialForm is null', () => {
      const params = makeParams({ initialForm: null });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const genreChange = result.current.changes.find((c) => c.key === 'genres');
      expect(genreChange).toBeUndefined();
    });
  });

  // ── Entity changes ────────────────────────────────────────────────────

  describe('entity changes', () => {
    it('tracks pending cast adds with actor name and role', () => {
      const castAdd: PendingCastAdd = {
        _id: 'c1',
        actor_id: 'a1',
        credit_type: 'cast',
        role_name: 'Hero',
        role_order: null,
        display_order: 1,
        _actor: { name: 'Mahesh Babu' },
      };
      const params = makeParams({ pendingCastAdds: [castAdd] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:cast-add-c1');
      expect(change).toBeDefined();
      expect(change!.newDisplay).toBe('+ Mahesh Babu as Hero');
    });

    it('tracks cast add without role name', () => {
      const castAdd: PendingCastAdd = {
        _id: 'c2',
        actor_id: 'a2',
        credit_type: 'cast',
        role_name: null,
        role_order: null,
        display_order: 1,
        _actor: { name: 'Jr NTR' },
      };
      const params = makeParams({ pendingCastAdds: [castAdd] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:cast-add-c2');
      expect(change!.newDisplay).toBe('+ Jr NTR');
    });

    it('tracks pending cast removes', () => {
      const params = makeParams({
        pendingCastRemoveIds: new Set(['cast-1']),
        castData: [{ id: 'cast-1', actor: { name: 'Prabhas' } }],
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:cast-remove-cast-1');
      expect(change).toBeDefined();
      expect(change!.oldDisplay).toBe('Prabhas');
      expect(change!.newDisplay).toBe('(removed)');
    });

    it('tracks cast reorder', () => {
      const params = makeParams({ localCastOrder: ['a', 'b'] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:cast-reorder');
      expect(change).toBeDefined();
      expect(change!.newDisplay).toBe('Reordered');
    });

    it('tracks pending video adds', () => {
      const video: PendingVideoAdd = {
        _id: 'v1',
        youtube_id: 'yt1',
        title: 'Official Trailer',
        video_type: 'trailer',
        description: null,
        video_date: null,
        display_order: 1,
      };
      const params = makeParams({ pendingVideoAdds: [video] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:video-add-v1');
      expect(change).toBeDefined();
      expect(change!.newDisplay).toBe('+ Official Trailer');
    });

    it('tracks pending video removes', () => {
      const params = makeParams({
        pendingVideoRemoveIds: new Set(['vid-1']),
        videosData: [{ id: 'vid-1', title: 'Teaser' }],
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:video-remove-vid-1');
      expect(change).toBeDefined();
      expect(change!.oldDisplay).toBe('Teaser');
    });

    it('tracks pending poster adds', () => {
      const poster: PendingPosterAdd = {
        _id: 'p1',
        image_url: 'https://example.com/poster.jpg',
        title: 'Main Poster',
        description: null,
        poster_date: null,
        is_main_poster: false,
        is_main_backdrop: false,
        image_type: 'poster',
        display_order: 1,
      };
      const params = makeParams({ pendingPosterAdds: [poster] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:poster-add-p1');
      expect(change).toBeDefined();
      expect(change!.newDisplay).toBe('+ Main Poster');
    });

    it('tracks pending poster removes', () => {
      const params = makeParams({
        pendingPosterRemoveIds: new Set(['poster-1']),
        postersData: [
          {
            id: 'poster-1',
            title: 'Old Poster',
            image_url: '',
            image_type: 'poster' as const,
            is_main_poster: false,
            is_main_backdrop: false,
            description: null,
            poster_date: null,
            tmdb_file_path: null,
            iso_639_1: null,
            width: null,
            height: null,
            vote_average: 0,
            display_order: 0,
            created_at: '',
            movie_id: '',
          },
        ],
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:poster-remove-poster-1');
      expect(change).toBeDefined();
      expect(change!.oldDisplay).toBe('Old Poster');
    });

    it('tracks main poster change when different from saved', () => {
      const params = makeParams({
        pendingMainPosterId: 'new-poster',
        savedMainPosterId: 'old-poster',
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:main-poster');
      expect(change).toBeDefined();
      expect(change!.newDisplay).toBe('Changed');
    });

    it('does not track main poster when same as saved', () => {
      const params = makeParams({
        pendingMainPosterId: 'same-poster',
        savedMainPosterId: 'same-poster',
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:main-poster');
      expect(change).toBeUndefined();
    });

    it('tracks pending platform adds', () => {
      const platform: PendingPlatformAdd = {
        platform_id: 'plt-1',
        available_from: '2025-06-01',
        streaming_url: null,
        _platform: {
          id: 'plt-1',
          name: 'Netflix',
          logo_url: null,
          tmdb_provider_id: null,
          alias_ids: null,
        },
      };
      const params = makeParams({ pendingPlatformAdds: [platform] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:platform-add-plt-1');
      expect(change).toBeDefined();
      expect(change!.newDisplay).toContain('+ Netflix');
      expect(change!.newDisplay).toContain('from 2025-06-01');
    });

    it('tracks platform add without available_from date', () => {
      const platform: PendingPlatformAdd = {
        platform_id: 'plt-2',
        available_from: null,
        streaming_url: null,
        _platform: {
          id: 'plt-2',
          name: 'Aha',
          logo_url: null,
          tmdb_provider_id: null,
          alias_ids: null,
        },
      };
      const params = makeParams({ pendingPlatformAdds: [platform] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:platform-add-plt-2');
      expect(change!.newDisplay).toBe('+ Aha');
    });

    it('tracks pending platform removes', () => {
      const params = makeParams({
        pendingPlatformRemoveIds: new Set(['plt-1']),
        moviePlatforms: [{ platform_id: 'plt-1', platform: { name: 'Hotstar' } }],
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:platform-remove-plt-1');
      expect(change).toBeDefined();
      expect(change!.oldDisplay).toBe('Hotstar');
    });

    it('tracks pending production house adds', () => {
      const ph: PendingPHAdd = {
        production_house_id: 'ph-1',
        _ph: { id: 'ph-1', name: 'Mythri', logo_url: null },
      };
      const params = makeParams({ pendingPHAdds: [ph] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:ph-add-ph-1');
      expect(change).toBeDefined();
      expect(change!.newDisplay).toBe('+ Mythri');
    });

    it('tracks pending production house removes', () => {
      const params = makeParams({
        pendingPHRemoveIds: new Set(['ph-1']),
        movieProductionHouses: [{ production_house_id: 'ph-1', production_house: { name: 'DVV' } }],
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:ph-remove-ph-1');
      expect(change).toBeDefined();
      expect(change!.oldDisplay).toBe('DVV');
    });

    it('tracks pending theatrical run adds', () => {
      const run: PendingRun = {
        _id: 'run-1',
        release_date: '2025-03-15',
        label: 'Re-release',
      };
      const params = makeParams({ pendingRunAdds: [run] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:run-add-run-1');
      expect(change).toBeDefined();
      expect(change!.newDisplay).toBe('+ 2025-03-15 (Re-release)');
    });

    it('tracks run add without label', () => {
      const run: PendingRun = {
        _id: 'run-2',
        release_date: '2025-01-01',
        label: null,
      };
      const params = makeParams({ pendingRunAdds: [run] });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:run-add-run-2');
      expect(change!.newDisplay).toBe('+ 2025-01-01');
    });

    it('tracks pending run removes', () => {
      const params = makeParams({
        pendingRunRemoveIds: new Set(['run-1']),
        theatricalRuns: [{ id: 'run-1', release_date: '2025-01-15' }],
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:run-remove-run-1');
      expect(change).toBeDefined();
      expect(change!.oldDisplay).toBe('2025-01-15');
    });

    it('tracks pending run end dates', () => {
      const endIds = new Map([['run-1', '2025-06-01']]);
      const params = makeParams({
        pendingRunEndIds: endIds,
        theatricalRuns: [{ id: 'run-1', release_date: '2025-01-01' }],
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:run-end-run-1');
      expect(change).toBeDefined();
      expect(change!.oldDisplay).toBe('2025-01-01');
      expect(change!.newDisplay).toBe('ends 2025-06-01');
    });

    it('uses fallback id when entity not found in data', () => {
      const params = makeParams({
        pendingCastRemoveIds: new Set(['unknown-id']),
        castData: [],
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      const change = result.current.changes.find((c) => c.key === 'entity:cast-remove-unknown-id');
      expect(change!.oldDisplay).toBe('unknown-id');
    });
  });

  // ── onRevertField ─────────────────────────────────────────────────────

  describe('onRevertField', () => {
    it('reverts genre change back to initial', () => {
      const setForm = vi.fn();
      const initial = makeForm({ genres: ['Action'] });
      const params = makeParams({
        initialForm: initial,
        form: makeForm({ genres: ['Action', 'Drama'] }),
        setForm,
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      result.current.onRevertField('genres');
      expect(setForm).toHaveBeenCalled();
      const updater = setForm.mock.calls[0][0];
      const updated = updater(makeForm({ genres: ['Action', 'Drama'] }));
      expect(updated.genres).toEqual(['Action']);
    });

    it('delegates entity revert to revertEntity', () => {
      const params = makeParams();
      const { result } = renderHook(() => useMovieEditChanges(params));

      result.current.onRevertField('entity:cast-add-0');
      expect(revertEntity).toHaveBeenCalledWith('entity:cast-add-0', params);
    });

    it('reverts basic info field to initial value', () => {
      const setForm = vi.fn();
      const initial = makeForm({ title: 'Original Title' });
      const params = makeParams({
        initialForm: initial,
        form: makeForm({ title: 'Changed Title' }),
        setForm,
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      result.current.onRevertField('title');
      expect(setForm).toHaveBeenCalled();
      const updater = setForm.mock.calls[0][0];
      const updated = updater(makeForm({ title: 'Changed Title' }));
      expect(updated.title).toBe('Original Title');
    });

    it('does nothing when initialForm is null', () => {
      const setForm = vi.fn();
      const params = makeParams({ initialForm: null, setForm });
      const { result } = renderHook(() => useMovieEditChanges(params));

      result.current.onRevertField('title');
      expect(setForm).not.toHaveBeenCalled();
    });
  });

  // ── onDiscard ─────────────────────────────────────────────────────────

  describe('onDiscard', () => {
    it('resets form to initialForm and calls resetPendingState', () => {
      const setForm = vi.fn();
      const resetPendingState = vi.fn();
      const initial = makeForm({ title: 'Original' });
      const params = makeParams({
        initialForm: initial,
        setForm,
        resetPendingState,
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      result.current.onDiscard();
      expect(setForm).toHaveBeenCalledWith(initial);
      expect(resetPendingState).toHaveBeenCalled();
    });

    it('does not set form when initialForm is null', () => {
      const setForm = vi.fn();
      const resetPendingState = vi.fn();
      const params = makeParams({
        initialForm: null,
        setForm,
        resetPendingState,
      });
      const { result } = renderHook(() => useMovieEditChanges(params));

      result.current.onDiscard();
      expect(setForm).not.toHaveBeenCalled();
      expect(resetPendingState).toHaveBeenCalled();
    });
  });
});
