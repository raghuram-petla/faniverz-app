jest.mock('@/lib/supabase', () => {
  const mockSingle = jest.fn();
  const mockEq = jest.fn(() => ({ single: mockSingle }));
  const mockIn = jest.fn(() => ({ order: jest.fn().mockResolvedValue({ data: [], error: null }) }));
  const mockSelect = jest.fn(() => ({ eq: mockEq, in: mockIn }));
  const mockFrom = jest.fn(() => ({ select: mockSelect }));

  return {
    supabase: { from: mockFrom },
    __mockFrom: mockFrom,
    __mockSelect: mockSelect,
    __mockEq: mockEq,
    __mockSingle: mockSingle,
    __mockIn: mockIn,
  };
});

import { fetchProductionHouseById, fetchProductionHouseMovies } from '../api';

const { __mockSingle, __mockEq, __mockIn } = require('@/lib/supabase');

describe('fetchProductionHouseById', () => {
  it('returns production house data', async () => {
    const house = { id: 'ph1', name: 'Test Studio', logo_url: null, description: null };
    __mockSingle.mockResolvedValueOnce({ data: house, error: null });
    const result = await fetchProductionHouseById('ph1');
    expect(result).toEqual(house);
  });

  it('throws on error', async () => {
    __mockSingle.mockResolvedValueOnce({ data: null, error: new Error('fail') });
    await expect(fetchProductionHouseById('ph1')).rejects.toThrow('fail');
  });
});

describe('fetchProductionHouseMovies', () => {
  it('returns empty array when no junction entries', async () => {
    __mockEq.mockReturnValueOnce({ single: __mockSingle });
    // First call for junction table
    const mockJunctionEq = jest.fn().mockResolvedValueOnce({
      data: [],
      error: null,
    });
    const mockJunctionSelect = jest.fn(() => ({ eq: mockJunctionEq }));
    const { __mockFrom } = require('@/lib/supabase');
    __mockFrom.mockReturnValueOnce({ select: mockJunctionSelect });

    const result = await fetchProductionHouseMovies('ph1');
    expect(result).toEqual([]);
  });

  it('throws on junction error', async () => {
    const mockJunctionEq = jest.fn().mockResolvedValueOnce({
      data: null,
      error: new Error('junction fail'),
    });
    const mockJunctionSelect = jest.fn(() => ({ eq: mockJunctionEq }));
    const { __mockFrom } = require('@/lib/supabase');
    __mockFrom.mockReturnValueOnce({ select: mockJunctionSelect });

    await expect(fetchProductionHouseMovies('ph1')).rejects.toThrow('junction fail');
  });
});
