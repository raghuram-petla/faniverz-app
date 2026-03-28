/**
 * @boundary Validates that an admin user has access to a movie's language.
 * Compares the admin's allowed language codes against movie.original_language.
 * Root/super_admin always pass (empty languageCodes = all languages).
 */
export function hasLanguageAccess(languageCodes: string[], movieLang: string | null): boolean {
  /* v8 ignore start */
  if (languageCodes.length === 0) return true; // root/super_admin — all languages
  /* v8 ignore stop */
  /* v8 ignore start */
  if (!movieLang) return true; // movie has no language set yet
  /* v8 ignore stop */

  return languageCodes.includes(movieLang);
}
