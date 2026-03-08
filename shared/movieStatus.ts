import type { Movie, MovieStatus } from './types';

export function deriveMovieStatus(
  movie: Pick<Movie, 'release_date' | 'in_theaters'>,
  platformCount: number,
): MovieStatus {
  if (movie.in_theaters) return 'in_theaters';
  if (!movie.release_date) return 'announced';
  if (new Date(movie.release_date) > new Date()) return 'upcoming';
  if (platformCount > 0) return 'streaming';
  return 'released';
}
