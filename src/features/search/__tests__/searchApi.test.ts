const mockOrder = jest.fn(() => ({
  limit: jest.fn().mockResolvedValue({ data: [], error: null }),
}));
const mockLimit = jest.fn().mockResolvedValue({ data: [], error: null });

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        ilike: jest.fn(() => ({
          order: mockOrder,
          limit: mockLimit,
        })),
      })),
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import { searchAll } from '../searchApi';

describe('searchAll', () => {
  beforeEach(() => jest.clearAllMocks());

  it('queries all three tables', async () => {
    await searchAll('pushpa');
    const fromCalls = (supabase.from as jest.Mock).mock.calls;
    expect(fromCalls.some((c: string[]) => c[0] === 'movies')).toBe(true);
    expect(fromCalls.some((c: string[]) => c[0] === 'actors')).toBe(true);
    expect(fromCalls.some((c: string[]) => c[0] === 'production_houses')).toBe(true);
  });

  it('returns grouped results', async () => {
    const result = await searchAll('test');
    expect(result).toHaveProperty('movies');
    expect(result).toHaveProperty('actors');
    expect(result).toHaveProperty('productionHouses');
  });

  it('returns empty arrays when no data', async () => {
    const result = await searchAll('xyz');
    expect(result.movies).toEqual([]);
    expect(result.actors).toEqual([]);
    expect(result.productionHouses).toEqual([]);
  });
});
