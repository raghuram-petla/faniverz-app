import { renderHook, act } from '@testing-library/react';
import React from 'react';

// Stable references for mocks to avoid destabilizing useMemo deps
const stableQueryResult = { data: [] as never[], isLoading: false };

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

const mockUser = {
  id: 'user-1',
  role: 'root' as const,
  languageIds: [] as string[],
  languageCodes: [] as string[],
};

let currentMockUser = mockUser;

vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: () => currentMockUser,
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => stableQueryResult,
}));

import { LanguageProvider, useLanguageContext } from '@/hooks/useLanguageContext';

function makeWrapper(user = mockUser) {
  currentMockUser = user;
  return function wrapper({ children }: { children: React.ReactNode }) {
    return <LanguageProvider>{children}</LanguageProvider>;
  };
}

describe('useLanguageContext', () => {
  beforeEach(() => {
    currentMockUser = mockUser;
    localStorage.clear();
  });

  it('returns expected default values', () => {
    const { result } = renderHook(() => useLanguageContext(), { wrapper: makeWrapper() });
    expect(result.current.languages).toEqual([]);
    expect(result.current.selectedLanguageId).toBeNull();
    expect(result.current.selectedLanguageCode).toBeNull();
    expect(typeof result.current.setSelectedLanguageId).toBe('function');
  });

  it('memoizes context value to prevent unnecessary re-renders', () => {
    const { result, rerender } = renderHook(() => useLanguageContext(), { wrapper: makeWrapper() });
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('returns userLanguageIds from user', () => {
    const { result } = renderHook(() => useLanguageContext(), {
      wrapper: makeWrapper({ ...mockUser, languageIds: ['lang-1', 'lang-2'] }),
    });
    expect(result.current.userLanguageIds).toEqual(['lang-1', 'lang-2']);
  });

  it('showSwitcher is false by default (no languages loaded)', () => {
    const { result } = renderHook(() => useLanguageContext(), { wrapper: makeWrapper() });
    // initialized is false because languages is [] (empty), so showSwitcher stays false
    expect(result.current.showSwitcher).toBe(false);
  });

  it('selectedLanguageCode is null when selectedLanguageId is null', () => {
    const { result } = renderHook(() => useLanguageContext(), { wrapper: makeWrapper() });
    expect(result.current.selectedLanguageCode).toBeNull();
  });

  it('setSelectedLanguageId stores value in localStorage', () => {
    const { result } = renderHook(() => useLanguageContext(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setSelectedLanguageId('lang-abc');
    });
    expect(localStorage.getItem('faniverz-admin-selected-language')).toBe('lang-abc');
  });

  it('setSelectedLanguageId removes value from localStorage when null', () => {
    localStorage.setItem('faniverz-admin-selected-language', 'lang-xyz');
    const { result } = renderHook(() => useLanguageContext(), { wrapper: makeWrapper() });
    act(() => {
      result.current.setSelectedLanguageId(null);
    });
    expect(localStorage.getItem('faniverz-admin-selected-language')).toBeNull();
  });

  it('availableLanguages is empty array when languages list is empty', () => {
    const { result } = renderHook(() => useLanguageContext(), { wrapper: makeWrapper() });
    expect(result.current.availableLanguages).toEqual([]);
  });

  it('showSwitcher and availableLanguages exist in returned context', () => {
    const { result } = renderHook(() => useLanguageContext(), { wrapper: makeWrapper() });
    expect('showSwitcher' in result.current).toBe(true);
    expect('availableLanguages' in result.current).toBe(true);
  });

  it('useLanguageContext outside provider returns default context values', () => {
    // When used without LanguageProvider, returns the context default
    const { result } = renderHook(() => useLanguageContext());
    expect(result.current.languages).toEqual([]);
    expect(result.current.selectedLanguageId).toBeNull();
    expect(result.current.showSwitcher).toBe(false);
  });
});
