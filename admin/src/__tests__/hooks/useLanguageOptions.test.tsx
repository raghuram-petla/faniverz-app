import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

const mockLanguages = vi.hoisted(() => ({
  current: [
    { id: 'lang-1', code: 'te', name: 'Telugu' },
    { id: 'lang-2', code: 'hi', name: 'Hindi' },
  ] as Array<{ id: string; code: string; name: string }>,
}));

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: () => ({ languages: mockLanguages.current }),
}));

import { useLanguageOptions, useLanguageName } from '@/hooks/useLanguageOptions';

describe('useLanguageOptions', () => {
  it('returns "Not set" as first option', () => {
    const { result } = renderHook(() => useLanguageOptions());
    expect(result.current[0]).toEqual({ value: '', label: 'Not set' });
  });

  it('maps DB languages to options', () => {
    const { result } = renderHook(() => useLanguageOptions());
    expect(result.current[1]).toEqual({ value: 'te', label: 'Telugu' });
    expect(result.current[2]).toEqual({ value: 'hi', label: 'Hindi' });
  });

  it('appends English as the last option', () => {
    const { result } = renderHook(() => useLanguageOptions());
    const last = result.current[result.current.length - 1];
    expect(last).toEqual({ value: 'en', label: 'English' });
  });

  it('returns correct total length (1 + languages + 1)', () => {
    const { result } = renderHook(() => useLanguageOptions());
    // "Not set" + 2 languages + "English" = 4
    expect(result.current).toHaveLength(4);
  });
});

describe('useLanguageName', () => {
  it('resolves a known language code to its name', () => {
    const { result } = renderHook(() => useLanguageName());
    expect(result.current('te')).toBe('Telugu');
  });

  it('resolves "en" to "English"', () => {
    const { result } = renderHook(() => useLanguageName());
    expect(result.current('en')).toBe('English');
  });

  it('returns the code itself for unknown codes', () => {
    const { result } = renderHook(() => useLanguageName());
    expect(result.current('fr')).toBe('fr');
  });

  it('returns null for null input', () => {
    const { result } = renderHook(() => useLanguageName());
    expect(result.current(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    const { result } = renderHook(() => useLanguageName());
    expect(result.current(undefined)).toBeNull();
  });

  it('returns null for empty string input', () => {
    const { result } = renderHook(() => useLanguageName());
    expect(result.current('')).toBeNull();
  });
});
