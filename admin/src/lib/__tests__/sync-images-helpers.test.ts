import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  sortByLanguagePriority,
  getExistingPaths,
  cleanupStaleImages,
  repairFeedThumbnails,
} from '../sync-images-helpers';
import type { TmdbImage } from '../tmdbTypes';

// ---------- Helpers ----------

function makeImage(overrides: Partial<TmdbImage> = {}): TmdbImage {
  return {
    file_path: '/default.jpg',
    iso_639_1: null,
    vote_average: 5,
    width: 500,
    height: 750,
    ...overrides,
  };
}

// ---------- sortByLanguagePriority ----------

describe('sortByLanguagePriority', () => {
  it('puts Telugu (te) first', () => {
    const images = [
      makeImage({ iso_639_1: 'en', vote_average: 8 }),
      makeImage({ iso_639_1: 'te', vote_average: 6 }),
    ];
    const result = sortByLanguagePriority(images);
    expect(result[0].iso_639_1).toBe('te');
  });

  it('puts Hindi (hi) before English (en)', () => {
    const images = [
      makeImage({ iso_639_1: 'en', vote_average: 8 }),
      makeImage({ iso_639_1: 'hi', vote_average: 7 }),
    ];
    const result = sortByLanguagePriority(images);
    expect(result[0].iso_639_1).toBe('hi');
  });

  it('puts English (en) before null language', () => {
    const images = [
      makeImage({ iso_639_1: null, vote_average: 9 }),
      makeImage({ iso_639_1: 'en', vote_average: 5 }),
    ];
    const result = sortByLanguagePriority(images);
    expect(result[0].iso_639_1).toBe('en');
  });

  it('sorts by vote_average descending within same language', () => {
    const images = [
      makeImage({ iso_639_1: 'te', vote_average: 6 }),
      makeImage({ iso_639_1: 'te', vote_average: 9, file_path: '/best.jpg' }),
    ];
    const result = sortByLanguagePriority(images);
    expect(result[0].file_path).toBe('/best.jpg');
  });

  it('does not mutate the original array', () => {
    const images = [makeImage({ iso_639_1: 'en' }), makeImage({ iso_639_1: 'te' })];
    const original = [...images];
    sortByLanguagePriority(images);
    expect(images).toEqual(original);
  });
});

// ---------- getExistingPaths ----------

describe('getExistingPaths', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns a Set of existing tmdb_file_paths', async () => {
    const rows = [{ tmdb_file_path: '/a.jpg' }, { tmdb_file_path: '/b.jpg' }];
    const sb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ data: rows, error: null }),
            }),
          }),
        }),
      })),
    };
    const result = await getExistingPaths(sb as never, 'movie-1', 'poster');
    expect(result).toEqual(new Set(['/a.jpg', '/b.jpg']));
  });

  it('returns empty Set on query error and logs warning', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const sb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({ data: null, error: { message: 'db fail' } }),
            }),
          }),
        }),
      })),
    };
    const result = await getExistingPaths(sb as never, 'movie-1', 'poster');
    expect(result).toEqual(new Set());
    expect(warnSpy).toHaveBeenCalledWith('getExistingPaths: query failed', 'db fail');
    warnSpy.mockRestore();
  });
});

// ---------- cleanupStaleImages ----------

describe('cleanupStaleImages', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes rows whose tmdb_file_path is not in validPaths', async () => {
    const deleteIn = vi.fn().mockResolvedValue({ error: null });
    const sb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({
                data: [
                  { id: 'img-1', tmdb_file_path: '/old.jpg' },
                  { id: 'img-2', tmdb_file_path: '/current.jpg' },
                ],
              }),
            }),
          }),
        }),
        delete: vi.fn().mockReturnValue({ in: deleteIn }),
      })),
    };
    await cleanupStaleImages(sb as never, 'movie-1', 'poster', new Set(['/current.jpg']));
    expect(deleteIn).toHaveBeenCalledWith('id', ['img-1']);
  });

  it('does not call delete when all paths are valid', async () => {
    const deleteFn = vi.fn();
    const sb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({
                data: [{ id: 'img-1', tmdb_file_path: '/current.jpg' }],
              }),
            }),
          }),
        }),
        delete: deleteFn,
      })),
    };
    await cleanupStaleImages(sb as never, 'movie-1', 'poster', new Set(['/current.jpg']));
    expect(deleteFn).not.toHaveBeenCalled();
  });

  it('handles null allExisting data gracefully (allExisting ?? [] branch)', async () => {
    const deleteFn = vi.fn();
    const sb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              not: vi.fn().mockResolvedValue({
                data: null, // allExisting is null
              }),
            }),
          }),
        }),
        delete: deleteFn,
      })),
    };
    await cleanupStaleImages(sb as never, 'movie-1', 'poster', new Set(['/current.jpg']));
    // staleIds is empty because allExisting ?? [] = [] — no delete called
    expect(deleteFn).not.toHaveBeenCalled();
  });
});

// ---------- repairFeedThumbnails ----------

describe('repairFeedThumbnails', () => {
  beforeEach(() => vi.clearAllMocks());

  it('repairs feed entries where thumbnail_url does not match', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null });
    const feedUpdate = vi.fn().mockReturnValue({ eq: updateEq });

    const sb = {
      from: vi.fn((table: string) => {
        if (table === 'movie_images') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'img-1', image_url: 'correct.jpg' }],
              }),
            }),
          };
        }
        // news_feed
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'feed-1', source_id: 'img-1', thumbnail_url: 'wrong.jpg' }],
              }),
            }),
          }),
          update: feedUpdate,
        };
      }),
    };

    await repairFeedThumbnails('movie-1', sb as never);

    expect(feedUpdate).toHaveBeenCalledWith({ thumbnail_url: 'correct.jpg' });
    expect(updateEq).toHaveBeenCalledWith('id', 'feed-1');
  });

  it('skips update when thumbnails already match', async () => {
    const feedUpdate = vi.fn();

    const sb = {
      from: vi.fn((table: string) => {
        if (table === 'movie_images') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'img-1', image_url: 'correct.jpg' }],
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ id: 'feed-1', source_id: 'img-1', thumbnail_url: 'correct.jpg' }],
              }),
            }),
          }),
          update: feedUpdate,
        };
      }),
    };

    await repairFeedThumbnails('movie-1', sb as never);
    expect(feedUpdate).not.toHaveBeenCalled();
  });

  it('returns early when no movie_images found', async () => {
    const sb = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [] }),
        }),
      })),
    };
    await repairFeedThumbnails('movie-1', sb as never);
    // No error thrown — returns early
  });

  it('returns early when no matching feed entries', async () => {
    const feedUpdate = vi.fn();
    const sb = {
      from: vi.fn((table: string) => {
        if (table === 'movie_images') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: 'img-1', image_url: 'correct.jpg' }],
              }),
            }),
          };
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({ data: [] }),
            }),
          }),
          update: feedUpdate,
        };
      }),
    };
    await repairFeedThumbnails('movie-1', sb as never);
    expect(feedUpdate).not.toHaveBeenCalled();
  });
});
