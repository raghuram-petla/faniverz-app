'use client';
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEffectiveUser } from '@/hooks/useImpersonation';
import type { Language } from '@/lib/types';
import { supabase } from '@/lib/supabase-browser';
import { ADMIN_STALE_1H } from '@/lib/query-config';

/**
 * @contract Language context provides the selected content language for movie scoping.
 * - selectedLanguageCode = null means "all languages" (root/super_admin default)
 * - For admin with 1 language, auto-selects and hides switcher
 * - For admin with 2+ languages, shows switcher with assigned languages only
 * - For root/super_admin, shows switcher with all languages + "All" option
 *
 * The switcher stores language UUIDs internally (for assignment management),
 * but exposes selectedLanguageCode for movie queries against original_language.
 */
interface LanguageContextValue {
  languages: Language[];
  /** UUID of the selected language — used by switcher UI and assignment components */
  selectedLanguageId: string | null;
  setSelectedLanguageId: (id: string | null) => void;
  /** @contract ISO 639-1 code derived from selectedLanguageId — used for movie queries */
  selectedLanguageCode: string | null;
  userLanguageIds: string[];
  /** Whether the switcher should be visible */
  showSwitcher: boolean;
  /** Languages available to the current user for selection */
  availableLanguages: Language[];
}

const LanguageContext = createContext<LanguageContextValue>({
  languages: [],
  selectedLanguageId: null,
  /* v8 ignore start */
  setSelectedLanguageId: () => {},
  /* v8 ignore stop */
  selectedLanguageCode: null,
  userLanguageIds: [],
  showSwitcher: false,
  availableLanguages: [],
});

export function useLanguageContext() {
  return useContext(LanguageContext);
}

const STORAGE_KEY = 'faniverz-admin-selected-language';

async function fetchLanguages(): Promise<Language[]> {
  const token = await getAccessToken();
  const res = await fetch('/api/languages', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  return res.json();
}

// @boundary Inline token helper — avoids importing crudFetch for a simple GET
async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Session expired');
  return session.access_token;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const user = useEffectiveUser();
  const role = user?.role;
  const userLanguageIds = useMemo(() => user?.languageIds ?? [], [user?.languageIds]);

  const isSuperAdmin = role === 'root' || role === 'super_admin';
  const isAdmin = role === 'admin';

  // @contract Fetch all languages from DB — cached with 1-hour staleTime (reference data)
  const { data: languages = [] } = useQuery<Language[]>({
    queryKey: ['languages'],
    queryFn: fetchLanguages,
    staleTime: ADMIN_STALE_1H,
    enabled: !!user,
  });

  const [selectedLanguageId, setSelectedLanguageIdState] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // @sideeffect Auto-select language based on role and assignments
  useEffect(() => {
    if (!user || languages.length === 0) return;

    // Try to restore from localStorage
    const stored = localStorage.getItem(STORAGE_KEY);

    if (isSuperAdmin) {
      // Root/super: restore from storage or default to null (all)
      setSelectedLanguageIdState(stored ?? null);
    } else if (isAdmin && userLanguageIds.length === 1) {
      // Single-language admin: auto-select, ignore stored value
      setSelectedLanguageIdState(userLanguageIds[0]);
    } else if (isAdmin && userLanguageIds.length > 1) {
      // Multi-language admin: restore from storage or default to first
      const restoredValid = stored && userLanguageIds.includes(stored);
      setSelectedLanguageIdState(restoredValid ? stored : userLanguageIds[0]);
    }

    setInitialized(true);
  }, [user, languages, isSuperAdmin, isAdmin, userLanguageIds]);

  const setSelectedLanguageId = useCallback((id: string | null) => {
    setSelectedLanguageIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  // @contract showSwitcher: hidden for single-language admin, PH admin, viewer
  const showSwitcher = initialized && (isSuperAdmin || (isAdmin && userLanguageIds.length > 1));

  // @contract availableLanguages: all for root/super, assigned subset for admin
  const availableLanguages = isSuperAdmin
    ? languages
    : languages.filter((l) => userLanguageIds.includes(l.id));

  // @contract Derive code from selected UUID — used for original_language queries
  const selectedLanguageCode = useMemo(
    () =>
      selectedLanguageId
        ? (languages.find((l) => l.id === selectedLanguageId)?.code ?? null)
        : null,
    [selectedLanguageId, languages],
  );

  // @sideeffect: memoized to prevent re-render cascades — consumers only re-render
  // when language state actually changes, not when dashboard layout re-renders.
  const value = useMemo<LanguageContextValue>(
    () => ({
      languages,
      selectedLanguageId,
      setSelectedLanguageId,
      selectedLanguageCode,
      userLanguageIds,
      showSwitcher,
      availableLanguages,
    }),
    [
      languages,
      selectedLanguageId,
      setSelectedLanguageId,
      selectedLanguageCode,
      userLanguageIds,
      showSwitcher,
      availableLanguages,
    ],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}
