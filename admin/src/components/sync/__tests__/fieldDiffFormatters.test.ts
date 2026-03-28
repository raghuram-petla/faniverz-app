import { describe, it, expect } from 'vitest';
import { fmt, truncate } from '../fieldDiffFormatters';

describe('fmt', () => {
  it('returns empty string for null', () => {
    expect(fmt(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(fmt(undefined)).toBe('');
  });

  it('joins arrays with comma', () => {
    expect(fmt(['a', 'b', 'c'])).toBe('a, b, c');
  });

  it('converts numbers to string', () => {
    expect(fmt(42)).toBe('42');
  });

  it('returns string as-is', () => {
    expect(fmt('hello')).toBe('hello');
  });

  it('returns empty string for empty array', () => {
    expect(fmt([])).toBe('');
  });
});

describe('truncate', () => {
  it('returns empty string for null', () => {
    expect(truncate(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(truncate(undefined)).toBe('');
  });

  it('returns empty string for empty string', () => {
    expect(truncate('')).toBe('');
  });

  it('returns short strings unchanged', () => {
    expect(truncate('hello')).toBe('hello');
  });

  it('truncates strings longer than default 80 chars', () => {
    const long = 'a'.repeat(100);
    const result = truncate(long);
    expect(result.length).toBe(81); // 80 chars + ellipsis
    expect(result.endsWith('…')).toBe(true);
  });

  it('truncates at custom length', () => {
    const result = truncate('hello world', 5);
    expect(result).toBe('hello…');
  });

  it('does not truncate string exactly at limit', () => {
    expect(truncate('12345', 5)).toBe('12345');
  });
});
