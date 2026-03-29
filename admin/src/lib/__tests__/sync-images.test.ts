import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/tmdb', () => ({
  getMovieImages: vi.fn(() => Promise.resolve({ posters: [], backdrops: [], logos: [] })),
  TMDB_IMAGE: {
    poster: (p: string) => `https://tmdb.org${p}`,
    backdrop: (p: string) => `https://tmdb.org${p}`,
  },
}));

vi.mock('@/lib/r2-sync', () => ({
  uploadImageFromUrl: vi.fn((_s: string, _b: string, k: string) => Promise.resolve(k)),
  R2_BUCKETS: { moviePosters: 'posters', movieBackdrops: 'backdrops' },
}));

import { syncAllImages } from '@/lib/sync-images';
import { getMovieImages } from '@/lib/tmdb';

// ---------- Helpers ----------

/** Creates a Supabase mock with table-specific responses. */
function buildSupabase(config: {
  /** movie_images rows returned by .select().eq('movie_id', ...) */
  images?: { id: string; image_url: string }[];
  /** news_feed rows returned by .select().eq().in() */
  feedEntries?: { id: string; source_id: string; thumbnail_url: string }[];
  /** Spy to capture news_feed update calls */
  onFeedUpdate?: ReturnType<typeof vi.fn>;
}) {
  const { images = [], feedEntries = [], onFeedUpdate } = config;

  return {
    from: vi.fn((table: string) => {
      if (table === 'news_feed') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: feedEntries }),
            }),
          }),
          update:
            onFeedUpdate ??
            vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
        };
      }
      // movie_images — used by getExistingPaths (returns empty) and repairFeedThumbnails
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: [] }),
            not: vi.fn().mockResolvedValue({ data: [] }),
            // terminal: repairFeedThumbnails calls .select().eq() directly
            then: (r: (v: unknown) => void) => r({ data: images }),
          }),
          not: vi.fn().mockResolvedValue({ data: [] }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
        insert: vi.fn().mockResolvedValue({ error: null }),
        delete: vi.fn().mockReturnValue({
          in: vi.fn().mockResolvedValue({ error: null }),
        }),
      };
    }),
  };
}

// ---------- Tests ----------

describe('syncAllImages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('runs poster and backdrop syncs sequentially and returns counts', async () => {
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [], logos: [] });
    const sb = buildSupabase({});
    const result = await syncAllImages('movie-1', 123, 'key', sb as never);
    expect(getMovieImages).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ posterCount: 0, backdropCount: 0 });
  });

  it('repairs feed entries with mismatched thumbnails after sync', async () => {
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [], logos: [] });

    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const onFeedUpdate = vi.fn().mockReturnValue({ eq: updateEq });

    const sb = buildSupabase({
      images: [{ id: 'img-1', image_url: 'correct.jpg' }],
      feedEntries: [{ id: 'feed-1', source_id: 'img-1', thumbnail_url: 'wrong.jpg' }],
      onFeedUpdate,
    });

    await syncAllImages('movie-1', 123, 'key', sb as never);

    expect(onFeedUpdate).toHaveBeenCalledWith({ thumbnail_url: 'correct.jpg' });
    expect(updateEq).toHaveBeenCalledWith('id', 'feed-1');
  });

  it('skips update when thumbnails already match', async () => {
    vi.mocked(getMovieImages).mockResolvedValue({ posters: [], backdrops: [], logos: [] });

    const onFeedUpdate = vi.fn();

    const sb = buildSupabase({
      images: [{ id: 'img-1', image_url: 'correct.jpg' }],
      feedEntries: [{ id: 'feed-1', source_id: 'img-1', thumbnail_url: 'correct.jpg' }],
      onFeedUpdate,
    });

    await syncAllImages('movie-1', 123, 'key', sb as never);

    expect(onFeedUpdate).not.toHaveBeenCalled();
  });
});
