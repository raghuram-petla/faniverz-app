import { renderHook } from '@testing-library/react';
import React from 'react';

// Stable references for mocks to avoid destabilizing useMemo deps
const stableQueryResult = { data: [] as never[], isLoading: false };
const stableUser = {
  id: 'user-1',
  role: 'root' as const,
  languageIds: [] as string[],
  languageCodes: [] as string[],
};

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => stableQueryResult,
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: () => stableUser,
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

import { LanguageProvider, useLanguageContext } from '@/hooks/useLanguageContext';

function wrapper({ children }: { children: React.ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}

describe('useLanguageContext', () => {
  it('returns expected default values', () => {
    const { result } = renderHook(() => useLanguageContext(), { wrapper });
    expect(result.current.languages).toEqual([]);
    expect(result.current.selectedLanguageId).toBeNull();
    expect(result.current.selectedLanguageCode).toBeNull();
    expect(typeof result.current.setSelectedLanguageId).toBe('function');
  });

  it('memoizes context value to prevent unnecessary re-renders', () => {
    const { result, rerender } = renderHook(() => useLanguageContext(), { wrapper });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
