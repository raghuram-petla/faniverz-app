import {
  formatRelativeTime,
  formatDate,
  formatMemberSince,
  formatWatchTime,
  extractReleaseYear,
} from '../formatDate';

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

  it('returns "Xw ago" for timestamps 1-3 weeks ago', () => {
    const tenDaysAgo = new Date('2025-06-05T12:00:00Z').toISOString();
    expect(formatRelativeTime(tenDaysAgo)).toBe('1w ago');

    const twoWeeksAgo = new Date('2025-06-01T12:00:00Z').toISOString();
    expect(formatRelativeTime(twoWeeksAgo)).toBe('2w ago');
  });

  it('returns short date for timestamps 4+ weeks ago', () => {
    const monthsAgo = new Date('2025-01-15T12:00:00Z').toISOString();
    const result = formatRelativeTime(monthsAgo);
    expect(result).toMatch(/15.*Jan|Jan.*15/);
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
  it('formats 270 minutes as "4h 30m"', () => {
    expect(formatWatchTime(270)).toBe('4h 30m');
  });

  it('formats 60 minutes as "1h"', () => {
    expect(formatWatchTime(60)).toBe('1h');
  });

  it('formats 0 minutes as "0m"', () => {
    expect(formatWatchTime(0)).toBe('0m');
  });

  it('formats 59 minutes as "59m"', () => {
    expect(formatWatchTime(59)).toBe('59m');
  });

  it('formats 120 minutes as "2h"', () => {
    expect(formatWatchTime(120)).toBe('2h');
  });

  it('formats 150 minutes as "2h 30m"', () => {
    expect(formatWatchTime(150)).toBe('2h 30m');
  });

  it('formats negative input as "0m"', () => {
    expect(formatWatchTime(-10)).toBe('0m');
  });
});

describe('extractReleaseYear', () => {
  it('returns year from valid date string', () => {
    expect(extractReleaseYear('2025-06-15T12:00:00Z')).toBe(2025);
  });

  it('returns null for undefined', () => {
    expect(extractReleaseYear(undefined)).toBeNull();
  });

  it('returns null for null', () => {
    expect(extractReleaseYear(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractReleaseYear('')).toBeNull();
  });

  it('returns null for invalid date string', () => {
    expect(extractReleaseYear('not-a-date')).toBeNull();
  });

  it('extracts year from short date string', () => {
    expect(extractReleaseYear('2024-12-25')).toBe(2024);
  });
});

describe('formatRelativeTime — future dates', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-06-15T12:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns "Just now" for future dates (negative diff)', () => {
    const futureDate = new Date('2025-06-15T13:00:00Z').toISOString();
    expect(formatRelativeTime(futureDate)).toBe('Just now');
  });
});

describe('formatRelativeTime — null/invalid guard', () => {
  it('returns "Unknown" for null', () => {
    expect(formatRelativeTime(null)).toBe('Unknown');
  });

  it('returns "Unknown" for undefined', () => {
    expect(formatRelativeTime(undefined)).toBe('Unknown');
  });

  it('returns "Unknown" for empty string', () => {
    expect(formatRelativeTime('')).toBe('Unknown');
  });

  it('returns "Unknown" for an unparseable string', () => {
    expect(formatRelativeTime('not-a-date')).toBe('Unknown');
  });
});
