import { describe, it, expect } from 'vitest';
import { hasLanguageAccess } from '../language-access';

describe('hasLanguageAccess', () => {
  it('returns true when languageCodes is empty (root/super_admin)', () => {
    expect(hasLanguageAccess([], 'te')).toBe(true);
  });

  it('returns true when movieLang is null (no language set)', () => {
    expect(hasLanguageAccess(['te', 'hi'], null)).toBe(true);
  });

  it('returns true when movieLang is in languageCodes', () => {
    expect(hasLanguageAccess(['te', 'hi', 'ta'], 'hi')).toBe(true);
  });

  it('returns false when movieLang is not in languageCodes', () => {
    expect(hasLanguageAccess(['te', 'hi'], 'en')).toBe(false);
  });

  it('returns true for single matching language code', () => {
    expect(hasLanguageAccess(['te'], 'te')).toBe(true);
  });

  it('returns false for single non-matching language code', () => {
    expect(hasLanguageAccess(['te'], 'hi')).toBe(false);
  });
});
