import type { Movie, MovieStatus } from './types';

export function deriveMovieStatus(
  movie: Pick<Movie, 'release_date' | 'in_theaters'>,
  platformCount: number,
): MovieStatus {
  if (movie.in_theaters) return 'in_theaters';
  if (!movie.release_date) return 'announced';
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  if (movie.release_date > todayStr) return 'upcoming';
  if (platformCount > 0) return 'streaming';
  return 'released';
}
