export function parseNotificationDeepLink(data: Record<string, unknown> | null): string | null {
  if (!data) return null;

  const movieId = data.movieId ?? data.movie_id;
  if (movieId && (typeof movieId === 'number' || typeof movieId === 'string')) {
    return `/movie/${movieId}`;
  }

  const url = data.url;
  if (typeof url === 'string' && url.startsWith('/')) {
    return url;
  }

  return null;
}
