export function movieRatingLabel(rating: number, maxStars: number = 5): string {
  return `Rating: ${rating} out of ${maxStars}`;
}

export function movieCardLabel(title: string, releaseDate: string, genres: string[]): string {
  const genreText = genres.length > 0 ? `, genres: ${genres.join(', ')}` : '';
  return `${title}, releasing ${releaseDate}${genreText}`;
}

export function watchlistButtonLabel(isWatchlisted: boolean, movieTitle: string): string {
  return isWatchlisted ? `Remove ${movieTitle} from watchlist` : `Add ${movieTitle} to watchlist`;
}

export function calendarDayLabel(day: number, movieCount: number): string {
  if (movieCount === 0) return `Day ${day}, no releases`;
  return `Day ${day}, ${movieCount} release${movieCount === 1 ? '' : 's'}`;
}

export function reviewCountLabel(count: number): string {
  if (count === 0) return 'No reviews';
  return `${count} review${count === 1 ? '' : 's'}`;
}
