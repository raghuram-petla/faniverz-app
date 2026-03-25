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

import {
  syncVideos,
  syncWatchProviders,
  syncKeywords,
  syncProductionCompanies,
} from '../../lib/sync-extended';
import type { TmdbProductionCompany } from '../../lib/tmdbTypes';
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
    in: vi.fn().mockResolvedValue({ error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
  };
  // Default: existing keys/ids query returns empty (no existing items)
  chain.not.mockImplementation(() => ({ data: [], error: null }));
  Object.values(chain).forEach((fn) => {
    if (typeof fn.mockReturnThis === 'function' && fn !== chain.not) {
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

  it('skips already-synced videos (additive behavior)', async () => {
    const videos: TmdbVideo[] = [
      { key: 'existing-key', site: 'YouTube', type: 'Trailer', name: 'Old', published_at: '' },
      { key: 'new-key', site: 'YouTube', type: 'Teaser', name: 'New', published_at: '' },
    ];

    // First .not call returns existing video keys
    supabase.not.mockImplementationOnce(() => ({
      data: [{ tmdb_video_key: 'existing-key' }],
      error: null,
    }));
    // Second .not call returns all existing for cleanup
    supabase.not.mockImplementationOnce(() => ({
      data: [
        { id: 'v1', tmdb_video_key: 'existing-key' },
        { id: 'v2', tmdb_video_key: 'new-key' },
      ],
      error: null,
    }));

    const result = await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);

    // Only the new video should be inserted
    expect(supabase.insert).toHaveBeenCalledTimes(1);
    expect(supabase.insert).toHaveBeenCalledWith(
      expect.objectContaining({ tmdb_video_key: 'new-key' }),
    );
    // Count includes existing + new
    expect(result).toBe(2);
  });

  it('cleans up stale videos not in current TMDB list', async () => {
    const videos: TmdbVideo[] = [
      { key: 'current', site: 'YouTube', type: 'Trailer', name: 'Current', published_at: '' },
    ];

    // getExisting returns empty (no existing)
    supabase.not.mockImplementationOnce(() => ({
      data: [],
      error: null,
    }));
    // cleanup query returns stale + current
    supabase.not.mockImplementationOnce(() => ({
      data: [
        { id: 'stale-id', tmdb_video_key: 'removed-video' },
        { id: 'current-id', tmdb_video_key: 'current' },
      ],
      error: null,
    }));

    await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);

    expect(supabase.in).toHaveBeenCalledWith('id', ['stale-id']);
  });

  it('does not count failed video inserts', async () => {
    const videos: TmdbVideo[] = [
      { key: 'yt1', site: 'YouTube', type: 'Trailer', name: 'Test', published_at: '' },
    ];

    supabase.insert.mockResolvedValueOnce({ error: { message: 'insert failed' } });

    const result = await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);
    // Insert failed, count should be 0
    expect(result).toBe(0);
  });

  it('handles null published_at in video date', async () => {
    const videos: TmdbVideo[] = [
      {
        key: 'yt1',
        site: 'YouTube',
        type: 'Trailer',
        name: 'Test',
        published_at: null as unknown as string,
      },
    ];

    const result = await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);
    expect(result).toBe(1);
    expect(supabase.insert).toHaveBeenCalledWith(expect.objectContaining({ video_date: null }));
  });

  it('handles null data from stale video cleanup query', async () => {
    const videos: TmdbVideo[] = [
      { key: 'yt1', site: 'YouTube', type: 'Trailer', name: 'T', published_at: '' },
    ];

    // getExisting returns empty
    supabase.not.mockImplementationOnce(() => ({
      data: [],
      error: null,
    }));
    // cleanup query returns null
    supabase.not.mockImplementationOnce(() => ({
      data: null,
      error: null,
    }));

    const result = await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);
    expect(result).toBe(1);
    // in() should not be called for stale cleanup since null -> []
    expect(supabase.in).not.toHaveBeenCalledWith('id', expect.anything());
  });

  it('skips all inserts when all videos already exist', async () => {
    const videos: TmdbVideo[] = [
      { key: 'yt1', site: 'YouTube', type: 'Trailer', name: 'A', published_at: '' },
    ];

    supabase.not.mockImplementationOnce(() => ({
      data: [{ tmdb_video_key: 'yt1' }],
      error: null,
    }));
    supabase.not.mockImplementationOnce(() => ({
      data: [{ id: 'v1', tmdb_video_key: 'yt1' }],
      error: null,
    }));

    const result = await syncVideos(MOVIE_ID, videos, supabase as unknown as SupabaseClient);

    expect(supabase.insert).not.toHaveBeenCalled();
    expect(result).toBe(1);
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
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null }); // platform not found
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'new-service' }, error: null });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock });
    supabase.insert.mockReturnValueOnce({ select: selectAfterInsert } as never);
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

  it('inserts missing keywords and returns total count', async () => {
    // eq returns the existing query result (no existing keywords)
    supabase.eq.mockImplementation(function (this: unknown) {
      return { data: [], error: null };
    });

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

  it('skips already-existing keywords (additive behavior)', async () => {
    // eq returns existing keyword_ids
    supabase.eq.mockImplementation(function () {
      return { data: [{ keyword_id: 1 }], error: null };
    });

    const detail = {
      keywords: {
        keywords: [
          { id: 1, name: 'action' },
          { id: 2, name: 'drama' },
        ],
      },
    } as unknown as TmdbMovieDetailExtended;

    const result = await syncKeywords(MOVIE_ID, detail, supabase as unknown as SupabaseClient);

    // Only missing keyword (id:2) should be inserted
    expect(supabase.insert).toHaveBeenCalledWith([
      { movie_id: MOVIE_ID, keyword_id: 2, keyword_name: 'drama' },
    ]);
    expect(result).toBe(2);
  });

  it('cleans up stale keywords not in current TMDB list', async () => {
    // eq returns existing keywords including a stale one — but must also be
    // chainable for .delete().eq().eq() in the cleanup code
    const existingData = { data: [{ keyword_id: 1 }, { keyword_id: 999 }], error: null };
    supabase.eq.mockImplementation(function () {
      // Return a chainable + thenable result
      // Note: `then` must resolve with a plain object (not the thenable itself)
      // to avoid infinite promise resolution loop
      const plain = { ...existingData };
      return {
        ...plain,
        eq: vi.fn().mockResolvedValue({ error: null }),
        then: (onFulfill: (v: unknown) => unknown, onReject?: (e: unknown) => unknown) =>
          Promise.resolve(plain).then(onFulfill, onReject),
      };
    });

    const detail = {
      keywords: {
        keywords: [{ id: 1, name: 'action' }],
      },
    } as unknown as TmdbMovieDetailExtended;

    const result = await syncKeywords(MOVIE_ID, detail, supabase as unknown as SupabaseClient);

    // Stale keyword 999 should be deleted
    expect(supabase.delete).toHaveBeenCalled();
    expect(result).toBe(1);
  });

  it('returns existing count when keyword insert fails', async () => {
    supabase.eq.mockImplementation(function () {
      return { data: [{ keyword_id: 1 }], error: null };
    });
    // Insert fails
    supabase.insert.mockResolvedValueOnce({ error: { message: 'insert failed' } });

    const detail = {
      keywords: {
        keywords: [
          { id: 1, name: 'action' },
          { id: 2, name: 'drama' },
        ],
      },
    } as unknown as TmdbMovieDetailExtended;

    const result = await syncKeywords(MOVIE_ID, detail, supabase as unknown as SupabaseClient);

    // Only 1 existing keyword, insert of new one failed
    expect(result).toBe(1);
  });

  it('handles null existingRows via nullish coalesce', async () => {
    supabase.eq.mockImplementation(function () {
      return { data: null, error: null };
    });

    const detail = {
      keywords: {
        keywords: [{ id: 1, name: 'action' }],
      },
    } as unknown as TmdbMovieDetailExtended;

    const result = await syncKeywords(MOVIE_ID, detail, supabase as unknown as SupabaseClient);

    // null existingRows defaults to [], all keywords are "missing"
    expect(supabase.insert).toHaveBeenCalled();
    expect(result).toBe(1);
  });

  it('does not insert when all keywords already exist', async () => {
    supabase.eq.mockImplementation(function () {
      return { data: [{ keyword_id: 1 }, { keyword_id: 2 }], error: null };
    });

    const detail = {
      keywords: {
        keywords: [
          { id: 1, name: 'action' },
          { id: 2, name: 'drama' },
        ],
      },
    } as unknown as TmdbMovieDetailExtended;

    const result = await syncKeywords(MOVIE_ID, detail, supabase as unknown as SupabaseClient);

    expect(supabase.insert).not.toHaveBeenCalled();
    expect(result).toBe(2);
  });
});

describe('syncProductionCompanies', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('returns 0 for empty companies array', async () => {
    const result = await syncProductionCompanies(
      MOVIE_ID,
      [],
      supabase as unknown as SupabaseClient,
    );
    expect(result).toBe(0);
    expect(supabase.insert).not.toHaveBeenCalled();
  });

  it('uses existing production house by tmdb_company_id', async () => {
    const companies: TmdbProductionCompany[] = [
      { id: 100, name: 'Dream Warrior Pictures', logo_path: '/logo.png', origin_country: 'IN' },
    ];
    supabase.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'ph-existing' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    const result = await syncProductionCompanies(
      MOVIE_ID,
      companies,
      supabase as unknown as SupabaseClient,
    );

    expect(result).toBe(1);
    expect(supabase.insert).toHaveBeenCalledWith({
      movie_id: MOVIE_ID,
      production_house_id: 'ph-existing',
    });
  });

  it('auto-creates production house when not found', async () => {
    const companies: TmdbProductionCompany[] = [
      { id: 200, name: 'New Studio', logo_path: '/logo.png', origin_country: 'US' },
    ];
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const singleFn = vi.fn().mockResolvedValue({ data: { id: 'ph-new' }, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    supabase.insert.mockReturnValueOnce({ select: selectFn } as never);
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await syncProductionCompanies(
      MOVIE_ID,
      companies,
      supabase as unknown as SupabaseClient,
    );

    expect(result).toBe(1);
    expect(singleFn).toHaveBeenCalled();
  });

  it('skips company when PH creation fails', async () => {
    const companies: TmdbProductionCompany[] = [
      { id: 300, name: 'Bad Studio', logo_path: null, origin_country: '' },
    ];
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const singleFn = vi.fn().mockResolvedValue({ data: null, error: { message: 'insert failed' } });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    supabase.insert.mockReturnValueOnce({ select: selectFn } as never);

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await syncProductionCompanies(
      MOVIE_ID,
      companies,
      supabase as unknown as SupabaseClient,
    );
    consoleWarn.mockRestore();

    expect(result).toBe(0);
  });

  it('skips already linked production houses', async () => {
    const companies: TmdbProductionCompany[] = [
      { id: 100, name: 'Existing Studio', logo_path: null, origin_country: 'IN' },
    ];
    supabase.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'ph-1' }, error: null })
      .mockResolvedValueOnce({ data: { movie_id: MOVIE_ID }, error: null });

    const result = await syncProductionCompanies(
      MOVIE_ID,
      companies,
      supabase as unknown as SupabaseClient,
    );
    expect(result).toBe(0);
  });

  it('sets logo_url to null when logo_path is null', async () => {
    const companies: TmdbProductionCompany[] = [
      { id: 201, name: 'No Logo Studio', logo_path: null, origin_country: 'IN' },
    ];
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const singleFn = vi.fn().mockResolvedValue({ data: { id: 'ph-new' }, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    supabase.insert.mockReturnValueOnce({ select: selectFn } as never);
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await syncProductionCompanies(
      MOVIE_ID,
      companies,
      supabase as unknown as SupabaseClient,
    );
    expect(result).toBe(1);
  });

  it('does not count when movie_production_houses link insert fails', async () => {
    const companies: TmdbProductionCompany[] = [
      { id: 100, name: 'Existing Studio', logo_path: null, origin_country: 'IN' },
    ];
    supabase.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'ph-1' }, error: null })
      .mockResolvedValueOnce({ data: null, error: null }); // not linked yet
    // Link insert fails
    supabase.insert.mockResolvedValueOnce({ error: { message: 'link insert failed' } });

    const result = await syncProductionCompanies(
      MOVIE_ID,
      companies,
      supabase as unknown as SupabaseClient,
    );
    // linkErr is truthy, so count should not increment
    expect(result).toBe(0);
  });

  it('sets empty string origin_country to null', async () => {
    const companies: TmdbProductionCompany[] = [
      { id: 202, name: 'International Studio', logo_path: null, origin_country: '' },
    ];
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const singleFn = vi.fn().mockResolvedValue({ data: { id: 'ph-new' }, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    supabase.insert.mockReturnValueOnce({ select: selectFn } as never);
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await syncProductionCompanies(
      MOVIE_ID,
      companies,
      supabase as unknown as SupabaseClient,
    );
    expect(result).toBe(1);
  });
});

describe('syncWatchProviders - movie_platforms insert error', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('does not count when movie_platforms link insert fails', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue([
      { provider_id: 532, provider_name: 'Aha', logo_path: '/aha.png' },
    ]);
    supabase.maybeSingle
      .mockResolvedValueOnce({ data: { id: 'aha' }, error: null }) // platform found
      .mockResolvedValueOnce({ data: null, error: null }); // not already linked

    // Insert fails for movie_platforms link
    supabase.insert.mockResolvedValueOnce({ error: { message: 'link insert failed' } });

    const result = await syncWatchProviders(
      MOVIE_ID,
      999,
      'key',
      supabase as unknown as SupabaseClient,
    );

    expect(result).toBe(0);
  });
});

describe('syncWatchProviders - platform with logo_path', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('creates platform with logo_url from logo_path', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue([
      { provider_id: 999, provider_name: 'New Service', logo_path: '/logo.png' },
    ]);
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const singleMock = vi.fn().mockResolvedValue({ data: { id: 'new-service-999' }, error: null });
    const selectAfterInsert = vi.fn().mockReturnValue({ single: singleMock });
    supabase.insert.mockReturnValueOnce({ select: selectAfterInsert } as never);
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await syncWatchProviders(
      MOVIE_ID,
      1,
      'key',
      supabase as unknown as SupabaseClient,
    );

    expect(result).toBe(1);
  });
});

describe('syncKeywords - null keywords field', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('returns 0 when keywords.keywords is null', async () => {
    const detail = { keywords: { keywords: null } } as unknown as TmdbMovieDetailExtended;
    const result = await syncKeywords(MOVIE_ID, detail, supabase as unknown as SupabaseClient);
    expect(result).toBe(0);
  });
});

describe('syncWatchProviders edge cases', () => {
  let supabase: ReturnType<typeof createMockSupabase>;

  beforeEach(() => {
    vi.clearAllMocks();
    supabase = createMockSupabase();
  });

  it('skips platform when insert fails', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue([
      { provider_id: 999, provider_name: 'Bad Platform', logo_path: null as unknown as string },
    ]);
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const singleFn = vi
      .fn()
      .mockResolvedValue({ data: null, error: { message: 'platform insert failed' } });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    supabase.insert.mockReturnValueOnce({ select: selectFn } as never);

    const consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = await syncWatchProviders(
      MOVIE_ID,
      1,
      'key',
      supabase as unknown as SupabaseClient,
    );
    consoleWarn.mockRestore();

    expect(result).toBe(0);
  });

  it('sets logo_url to null when logo_path is empty/null', async () => {
    vi.mocked(getWatchProviders).mockResolvedValue([
      { provider_id: 555, provider_name: 'No Logo Platform', logo_path: '' },
    ]);
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    const singleFn = vi
      .fn()
      .mockResolvedValue({ data: { id: 'no-logo-platform-555' }, error: null });
    const selectFn = vi.fn().mockReturnValue({ single: singleFn });
    supabase.insert.mockReturnValueOnce({ select: selectFn } as never);
    supabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null });

    const result = await syncWatchProviders(
      MOVIE_ID,
      1,
      'key',
      supabase as unknown as SupabaseClient,
    );
    expect(result).toBe(1);
  });
});
