import { TMDB_IMAGE_BASE_URL, TMDB_POSTER_SIZES, TMDB_BACKDROP_SIZES } from '@/lib/constants';

type PosterSize = keyof typeof TMDB_POSTER_SIZES;
type BackdropSize = keyof typeof TMDB_BACKDROP_SIZES;

export function getPosterUrl(path: string | null, size: PosterSize = 'medium'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${TMDB_POSTER_SIZES[size]}${path}`;
}

export function getBackdropUrl(path: string | null, size: BackdropSize = 'medium'): string | null {
  if (!path) return null;
  return `${TMDB_IMAGE_BASE_URL}/${TMDB_BACKDROP_SIZES[size]}${path}`;
}
