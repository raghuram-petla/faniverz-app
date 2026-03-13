import { MOVIE_STATUS_CONFIG } from '@shared/constants';
import { colors } from '@shared/colors';
import type { MovieStatus } from '@shared/types';

// @coupling re-exports from @shared/constants — admin panel uses the same config directly
export { MOVIE_STATUS_CONFIG };

export function getMovieStatusLabel(status: MovieStatus): string {
  return MOVIE_STATUS_CONFIG[status]?.label ?? status;
}

// @edge falls back to white40 for unknown statuses rather than crashing
export function getMovieStatusColor(status: MovieStatus): string {
  return MOVIE_STATUS_CONFIG[status]?.color ?? colors.white40;
}
