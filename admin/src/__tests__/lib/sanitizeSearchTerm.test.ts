import { describe, it, expect } from 'vitest';
import { sanitizeSearchTerm } from '@/lib/sanitizeSearchTerm';

describe('sanitizeSearchTerm', () => {
  it('strips commas', () => {
    expect(sanitizeSearchTerm('actor, director')).toBe('actor director');
  });

  it('strips parentheses', () => {
    expect(sanitizeSearchTerm('test(value)')).toBe('testvalue');
  });

  it('strips quotes', () => {
    expect(sanitizeSearchTerm(`O'Brien "hello"`)).toBe('OBrien hello');
  });

  it('strips backslashes and percent/underscore', () => {
    expect(sanitizeSearchTerm('100% done_now\\')).toBe('100 donenow');
  });

  it('trims whitespace', () => {
    expect(sanitizeSearchTerm('  hello  ')).toBe('hello');
  });

  it('preserves dots for emails', () => {
    expect(sanitizeSearchTerm('user@example.com')).toBe('user@example.com');
  });

  it('returns empty string for all-special-char input', () => {
    expect(sanitizeSearchTerm(',()"\\%_')).toBe('');
  });

  it('handles empty string', () => {
    expect(sanitizeSearchTerm('')).toBe('');
  });
});
