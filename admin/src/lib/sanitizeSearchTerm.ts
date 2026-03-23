/**
 * @boundary PostgREST .or()/.ilike() filters use commas, parens, and quotes as
 * delimiters. Unsanitized search terms containing these characters would corrupt
 * filter syntax, causing Supabase to return 400 errors. Strips rather than escapes,
 * so "O'Brien" → "OBrien" (partial match loss is acceptable).
 * @edge Only strips characters that break PostgREST full-text search syntax; preserves dots for emails.
 */
export function sanitizeSearchTerm(term: string): string {
  return term.replace(/[,()"'\\%_]/g, '').trim();
}
