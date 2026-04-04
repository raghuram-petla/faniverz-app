import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/useImageUpload', () => ({
  uploadImage: vi.fn(),
}));

import { createCommonFormHandlers } from '@/hooks/createCommonFormHandlers';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

type CommonFormDeps = Parameters<typeof createCommonFormHandlers>[0];

function createMockDeps(): CommonFormDeps {
  return {
    setForm: vi.fn(),
    setPendingVideoAdds: vi.fn(),
    setPendingVideoRemoveIds: vi.fn(),
    setPendingPosterAdds: vi.fn(),
    setPendingPosterRemoveIds: vi.fn(),
    setPendingPlatformAdds: vi.fn(),
    setPendingPlatformRemoveIds: vi.fn(),
    setPendingPHAdds: vi.fn(),
    setPendingPHRemoveIds: vi.fn(),
    setPendingCastAdds: vi.fn(),
    setPendingCastRemoveIds: vi.fn(),
    setPendingRunAdds: vi.fn(),
    setPendingRunRemoveIds: vi.fn(),
    setPendingRunEndIds: vi.fn(),
    setPendingAvailabilityAdds: vi.fn(),
    setPendingAvailabilityRemoveIds: vi.fn(),
  };
}

const defaultForm: MovieForm = {
  title: 'Test Movie',
  poster_url: '',
  backdrop_url: '',
  release_date: '2026-01-01',
  runtime: '120',
  genres: ['Action', 'Drama'],
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
};

let deps: CommonFormDeps;

beforeEach(() => {
  vi.clearAllMocks();
  deps = createMockDeps();
});

describe('updateField', () => {
  it('updates form state with the given field and value', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.updateField('title', 'New Title');

    expect(deps.setForm).toHaveBeenCalledTimes(1);
    // Call the updater function to verify it merges correctly
    const updater = (deps.setForm as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const result = updater(defaultForm);
    expect(result).toEqual({ ...defaultForm, title: 'New Title' });
  });
});

describe('toggleGenre', () => {
  it('adds genre when not present', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.toggleGenre('Comedy');

    const updater = (deps.setForm as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const result = updater(defaultForm);
    expect(result.genres).toEqual(['Action', 'Drama', 'Comedy']);
  });

  it('removes genre when present', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.toggleGenre('Action');

    const updater = (deps.setForm as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const result = updater(defaultForm);
    expect(result.genres).toEqual(['Drama']);
  });
});

describe('handleVideoRemove', () => {
  it('removes pending video by _id', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handleVideoRemove('vid-2', true);

    expect(deps.setPendingVideoAdds).toHaveBeenCalledTimes(1);
    // Call the updater and verify it filters by _id
    const updater = (deps.setPendingVideoAdds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const items = [
      {
        _id: 'vid-1',
        youtube_id: 'a',
        title: 'A',
        video_type: 'trailer',
        description: null,
        video_date: null,
        display_order: 0,
      },
      {
        _id: 'vid-2',
        youtube_id: 'b',
        title: 'B',
        video_type: 'teaser',
        description: null,
        video_date: null,
        display_order: 1,
      },
      {
        _id: 'vid-3',
        youtube_id: 'c',
        title: 'C',
        video_type: 'song',
        description: null,
        video_date: null,
        display_order: 2,
      },
    ];
    const result = updater(items);
    expect(result).toHaveLength(2);
    expect(result[0].youtube_id).toBe('a');
    expect(result[1].youtube_id).toBe('c');
  });

  it('adds to remove set for non-pending video', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handleVideoRemove('real-video-id', false);

    expect(deps.setPendingVideoRemoveIds).toHaveBeenCalledTimes(1);
    const updater = (deps.setPendingVideoRemoveIds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const result = updater(new Set<string>());
    expect(result.has('real-video-id')).toBe(true);
  });
});

describe('handleCastRemove', () => {
  it('removes pending cast by _id', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handleCastRemove('cast-1', true);

    expect(deps.setPendingCastAdds).toHaveBeenCalledTimes(1);
    const updater = (deps.setPendingCastAdds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const items = [
      { _id: 'cast-1', actor_id: 'a1', character_name: 'Hero', display_order: 0 },
      { _id: 'cast-2', actor_id: 'a2', character_name: 'Villain', display_order: 1 },
    ];
    const result = updater(items);
    expect(result).toHaveLength(1);
    expect(result[0].actor_id).toBe('a2');
  });

  it('adds to remove set for non-pending cast', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handleCastRemove('real-cast-id', false);

    expect(deps.setPendingCastRemoveIds).toHaveBeenCalledTimes(1);
    const updater = (deps.setPendingCastRemoveIds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const result = updater(new Set<string>());
    expect(result.has('real-cast-id')).toBe(true);
  });
});

describe('handlePosterRemove', () => {
  it('removes pending poster by stable _id', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handlePosterRemove('pending-poster-abc123', true);

    expect(deps.setPendingPosterAdds).toHaveBeenCalledTimes(1);
    const updater = (deps.setPendingPosterAdds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const items = [
      {
        _id: 'pending-poster-abc123',
        image_url: 'url1',
        title: 'P1',
        description: null,
        poster_date: null,
        is_main_poster: false,
        is_main_backdrop: false,
        image_type: 'poster',
        display_order: 0,
      },
    ];
    const result = updater(items);
    expect(result).toHaveLength(0);
  });
});

describe('handleRunRemove', () => {
  it('adds to remove set for non-pending run', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handleRunRemove('run-123', false);

    expect(deps.setPendingRunRemoveIds).toHaveBeenCalledTimes(1);
    const updater = (deps.setPendingRunRemoveIds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const result = updater(new Set<string>());
    expect(result.has('run-123')).toBe(true);
  });

  it('removes by stable _id for pending run — no index-shift bugs', () => {
    // @sync: regression test — previously used index extraction from 'pending-run-N' strings
    const setPendingRunAdds = vi.fn();
    const localDeps = {
      ...deps,
      setPendingRunAdds,
    };
    const handlers = createCommonFormHandlers(localDeps);
    handlers.handleRunRemove('stable-uuid-2', true);

    expect(setPendingRunAdds).toHaveBeenCalledTimes(1);
    const updater = setPendingRunAdds.mock.calls[0][0];
    const items = [
      { _id: 'stable-uuid-1', release_date: '2025-01-01', label: null },
      { _id: 'stable-uuid-2', release_date: '2025-06-01', label: 'Re-release' },
      { _id: 'stable-uuid-3', release_date: '2025-12-01', label: null },
    ];
    const result = updater(items);
    // Should remove only the middle item by _id, not by index
    expect(result).toHaveLength(2);
    expect(result.find((r: { _id: string }) => r._id === 'stable-uuid-2')).toBeUndefined();
    expect(result.find((r: { _id: string }) => r._id === 'stable-uuid-1')).toBeDefined();
    expect(result.find((r: { _id: string }) => r._id === 'stable-uuid-3')).toBeDefined();
  });
});

describe('handleAvailabilityRemove', () => {
  it('removes pending availability by _id', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handleAvailabilityRemove('avail-1', true);

    expect(deps.setPendingAvailabilityAdds).toHaveBeenCalledTimes(1);
    const updater = (deps.setPendingAvailabilityAdds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const items = [
      {
        _id: 'avail-1',
        platform_id: 'plt-1',
        country_code: 'IN',
        availability_type: 'flatrate' as const,
        available_from: null,
        streaming_url: null,
      },
      {
        _id: 'avail-2',
        platform_id: 'plt-2',
        country_code: 'US',
        availability_type: 'rent' as const,
        available_from: '2026-01-01',
        streaming_url: null,
      },
    ];
    const result = updater(items);
    expect(result).toHaveLength(1);
    expect(result[0]._id).toBe('avail-2');
  });

  it('adds to remove set for non-pending availability', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handleAvailabilityRemove('real-avail-id', false);

    expect(deps.setPendingAvailabilityRemoveIds).toHaveBeenCalledTimes(1);
    const updater = (deps.setPendingAvailabilityRemoveIds as ReturnType<typeof vi.fn>).mock
      .calls[0][0];
    const result = updater(new Set<string>());
    expect(result.has('real-avail-id')).toBe(true);
  });
});
