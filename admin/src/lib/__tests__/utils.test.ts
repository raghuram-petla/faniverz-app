import { safeDateOrNull, cn, formatDate, formatDateTime, truncate } from '../utils';

describe('safeDateOrNull', () => {
  it('returns valid date string as-is', () => {
    expect(safeDateOrNull('2026-05-15')).toBe('2026-05-15');
  });

  it('returns trimmed date when input has whitespace', () => {
    expect(safeDateOrNull('  2026-05-15  ')).toBe('2026-05-15');
  });

  it('returns null for empty string', () => {
    expect(safeDateOrNull('')).toBeNull();
  });

  it('returns null for whitespace-only string', () => {
    expect(safeDateOrNull('   ')).toBeNull();
  });

  it('returns null for null', () => {
    expect(safeDateOrNull(null)).toBeNull();
  });

  it('returns null for undefined', () => {
    expect(safeDateOrNull(undefined)).toBeNull();
  });

  it('returns null for malformed date', () => {
    expect(safeDateOrNull('not-a-date')).toBeNull();
  });

  it('returns null for 0000-00-00', () => {
    expect(safeDateOrNull('0000-00-00')).toBeNull();
  });

  it('accepts ISO datetime strings', () => {
    expect(safeDateOrNull('2026-05-15T10:30:00Z')).toBe('2026-05-15T10:30:00Z');
  });
});

describe('cn', () => {
  it('joins class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('filters falsy values', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
});

describe('formatDate', () => {
  it('formats a date string', () => {
    const result = formatDate('2025-06-15');
    expect(result).toContain('2025');
    expect(result).toContain('Jun');
  });
});

describe('formatDateTime', () => {
  it('formats a datetime string', () => {
    const result = formatDateTime('2025-06-15T10:30:00Z');
    expect(result).toContain('2025');
  });
});

describe('truncate', () => {
  it('returns short strings unchanged', () => {
    expect(truncate('hello', 10)).toBe('hello');
  });

  it('truncates long strings with ellipsis', () => {
    expect(truncate('hello world', 5)).toBe('hello...');
  });
});
