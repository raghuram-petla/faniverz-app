import { describe, it, expect } from 'vitest';
import { cn, formatDate, formatDateTime } from '@/lib/utils';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz');
  });

  it('should merge tailwind conflicts', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6');
  });
});

describe('formatDate', () => {
  it('should format date string with month and year', () => {
    const result = formatDate('2025-06-15T12:00:00');
    expect(result).toContain('Jun');
    expect(result).toContain('2025');
  });
});

describe('formatDateTime', () => {
  it('should format datetime string with month and year', () => {
    const result = formatDateTime('2025-06-15T14:30:00');
    expect(result).toContain('Jun');
    expect(result).toContain('2025');
  });
});
