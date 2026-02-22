export const TMDB_IMAGE_BASE_URL = 'https://image.tmdb.org/t/p';

export const TMDB_POSTER_SIZES = {
  small: 'w185',
  medium: 'w342',
  large: 'w500',
  original: 'original',
} as const;

export const TMDB_BACKDROP_SIZES = {
  small: 'w300',
  medium: 'w780',
  large: 'w1280',
  original: 'original',
} as const;

export const RELEASE_TYPE = {
  THEATRICAL: 'theatrical',
  OTT_ORIGINAL: 'ott_original',
} as const;

export const MOVIE_STATUS = {
  UPCOMING: 'upcoming',
  RELEASED: 'released',
  POSTPONED: 'postponed',
  CANCELLED: 'cancelled',
} as const;

export const CONTENT_TYPE = {
  MOVIE: 'movie',
  SERIES: 'series',
} as const;

export const DOT_TYPE = {
  THEATRICAL: 'theatrical',
  OTT_PREMIERE: 'ott_premiere',
  OTT_ORIGINAL: 'ott_original',
} as const;

export const PLATFORM_SLUGS = {
  AHA: 'aha',
  NETFLIX: 'netflix',
  PRIME: 'prime-video',
  HOTSTAR: 'hotstar',
  ZEE5: 'zee5',
  SUNNXT: 'sunnxt',
  SONYLIV: 'sonyliv',
  ETVWIN: 'etvwin',
} as const;

export const QUERY_KEYS = {
  MOVIES: 'movies',
  MOVIE: 'movie',
  OTT_RELEASES: 'ott-releases',
  WATCHLIST: 'watchlist',
  REVIEWS: 'reviews',
  PROFILE: 'profile',
  PLATFORMS: 'platforms',
} as const;

export const STALE_TIMES = {
  MOVIES: 5 * 60 * 1000,
  MOVIE_DETAIL: 10 * 60 * 1000,
  OTT_RELEASES: 15 * 60 * 1000,
  WATCHLIST: 0,
  REVIEWS: 5 * 60 * 1000,
  PROFILE: 30 * 60 * 1000,
  PLATFORMS: 24 * 60 * 60 * 1000,
} as const;
