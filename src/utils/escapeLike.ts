/**
 * Escapes Postgres LIKE special characters (%, _, \) in a search query string.
 * @contract: must be called before passing user input to .ilike() or .or() filters.
 */
// @boundary SQL injection prevention — without escaping, user input like "100%" would match everything
// @coupling used by useUniversalSearch and any Supabase query using .ilike() or .like()
export function escapeLike(query: string): string {
  return query.replace(/[\\%_]/g, (ch) => `\\${ch}`);
}
