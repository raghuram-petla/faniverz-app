import type { Movie, MovieStatus } from './types';

export function deriveMovieStatus(
  movie: Pick<Movie, 'release_date' | 'in_theaters'>,
  platformCount: number,
): MovieStatus {
  if (new Date(movie.release_date) > new Date()) return 'upcoming';
  if (movie.in_theaters) return 'in_theaters';
  if (platformCount > 0) return 'streaming';
  return 'released';
}
