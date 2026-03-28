import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { daysUntil, type PendingChange } from '../theaterUtils';

describe('daysUntil', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Set "today" to 2026-03-27
    vi.setSystemTime(new Date('2026-03-27T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns "Today" when the date is today', () => {
    expect(daysUntil('2026-03-27')).toBe('Today');
  });

  it('returns "Today" when the date is in the past', () => {
    expect(daysUntil('2026-03-20')).toBe('Today');
  });

  it('returns "Tomorrow" when the date is 1 day away', () => {
    expect(daysUntil('2026-03-28')).toBe('Tomorrow');
  });

  it('returns "In N days" for dates further out', () => {
    expect(daysUntil('2026-03-30')).toBe('In 3 days');
  });

  it('returns "In 1 days" is not possible — 1 day returns Tomorrow', () => {
    // 1 day from now should say Tomorrow, not "In 1 days"
    expect(daysUntil('2026-03-28')).toBe('Tomorrow');
  });
});

describe('PendingChange type', () => {
  it('can construct a valid PendingChange object', () => {
    const change: PendingChange = {
      inTheaters: true,
      date: '2026-03-27',
      title: 'Test Movie',
      posterUrl: null,
      releaseDate: '2026-04-01',
      dateAction: 'none',
    };
    expect(change.inTheaters).toBe(true);
    expect(change.dateAction).toBe('none');
  });

  it('supports optional label field', () => {
    const change: PendingChange = {
      inTheaters: false,
      date: '2026-03-27',
      title: 'Another Movie',
      posterUrl: 'https://example.com/poster.jpg',
      label: 'Premiere',
      releaseDate: null,
      dateAction: 'premiere',
    };
    expect(change.label).toBe('Premiere');
  });
});
