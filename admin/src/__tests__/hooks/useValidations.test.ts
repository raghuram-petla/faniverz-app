import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

import { itemKey, hasIssue } from '@/hooks/useValidations';
import type { ScanResult } from '@/hooks/useValidationTypes';

const makeResult = (overrides: Partial<ScanResult> = {}): ScanResult => ({
  id: 'test-1',
  entity: 'movies',
  field: 'poster_url',
  currentUrl: 'test.jpg',
  urlType: 'local',
  originalExists: true,
  variants: { sm: true, md: true, lg: true },
  entityLabel: 'Test',
  tmdbId: 100,
  ...overrides,
});

describe('itemKey', () => {
  it('returns id-field composite key', () => {
    const result = makeResult({ id: 'abc', field: 'poster_url' });
    expect(itemKey(result)).toBe('abc-poster_url');
  });

  it('handles different fields', () => {
    expect(itemKey(makeResult({ id: 'x', field: 'backdrop_url' }))).toBe('x-backdrop_url');
  });
});

describe('hasIssue', () => {
  it('returns false for fully healthy local result', () => {
    expect(hasIssue(makeResult())).toBe(false);
  });

  it('returns true for external URL type', () => {
    expect(hasIssue(makeResult({ urlType: 'external' }))).toBe(true);
  });

  it('returns true when original is missing', () => {
    expect(hasIssue(makeResult({ originalExists: false }))).toBe(true);
  });

  it('returns true when sm variant is missing', () => {
    expect(hasIssue(makeResult({ variants: { sm: false, md: true, lg: true } }))).toBe(true);
  });

  it('returns true when md variant is missing', () => {
    expect(hasIssue(makeResult({ variants: { sm: true, md: false, lg: true } }))).toBe(true);
  });

  it('returns true when lg variant is missing', () => {
    expect(hasIssue(makeResult({ variants: { sm: true, md: true, lg: false } }))).toBe(true);
  });

  it('returns true when all variants are missing', () => {
    expect(hasIssue(makeResult({ variants: { sm: false, md: false, lg: false } }))).toBe(true);
  });

  it('returns false when variants are null (logos)', () => {
    expect(hasIssue(makeResult({ variants: { sm: null, md: null, lg: null } }))).toBe(false);
  });

  it('returns false for full_r2 type with all OK', () => {
    expect(hasIssue(makeResult({ urlType: 'full_r2' }))).toBe(false);
  });
});
