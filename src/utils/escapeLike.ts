/**
 * Escapes Postgres LIKE special characters (%, _, \) in a search query string.
 * @contract: must be called before passing user input to .ilike() or .or() filters.
 */
export function escapeLike(query: string): string {
  return query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
