import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateTime, truncate } from '@/lib/utils';

describe('cn', () => {
  it('joins multiple class names', () => {
    expect(cn('foo', 'bar', 'baz')).toBe('foo bar baz');
  });

  it('filters out falsy values', () => {
    expect(cn('foo', undefined, 'bar', null, false, 'baz')).toBe('foo bar baz');
  });

  it('returns empty string when all values are falsy', () => {
    expect(cn(undefined, null, false)).toBe('');
  });

  it('returns single class name unchanged', () => {
    expect(cn('only')).toBe('only');
  });
});

describe('formatDate', () => {
  it('formats a date string to en-US short month format', () => {
    // Use a full ISO string to avoid timezone-related date shifts
    const result = formatDate('2024-06-15T12:00:00');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2024');
  });

  it('formats a Date object', () => {
    // Use noon local time to avoid timezone boundary issues
    const date = new Date(2025, 0, 1, 12, 0, 0); // Jan 1 2025, noon local
    const result = formatDate(date);
    expect(result).toContain('2025');
    expect(result).toContain('Jan');
  });
});

describe('formatDateTime', () => {
  it('returns a string with date and time components', () => {
    const result = formatDateTime('2024-06-15T14:30:00Z');
    expect(result).toContain('Jun');
    expect(result).toContain('15');
    expect(result).toContain('2024');
    // Should include time portion (hour:minute)
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });

  it('formats a Date object', () => {
    const result = formatDateTime(new Date('2025-12-25T08:00:00Z'));
    expect(result).toContain('2025');
    expect(result).toContain('Dec');
    expect(result).toMatch(/\d{1,2}:\d{2}/);
  });
});

describe('truncate', () => {
  it('truncates a string longer than maxLength and appends ellipsis', () => {
    expect(truncate('Hello, World!', 5)).toBe('Hello...');
  });

  it('keeps a short string unchanged when within maxLength', () => {
    expect(truncate('Hi', 10)).toBe('Hi');
  });

  it('keeps string unchanged when exactly at maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello');
  });

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('');
  });
});
