import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/hooks/useImageUpload', () => ({
  uploadImage: vi.fn(),
}));

import { createCommonFormHandlers, type CommonFormDeps } from '@/hooks/createCommonFormHandlers';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

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
  trailer_url: '',
  in_theaters: false,
  premiere_date: '',
  original_language: 'te',
  is_featured: false,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
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
  it('removes pending video by index', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handleVideoRemove('pending-video-1', true);

    expect(deps.setPendingVideoAdds).toHaveBeenCalledTimes(1);
    // Call the updater and verify it filters by index
    const updater = (deps.setPendingVideoAdds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const items = [
      {
        youtube_id: 'a',
        title: 'A',
        video_type: 'trailer',
        description: null,
        video_date: null,
        duration: null,
        display_order: 0,
      },
      {
        youtube_id: 'b',
        title: 'B',
        video_type: 'teaser',
        description: null,
        video_date: null,
        duration: null,
        display_order: 1,
      },
      {
        youtube_id: 'c',
        title: 'C',
        video_type: 'song',
        description: null,
        video_date: null,
        duration: null,
        display_order: 2,
      },
    ];
    const result = updater(items);
    // Index 1 should be removed
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
  it('removes pending cast by index', () => {
    const handlers = createCommonFormHandlers(deps);
    handlers.handleCastRemove('pending-cast-0', true);

    expect(deps.setPendingCastAdds).toHaveBeenCalledTimes(1);
    const updater = (deps.setPendingCastAdds as ReturnType<typeof vi.fn>).mock.calls[0][0];
    const items = [
      { actor_id: 'a1', character_name: 'Hero', display_order: 0 },
      { actor_id: 'a2', character_name: 'Villain', display_order: 1 },
    ];
    const result = updater(items);
    // Index 0 should be removed
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
        is_main: false,
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
});
