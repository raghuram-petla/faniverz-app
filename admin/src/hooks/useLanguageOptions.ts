'use client';

import { useMemo } from 'react';
import { useLanguageContext } from './useLanguageContext';

/** @contract Derives language select options from the DB languages table (single source of truth).
 * Includes a "Not set" option for form selects and "English" as a common TMDB fallback. */
export function useLanguageOptions() {
  const { languages } = useLanguageContext();
  return useMemo(
    () => [
      { value: '', label: 'Not set' },
      ...languages.map((l) => ({ value: l.code, label: l.name })),
      { value: 'en', label: 'English' },
    ],
    [languages],
  );
}

/** @contract Resolves an ISO 639-1 code to its display name from the DB languages list. */
export function useLanguageName() {
  const { languages } = useLanguageContext();
  const map = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of languages) m.set(l.code, l.name);
    m.set('en', 'English');
    return m;
  }, [languages]);
  return (code: string | null | undefined) => (code ? (map.get(code) ?? code) : null);
}
