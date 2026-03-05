import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDuration,
  formatRelativeTime,
  statusStyles,
  CURRENT_YEAR,
  YEARS,
  MONTHS,
} from '@/components/sync/syncHelpers';

describe('formatDuration', () => {
  it('returns "In progress..." when completedAt is null', () => {
    expect(formatDuration('2024-01-01T00:00:00Z', null)).toBe('In progress...');
  });

  it('formats duration in seconds when under 60s', () => {
    const started = '2024-01-01T00:00:00Z';
    const completed = '2024-01-01T00:00:45Z';
    expect(formatDuration(started, completed)).toBe('45s');
  });

  it('formats 0 seconds', () => {
    const time = '2024-01-01T00:00:00Z';
    expect(formatDuration(time, time)).toBe('0s');
  });

  it('formats duration in minutes and seconds when 60s or more', () => {
    const started = '2024-01-01T00:00:00Z';
    const completed = '2024-01-01T00:02:30Z';
    expect(formatDuration(started, completed)).toBe('2m 30s');
  });

  it('formats exact minutes with 0 remaining seconds', () => {
    const started = '2024-01-01T00:00:00Z';
    const completed = '2024-01-01T00:03:00Z';
    expect(formatDuration(started, completed)).toBe('3m 0s');
  });

  it('handles large durations', () => {
    const started = '2024-01-01T00:00:00Z';
    const completed = '2024-01-01T01:30:15Z';
    expect(formatDuration(started, completed)).toBe('90m 15s');
  });
});

describe('formatRelativeTime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-06-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "just now" for less than 1 minute ago', () => {
    expect(formatRelativeTime('2024-06-15T11:59:30Z')).toBe('just now');
  });

  it('returns minutes ago for 1-59 minutes', () => {
    expect(formatRelativeTime('2024-06-15T11:55:00Z')).toBe('5m ago');
  });

  it('returns 1m ago for exactly 1 minute', () => {
    expect(formatRelativeTime('2024-06-15T11:59:00Z')).toBe('1m ago');
  });

  it('returns hours ago for 1-23 hours', () => {
    expect(formatRelativeTime('2024-06-15T09:00:00Z')).toBe('3h ago');
  });

  it('returns 1h ago for exactly 1 hour', () => {
    expect(formatRelativeTime('2024-06-15T11:00:00Z')).toBe('1h ago');
  });

  it('returns days ago for 24+ hours', () => {
    expect(formatRelativeTime('2024-06-13T12:00:00Z')).toBe('2d ago');
  });

  it('returns 1d ago for exactly 24 hours', () => {
    expect(formatRelativeTime('2024-06-14T12:00:00Z')).toBe('1d ago');
  });
});

describe('CURRENT_YEAR', () => {
  it('equals the current year from Date', () => {
    expect(CURRENT_YEAR).toBe(new Date().getFullYear());
  });
});

describe('YEARS', () => {
  it('contains 10 years', () => {
    expect(YEARS).toHaveLength(10);
  });

  it('starts with CURRENT_YEAR + 1', () => {
    expect(YEARS[0]).toBe(CURRENT_YEAR + 1);
  });

  it('ends with CURRENT_YEAR - 8', () => {
    expect(YEARS[9]).toBe(CURRENT_YEAR - 8);
  });

  it('is in descending order', () => {
    for (let i = 0; i < YEARS.length - 1; i++) {
      expect(YEARS[i]).toBeGreaterThan(YEARS[i + 1]);
    }
  });
});

describe('MONTHS', () => {
  it('contains 12 months', () => {
    expect(MONTHS).toHaveLength(12);
  });

  it('starts with January', () => {
    expect(MONTHS[0]).toBe('January');
  });

  it('ends with December', () => {
    expect(MONTHS[11]).toBe('December');
  });

  it('contains all month names', () => {
    const expected = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    expect(MONTHS).toEqual(expected);
  });
});

describe('statusStyles', () => {
  it('has running, success, and failed keys', () => {
    expect(Object.keys(statusStyles)).toEqual(['running', 'success', 'failed']);
  });

  it('has correct running style', () => {
    expect(statusStyles.running).toEqual({
      bg: 'bg-blue-600/20',
      text: 'text-blue-400',
    });
  });

  it('has correct success style', () => {
    expect(statusStyles.success).toEqual({
      bg: 'bg-green-600/20',
      text: 'text-green-400',
    });
  });

  it('has correct failed style', () => {
    expect(statusStyles.failed).toEqual({
      bg: 'bg-red-600/20',
      text: 'text-red-400',
    });
  });

  it('each entry has bg and text properties', () => {
    for (const style of Object.values(statusStyles)) {
      expect(style).toHaveProperty('bg');
      expect(style).toHaveProperty('text');
    }
  });
});
