/**
 * Tests for sync-extended.ts — videos, watch providers, keywords,
 * and extended metadata sync operations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TmdbVideo, TmdbMovieDetailExtended } from '../../lib/tmdbTypes';

vi.mock('../../lib/tmdb', () => ({
  getWatchProviders: vi.fn(),
}));

vi.mock('../../lib/tmdbTypes', async () => {
  const actual = await vi.importActual<typeof import('../../lib/tmdbTypes')>('../../lib/tmdbTypes');
  return {
    ...actual,
    mapTmdbVideoType: vi.fn(),
  };
});

vi.mock('../../lib/sync-images', () => ({
  syncAllImages: vi.fn(),
}));

import { syncVideos, syncWatchProviders, syncKeywords } from '../../lib/sync-extended';
import { getWatchProviders } from '../../lib/tmdb';
import { mapTmdbVideoType } from '../../lib/tmdbTypes';

const createMockSupabase = () => {
  const chain = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ error: null }),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  Object.values(chain).forEach((fn) => {
    if (typeof fn.mockReturnThis === 'function') {
      fn.mockReturnThis();
    }
  });
  return chain;
};

const MOVIE_ID = 'movie-123';

describe('syncVideos', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
    vi.mocked(mapTmdbVideoType).mockReturnValue('trailer');
  });

  it('syncs YouTube videos and returns count', async () => {
    const videos: TmdbVideo[] = [
      {
        key: 'yt1',
        site: 'YouTube',
        type: 'Trailer',
        name: 'Official Trailer',
        published_at: '2024-01-15T10:00:00Z',
      },
      {
        key: 'yt2',
        site: 'YouTube',
        type: 'Teaser',
        name: 'Teaser',
        published_at: '2024-01-10T08:00:00Z',
      },
    ];

    const result = await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);

    expect(result).toBe(2);
    expect(supabase.from).toHaveBeenCalledWith('movie_videos');
    expect(supabase.insert).toHaveBeenCalledTimes(2);
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        movie_id: MOVIE_ID,
        youtube_id: 'yt1',
        title: 'Official Trailer',
        video_date: '2024-01-15',
        display_order: 0,
        tmdb_video_key: 'yt1',
      }),
    );
  });

  it('filters out non-YouTube videos', async () => {
    const videos: TmdbVideo[] = [
      { key: 'v1', site: 'Vimeo', type: 'Trailer', name: 'Vimeo Trailer', published_at: '' },
      { key: 'yt1', site: 'YouTube', type: 'Trailer', name: 'YT Trailer', published_at: '' },
    ];

    const result = await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);

    expect(result).toBe(1);
    expect(supabase.insert).toHaveBeenCalledTimes(1);
  });

  it('returns 0 for empty video list', async () => {
    const result = await syncVideos(MOVIE_ID, [], supabase as unknown as SupabaseClient);
    expect(result).toBe(0);
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it('maps video type via mapTmdbVideoType', async () => {
    vi.mocked(mapTmdbVideoType).mockReturnValue('teaser');
    const videos: TmdbVideo[] = [
      { key: 'yt1', site: 'YouTube', type: 'Teaser', name: '', published_at: '' },
    ];

    await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);

    expect(mapTmdbVideoType).toHaveBeenCalledWith('Teaser');
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ video_type: 'teaser' }));
  });

  it('uses video.type as title fallback when name is empty', async () => {
    const videos: TmdbVideo[] = [
      { key: 'yt1', site: 'YouTube', type: 'Clip', name: '', published_at: '' },
    ];

    await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);

    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ title: 'Clip' }));
  });
});

describe('syncWatchProviders', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('uses existing platform by tmdb_provider_id and inserts link', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue([
      { provider_id: 532, provider_name: 'Aha', logo_path: '/aha.png' },
    ]);
    supabase.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'aha' }, error: null }) // platform found
      .mockResolvedValueOnce({ data: null, error: null }); // not already linked

    const result = await syncWatchProviders(
      MOVIE_ID,
      999,
      'key',
      supabase as unknown as SupabaseClient,
    );

    expect(result).toBe(1);
    expect(supabase.insert).toHaveBeenCalledWith({
      movie_id: MOVIE_ID,
      platform_id: 'aha',
    });
  });

  it('auto-creates platform when not found by tmdb_provider_id', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue([
      { provider_id: 999, provider_name: 'New Service', logo_path: '' },
    ]);
    // platform not found → insert triggers → but mock chain won't fully
    // support .insert().select().single(), so we verify it attempts creation
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // platform not found
    // Mock the chained .insert().select('id').single() for platform creation
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'new-service' }, error: null });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock });
    supabase.insert.mockReturnValueOnce({ select: selectAfterInsert } as never);
    // Not already linked
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await syncWatchProviders(
      MOVIE_ID,
      1,
      'key',
      supabase as unknown as SupabaseClient,
    );

    expect(result).toBe(1);
    expect(singleMock).toHaveBeenCalled();
  });

  it('skips already linked providers', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue([
      { provider_id: 532, provider_name: 'Aha', logo_path: '' },
    ]);
    supabase.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'aha' }, error: null }) // platform found
      .mockResolvedValueOnce({ data: { movie_id: MOVIE_ID }, error: null }); // already linked

    const result = await syncWatchProviders(
      MOVIE_ID,
      1,
      'key',
      supabase as unknown as SupabaseClient,
    );

    expect(result).toBe(0);
  });

  it('returns 0 when no providers from TMDB', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue([]);

    const result = await syncWatchProviders(
      MOVIE_ID,
      1,
      'key',
      supabase as unknown as SupabaseClient,
    );

    expect(result).toBe(0);
  });
});

describe('syncKeywords', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('inserts keywords and returns count', async () => {
    const detail = {
      keywords: {
        keywords: [
          { id: 1, name: 'action' },
          { id: 2, name: 'drama' },
        ],
      },
    } as unknown as TmdbMovieDetailExtended;

    const result = await syncKeywords(MOVIE_ID, detail, supabase as unknown as SupabaseClient);

    expect(result).toBe(2);
    expect(supabase.delete).toHaveBeenCalled();
    expect(supabase.insert).toHaveBeenCalledWith([
      { movie_id: MOVIE_ID, keyword_id: 1, keyword_name: 'action' },
      { movie_id: MOVIE_ID, keyword_id: 2, keyword_name: 'drama' },
    ]);
  });

  it('returns 0 when no keywords', async () => {
    const detail = { keywords: { keywords: [] } } as unknown as TmdbMovieDetailExtended;
    const result = await syncKeywords(MOVIE_ID, detail, supabase as unknown as SupabaseClient);
    expect(result).toBe(0);
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it('returns 0 when keywords field is missing', async () => {
    const detail = {} as unknown as TmdbMovieDetailExtended;
    const result = await syncKeywords(MOVIE_ID, detail, supabase as unknown as SupabaseClient);
    expect(result).toBe(0);
  });
});
