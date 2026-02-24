import { formatRelativeTime, formatDate, formatMemberSince, formatWatchTime } from '../formatDate';

describe('formatRelativeTime', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Just now" for timestamps less than 1 minute ago', () => {
    const thirtySecsAgo = new Date('2025-06-15T11:59:30Z').toISOString();
    expect(formatRelativeTime(thirtySecsAgo)).toBe('Just now');
  });

  it('returns "Just now" for the current time', () => {
    const now = new Date('2025-06-15T12:00:00Z').toISOString();
    expect(formatRelativeTime(now)).toBe('Just now');
  });

  it('returns "Xm ago" for timestamps minutes ago', () => {
    const fiveMinsAgo = new Date('2025-06-15T11:55:00Z').toISOString();
    expect(formatRelativeTime(fiveMinsAgo)).toBe('5m ago');
  });

  it('returns "1m ago" for exactly 1 minute ago', () => {
    const oneMinAgo = new Date('2025-06-15T11:59:00Z').toISOString();
    expect(formatRelativeTime(oneMinAgo)).toBe('1m ago');
  });

  it('returns "59m ago" for 59 minutes ago', () => {
    const fiftyNineMinsAgo = new Date('2025-06-15T11:01:00Z').toISOString();
    expect(formatRelativeTime(fiftyNineMinsAgo)).toBe('59m ago');
  });

  it('returns "Xh ago" for timestamps hours ago', () => {
    const threeHoursAgo = new Date('2025-06-15T09:00:00Z').toISOString();
    expect(formatRelativeTime(threeHoursAgo)).toBe('3h ago');
  });

  it('returns "1h ago" for exactly 1 hour ago', () => {
    const oneHourAgo = new Date('2025-06-15T11:00:00Z').toISOString();
    expect(formatRelativeTime(oneHourAgo)).toBe('1h ago');
  });

  it('returns "23h ago" for 23 hours ago', () => {
    const twentyThreeHoursAgo = new Date('2025-06-14T13:00:00Z').toISOString();
    expect(formatRelativeTime(twentyThreeHoursAgo)).toBe('23h ago');
  });

  it('returns "Xd ago" for timestamps days ago (under 7 days)', () => {
    const twoDaysAgo = new Date('2025-06-13T12:00:00Z').toISOString();
    expect(formatRelativeTime(twoDaysAgo)).toBe('2d ago');
  });

  it('returns "1d ago" for exactly 1 day ago', () => {
    const oneDayAgo = new Date('2025-06-14T12:00:00Z').toISOString();
    expect(formatRelativeTime(oneDayAgo)).toBe('1d ago');
  });

  it('returns "6d ago" for 6 days ago', () => {
    const sixDaysAgo = new Date('2025-06-09T12:00:00Z').toISOString();
    expect(formatRelativeTime(sixDaysAgo)).toBe('6d ago');
  });

  it('returns short date for timestamps 7+ days ago', () => {
    const tenDaysAgo = new Date('2025-06-05T12:00:00Z').toISOString();
    const result = formatRelativeTime(tenDaysAgo);
    // Should be a short date like "Jun 5"
    expect(result).toMatch(/Jun\s+5/);
  });

  it('returns short date for timestamps months ago', () => {
    const monthsAgo = new Date('2025-01-15T12:00:00Z').toISOString();
    const result = formatRelativeTime(monthsAgo);
    expect(result).toMatch(/Jan\s+15/);
  });
});

describe('formatDate', () => {
  it('formats a date as "Mon DD, YYYY"', () => {
    expect(formatDate('2025-03-15T12:00:00Z')).toMatch(/Mar\s+15,\s+2025/);
  });

  it('formats another date correctly', () => {
    expect(formatDate('2024-12-01T12:00:00Z')).toMatch(/Dec\s+1,\s+2024/);
  });

  it('formats a date in January', () => {
    expect(formatDate('2025-01-05T12:00:00Z')).toMatch(/Jan\s+5,\s+2025/);
  });
});

describe('formatMemberSince', () => {
  it('formats a date as "Month YYYY"', () => {
    const result = formatMemberSince('2025-03-15T12:00:00Z');
    expect(result).toMatch(/March\s+2025/);
  });

  it('returns "Unknown" for null input', () => {
    expect(formatMemberSince(null)).toBe('Unknown');
  });

  it('returns "Unknown" for undefined input', () => {
    expect(formatMemberSince(undefined)).toBe('Unknown');
  });

  it('returns "Unknown" for empty string', () => {
    expect(formatMemberSince('')).toBe('Unknown');
  });

  it('formats December correctly', () => {
    const result = formatMemberSince('2024-12-25T12:00:00Z');
    expect(result).toMatch(/December\s+2024/);
  });
});

describe('formatWatchTime', () => {
  it('formats 270 minutes as "4h"', () => {
    expect(formatWatchTime(270)).toBe('4h');
  });

  it('formats 60 minutes as "1h"', () => {
    expect(formatWatchTime(60)).toBe('1h');
  });

  it('formats 0 minutes as "0h"', () => {
    expect(formatWatchTime(0)).toBe('0h');
  });

  it('formats 59 minutes as "0h" (floors to hours)', () => {
    expect(formatWatchTime(59)).toBe('0h');
  });

  it('formats 120 minutes as "2h"', () => {
    expect(formatWatchTime(120)).toBe('2h');
  });

  it('formats 150 minutes as "2h" (floors partial hours)', () => {
    expect(formatWatchTime(150)).toBe('2h');
  });
});
