import { MOVIE_STATUS_CONFIG } from '@shared/constants';
import { colors } from '@shared/colors';
import type { MovieStatus } from '@shared/types';

// Re-export the shared config
export { MOVIE_STATUS_CONFIG };

export function getMovieStatusLabel(status: MovieStatus): string {
  return MOVIE_STATUS_CONFIG[status]?.label ?? status;
}

export function getMovieStatusColor(status: MovieStatus): string {
  return MOVIE_STATUS_CONFIG[status]?.color ?? colors.white40;
}
