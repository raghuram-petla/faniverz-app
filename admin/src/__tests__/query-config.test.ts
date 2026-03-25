import { describe, it, expect } from 'vitest';
import {
  ADMIN_STALE_NONE,
  ADMIN_STALE_30S,
  ADMIN_STALE_1M,
  ADMIN_STALE_5M,
  ADMIN_STALE_1H,
  ADMIN_STALE_24H,
} from '@/lib/query-config';

describe('Admin query config constants', () => {
  it('ADMIN_STALE_NONE should be 0', () => {
    expect(ADMIN_STALE_NONE).toBe(0);
  });

  it('ADMIN_STALE_30S should be 30 seconds in ms', () => {
    expect(ADMIN_STALE_30S).toBe(30_000);
  });

  it('ADMIN_STALE_1M should be 1 minute in ms', () => {
    expect(ADMIN_STALE_1M).toBe(60_000);
  });

  it('ADMIN_STALE_5M should be 5 minutes in ms', () => {
    expect(ADMIN_STALE_5M).toBe(300_000);
  });

  it('ADMIN_STALE_1H should be 1 hour in ms', () => {
    expect(ADMIN_STALE_1H).toBe(3_600_000);
  });

  it('ADMIN_STALE_24H should be 24 hours in ms', () => {
    expect(ADMIN_STALE_24H).toBe(86_400_000);
  });

  it('constants should be in ascending order', () => {
    const ordered = [
      ADMIN_STALE_NONE,
      ADMIN_STALE_30S,
      ADMIN_STALE_1M,
      ADMIN_STALE_5M,
      ADMIN_STALE_1H,
      ADMIN_STALE_24H,
    ];
    for (let i = 1; i < ordered.length; i++) {
      expect(ordered[i]).toBeGreaterThan(ordered[i - 1]);
    }
  });
});
