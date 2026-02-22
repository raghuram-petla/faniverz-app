import {
  DOT_TYPE,
  MOVIE_STATUS,
  RELEASE_TYPE,
  CONTENT_TYPE,
  PLATFORM_SLUGS,
  QUERY_KEYS,
  STALE_TIMES,
  TMDB_IMAGE_BASE_URL,
} from '../../lib/constants';
import type {
  Movie,
  CalendarEntry,
  CastRole,
  ReviewSortOption,
  OttReleaseSource,
  NotificationType,
  NotificationStatus,
} from '../index';

describe('Type Exports', () => {
  it('Movie type has required fields', () => {
    const movie: Movie = {
      id: 1,
      tmdb_id: 12345,
      title: 'Test Movie',
      title_te: 'టెస్ట్ మూవీ',
      original_title: 'Test Movie',
      overview: 'A test movie',
      overview_te: null,
      poster_path: '/poster.jpg',
      backdrop_path: '/backdrop.jpg',
      release_date: '2026-03-01',
      runtime: 120,
      genres: ['Action', 'Drama'],
      certification: 'U/A',
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
    };
    expect(movie.id).toBe(1);
    expect(movie.genres).toHaveLength(2);
  });

  it('CalendarEntry includes dotType', () => {
    const entry: CalendarEntry = {
      date: '2026-03-01',
      movie: {} as Movie,
      dotType: 'theatrical',
    };
    expect(entry.dotType).toBe('theatrical');
  });

  it('CastRole includes all expected roles', () => {
    const roles: CastRole[] = [
      'actor',
      'director',
      'producer',
      'music_director',
      'cinematographer',
      'writer',
    ];
    expect(roles).toHaveLength(6);
  });

  it('ReviewSortOption covers all sort modes', () => {
    const sorts: ReviewSortOption[] = ['recent', 'highest', 'lowest'];
    expect(sorts).toHaveLength(3);
  });

  it('OttReleaseSource has tmdb and manual', () => {
    const sources: OttReleaseSource[] = ['tmdb', 'manual'];
    expect(sources).toHaveLength(2);
  });

  it('NotificationType covers all types', () => {
    const types: NotificationType[] = [
      'watchlist_reminder',
      'release_day',
      'ott_available',
      'weekly_digest',
    ];
    expect(types).toHaveLength(4);
  });

  it('NotificationStatus covers all statuses', () => {
    const statuses: NotificationStatus[] = ['pending', 'sent', 'failed', 'cancelled'];
    expect(statuses).toHaveLength(4);
  });
});

describe('Constants', () => {
  it('RELEASE_TYPE has correct values', () => {
    expect(RELEASE_TYPE.THEATRICAL).toBe('theatrical');
    expect(RELEASE_TYPE.OTT_ORIGINAL).toBe('ott_original');
  });

  it('MOVIE_STATUS has correct values', () => {
    expect(MOVIE_STATUS.UPCOMING).toBe('upcoming');
    expect(MOVIE_STATUS.RELEASED).toBe('released');
    expect(MOVIE_STATUS.POSTPONED).toBe('postponed');
    expect(MOVIE_STATUS.CANCELLED).toBe('cancelled');
  });

  it('CONTENT_TYPE has correct values', () => {
    expect(CONTENT_TYPE.MOVIE).toBe('movie');
    expect(CONTENT_TYPE.SERIES).toBe('series');
  });

  it('DOT_TYPE has correct values', () => {
    expect(DOT_TYPE.THEATRICAL).toBe('theatrical');
    expect(DOT_TYPE.OTT_PREMIERE).toBe('ott_premiere');
    expect(DOT_TYPE.OTT_ORIGINAL).toBe('ott_original');
  });

  it('PLATFORM_SLUGS has all 8 platforms', () => {
    const slugs = Object.values(PLATFORM_SLUGS);
    expect(slugs).toHaveLength(8);
    expect(slugs).toContain('aha');
    expect(slugs).toContain('netflix');
    expect(slugs).toContain('prime-video');
    expect(slugs).toContain('hotstar');
    expect(slugs).toContain('zee5');
    expect(slugs).toContain('sunnxt');
    expect(slugs).toContain('sonyliv');
    expect(slugs).toContain('etvwin');
  });

  it('QUERY_KEYS has all keys from plan', () => {
    expect(QUERY_KEYS.MOVIES).toBe('movies');
    expect(QUERY_KEYS.MOVIE).toBe('movie');
    expect(QUERY_KEYS.OTT_RELEASES).toBe('ott-releases');
    expect(QUERY_KEYS.WATCHLIST).toBe('watchlist');
    expect(QUERY_KEYS.REVIEWS).toBe('reviews');
    expect(QUERY_KEYS.PROFILE).toBe('profile');
    expect(QUERY_KEYS.PLATFORMS).toBe('platforms');
  });

  it('STALE_TIMES are in milliseconds', () => {
    expect(STALE_TIMES.MOVIES).toBe(300000);
    expect(STALE_TIMES.MOVIE_DETAIL).toBe(600000);
    expect(STALE_TIMES.OTT_RELEASES).toBe(900000);
    expect(STALE_TIMES.WATCHLIST).toBe(0);
    expect(STALE_TIMES.REVIEWS).toBe(300000);
    expect(STALE_TIMES.PROFILE).toBe(1800000);
    expect(STALE_TIMES.PLATFORMS).toBe(86400000);
  });

  it('TMDB_IMAGE_BASE_URL is correct', () => {
    expect(TMDB_IMAGE_BASE_URL).toBe('https://image.tmdb.org/t/p');
  });
});
