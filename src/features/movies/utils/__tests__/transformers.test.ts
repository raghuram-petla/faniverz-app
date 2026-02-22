import { groupEntriesByDate, filterEntriesByReleaseType, getDotsForDate } from '../transformers';
import type { CalendarEntry, Movie } from '@/types/movie';

const makeMovie = (overrides: Partial<Movie> = {}): Movie => ({
  id: 1,
  tmdb_id: 100,
  title: 'Test Movie',
  title_te: null,
  original_title: 'Test Movie',
  overview: 'A test movie',
  overview_te: null,
  poster_path: '/poster.jpg',
  backdrop_path: '/backdrop.jpg',
  release_date: '2026-03-15',
  runtime: 120,
  genres: ['Action', 'Drama'],
  certification: 'UA',
  vote_average: 7.5,
  vote_count: 100,
  popularity: 50,
  content_type: 'movie',
  release_type: 'theatrical',
  status: 'upcoming',
  trailer_youtube_key: 'abc123',
  is_featured: false,
  tmdb_last_synced_at: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  ...overrides,
});

const makeEntry = (overrides: Partial<CalendarEntry> = {}): CalendarEntry => ({
  date: '2026-03-15',
  movie: makeMovie(),
  dotType: 'theatrical',
  ...overrides,
});

describe('transformers', () => {
  describe('groupEntriesByDate', () => {
    it('groups entries by date', () => {
      const entries = [
        makeEntry({ date: '2026-03-15' }),
        makeEntry({ date: '2026-03-15', dotType: 'ott_premiere' }),
        makeEntry({ date: '2026-03-20' }),
      ];

      const grouped = groupEntriesByDate(entries);

      expect(Object.keys(grouped)).toHaveLength(2);
      expect(grouped['2026-03-15']).toHaveLength(2);
      expect(grouped['2026-03-20']).toHaveLength(1);
    });

    it('returns empty object for empty entries', () => {
      expect(groupEntriesByDate([])).toEqual({});
    });
  });

  describe('filterEntriesByReleaseType', () => {
    const entries = [
      makeEntry({ dotType: 'theatrical' }),
      makeEntry({ dotType: 'ott_premiere' }),
      makeEntry({ dotType: 'ott_original' }),
    ];

    it('returns all entries for "all" filter', () => {
      expect(filterEntriesByReleaseType(entries, 'all')).toHaveLength(3);
    });

    it('returns only theatrical for "theatrical" filter', () => {
      const result = filterEntriesByReleaseType(entries, 'theatrical');
      expect(result).toHaveLength(1);
      expect(result[0].dotType).toBe('theatrical');
    });

    it('returns OTT premiere and OTT original for "ott" filter', () => {
      const result = filterEntriesByReleaseType(entries, 'ott');
      expect(result).toHaveLength(2);
      expect(result.map((e) => e.dotType)).toEqual(['ott_premiere', 'ott_original']);
    });
  });

  describe('getDotsForDate', () => {
    it('returns entries for a given date', () => {
      const grouped = {
        '2026-03-15': [makeEntry(), makeEntry({ dotType: 'ott_premiere' })],
        '2026-03-20': [makeEntry({ date: '2026-03-20' })],
      };

      expect(getDotsForDate(grouped, '2026-03-15')).toHaveLength(2);
      expect(getDotsForDate(grouped, '2026-03-20')).toHaveLength(1);
    });

    it('returns empty array for date with no entries', () => {
      expect(getDotsForDate({}, '2026-03-25')).toEqual([]);
    });
  });
});
