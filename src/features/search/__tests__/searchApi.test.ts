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

  it('returns partial results when one query fails', async () => {
    const movieData = [{ id: '1', title: 'Test Movie' }];
    const mockFrom = supabase.from as jest.Mock;
    mockFrom.mockImplementation((table: string) => {
      if (table === 'actors') {
        // actors query rejects
        return {
          select: jest.fn(() => ({
            ilike: jest.fn(() => ({
              limit: jest.fn().mockRejectedValue(new Error('actors timeout')),
            })),
          })),
        };
      }
      return {
        select: jest.fn(() => ({
          ilike: jest.fn(() => ({
            order: jest.fn(() => ({
              limit: jest.fn().mockResolvedValue({ data: movieData, error: null }),
            })),
            limit: jest.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      };
    });

    const result = await searchAll('test');
    // Movies and productionHouses succeed; actors returns empty due to failure
    expect(result.movies).toEqual(movieData);
    expect(result.actors).toEqual([]);
    expect(result.productionHouses).toEqual([]);
  });
});
