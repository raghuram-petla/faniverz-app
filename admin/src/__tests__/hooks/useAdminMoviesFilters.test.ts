import { describe, it, expect } from 'vitest';
import {
  applyColumnFilters,
  applyStatusFilter,
  intersectIdSets,
  type AdvancedFilters,
} from '@/hooks/useAdminMoviesFilters';

// Minimal chainable query mock that records calls
function createQueryMock() {
  const calls: { method: string; args: unknown[] }[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handler: ProxyHandler<any> = {
    get(_target, prop) {
      if (prop === '_calls') return calls;
      return (...args: unknown[]) => {
        calls.push({ method: String(prop), args });
        return new Proxy({}, handler);
      };
    },
  };
  return new Proxy({}, handler) as unknown as Record<string, (...args: unknown[]) => unknown> & {
    _calls: { method: string; args: unknown[] }[];
  };
}

const emptyFilters: AdvancedFilters = {
  genres: [],
  releaseYear: '',
  releaseMonth: '',
  certification: '',
  language: '',
  platformId: '',
  isFeatured: false,
  minRating: '',
  actorSearch: '',
  directorSearch: '',
};

describe('applyColumnFilters', () => {
  it('returns query unchanged when no filters are active', () => {
    const query = createQueryMock();
    applyColumnFilters(query, emptyFilters);
    expect(query._calls).toHaveLength(0);
  });

  it('escapes LIKE wildcards in directorSearch', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, {
      ...emptyFilters,
      directorSearch: '100%_match\\test',
    });
    // @regression: unescaped %, _, \ would match unintended rows in ilike
    const ilikeCall = (
      result as unknown as { _calls: { method: string; args: unknown[] }[] }
    )._calls.find((c) => c.method === 'ilike');
    expect(ilikeCall).toBeDefined();
    expect(ilikeCall!.args[1]).toBe('%100\\%\\_match\\\\test%');
  });

  it('applies genre overlap filter', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, { ...emptyFilters, genres: ['action', 'drama'] });
    const call = (
      result as unknown as { _calls: { method: string; args: unknown[] }[] }
    )._calls.find((c) => c.method === 'overlaps');
    expect(call).toBeDefined();
    expect(call!.args).toEqual(['genres', ['action', 'drama']]);
  });

  it('applies certification eq filter', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, { ...emptyFilters, certification: 'UA' });
    const call = (
      result as unknown as { _calls: { method: string; args: unknown[] }[] }
    )._calls.find((c) => c.method === 'eq');
    expect(call).toBeDefined();
    expect(call!.args).toEqual(['certification', 'UA']);
  });
});

describe('applyStatusFilter', () => {
  it('adds gt release_date for upcoming', () => {
    const query = createQueryMock();
    const result = applyStatusFilter(query, 'upcoming', '2026-03-21', []);
    expect(result.empty).toBe(false);
    expect(result.includeIds).toBeNull();
  });

  it('returns empty for streaming with no pmIds', () => {
    const query = createQueryMock();
    const result = applyStatusFilter(query, 'streaming', '2026-03-21', []);
    expect(result.empty).toBe(true);
  });

  it('returns pmIds as includeIds for streaming', () => {
    const query = createQueryMock();
    const result = applyStatusFilter(query, 'streaming', '2026-03-21', ['id1', 'id2']);
    expect(result.includeIds).toEqual(['id1', 'id2']);
  });
});

describe('applyColumnFilters — additional branches', () => {
  it('returns query unchanged when filters is undefined', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, undefined);
    expect(result).toBe(query);
  });

  it('applies language eq filter', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, { ...emptyFilters, language: 'te' });
    const call = (
      result as unknown as { _calls: { method: string; args: unknown[] }[] }
    )._calls.find((c) => c.method === 'eq' && c.args[0] === 'original_language');
    expect(call).toBeDefined();
    expect(call!.args).toEqual(['original_language', 'te']);
  });

  it('applies isFeatured eq filter when true', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, { ...emptyFilters, isFeatured: true });
    const call = (
      result as unknown as { _calls: { method: string; args: unknown[] }[] }
    )._calls.find((c) => c.method === 'eq' && c.args[0] === 'is_featured');
    expect(call).toBeDefined();
    expect(call!.args).toEqual(['is_featured', true]);
  });

  it('does not apply isFeatured filter when false', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, { ...emptyFilters, isFeatured: false });
    const calls = (result as unknown as { _calls: { method: string; args: unknown[] }[] })._calls;
    expect(calls).toHaveLength(0);
  });

  it('applies minRating gte filter', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, { ...emptyFilters, minRating: '3' });
    const call = (
      result as unknown as { _calls: { method: string; args: unknown[] }[] }
    )._calls.find((c) => c.method === 'gte');
    expect(call).toBeDefined();
    expect(call!.args).toEqual(['rating', 3]);
  });

  it('applies releaseYear with default month range (01-12) when no month set', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, { ...emptyFilters, releaseYear: '2025' });
    const calls = (result as unknown as { _calls: { method: string; args: unknown[] }[] })._calls;
    const gteCall = calls.find((c) => c.method === 'gte' && c.args[0] === 'release_date');
    const lteCall = calls.find((c) => c.method === 'lte' && c.args[0] === 'release_date');
    expect(gteCall).toBeDefined();
    expect(lteCall).toBeDefined();
    expect(gteCall!.args[1]).toBe('2025-01-01');
    expect(lteCall!.args[1]).toBe('2025-12-31');
  });

  it('applies releaseYear with specific month when releaseMonth is set', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, {
      ...emptyFilters,
      releaseYear: '2025',
      releaseMonth: '06',
    });
    const calls = (result as unknown as { _calls: { method: string; args: unknown[] }[] })._calls;
    const gteCall = calls.find((c) => c.method === 'gte' && c.args[0] === 'release_date');
    const lteCall = calls.find((c) => c.method === 'lte' && c.args[0] === 'release_date');
    expect(gteCall!.args[1]).toBe('2025-06-01');
    expect(lteCall!.args[1]).toBe('2025-06-30');
  });

  it('handles February correctly (28 days for non-leap year)', () => {
    const query = createQueryMock();
    const result = applyColumnFilters(query, {
      ...emptyFilters,
      releaseYear: '2025',
      releaseMonth: '02',
    });
    const calls = (result as unknown as { _calls: { method: string; args: unknown[] }[] })._calls;
    const lteCall = calls.find((c) => c.method === 'lte' && c.args[0] === 'release_date');
    expect(lteCall!.args[1]).toBe('2025-02-28');
  });
});

describe('applyStatusFilter — additional branches', () => {
  it('applies in_theaters filter', () => {
    const query = createQueryMock();
    const result = applyStatusFilter(query, 'in_theaters', '2026-03-21', []);
    expect(result.empty).toBe(false);
    expect(result.includeIds).toBeNull();
    expect(result.excludeIds).toEqual([]);
  });

  it('applies announced filter with null release_date', () => {
    const query = createQueryMock();
    const result = applyStatusFilter(query, 'announced', '2026-03-21', []);
    expect(result.empty).toBe(false);
    expect(result.includeIds).toBeNull();
  });

  it('applies released filter — excludes pmIds', () => {
    const query = createQueryMock();
    const result = applyStatusFilter(query, 'released', '2026-03-21', ['id1', 'id2']);
    expect(result.empty).toBe(false);
    expect(result.excludeIds).toEqual(['id1', 'id2']);
    expect(result.includeIds).toBeNull();
  });

  it('returns passthrough for unknown status filter', () => {
    const query = createQueryMock();
    const result = applyStatusFilter(query, 'unknown', '2026-03-21', []);
    expect(result.empty).toBe(false);
    expect(result.includeIds).toBeNull();
    expect(result.excludeIds).toEqual([]);
  });
});

describe('intersectIdSets', () => {
  it('returns null when all sets are null', () => {
    expect(intersectIdSets(null, null)).toBeNull();
  });

  it('returns the single set when only one is provided', () => {
    expect(intersectIdSets(['a', 'b'], null)).toEqual(['a', 'b']);
  });

  it('intersects two sets correctly', () => {
    expect(intersectIdSets(['a', 'b', 'c'], ['b', 'c', 'd'])).toEqual(['b', 'c']);
  });

  it('returns empty array when no intersection', () => {
    expect(intersectIdSets(['a', 'b'], ['c', 'd'])).toEqual([]);
  });

  it('intersects three sets correctly', () => {
    expect(intersectIdSets(['a', 'b', 'c'], ['b', 'c', 'd'], ['b', 'e'])).toEqual(['b']);
  });
});
