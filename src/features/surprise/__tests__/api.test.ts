const mockSelect = jest.fn();
const mockOrder = jest.fn();
const mockEq = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchSurpriseContent } from '../api';

describe('surprise api', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockSelect.mockReturnValue({ order: mockOrder });
  });

  describe('fetchSurpriseContent', () => {
    it('queries surprise_content table without category filter', async () => {
      mockOrder.mockResolvedValue({ data: [], error: null });

      await fetchSurpriseContent();
      expect(supabase.from).toHaveBeenCalledWith('surprise_content');
      expect(mockSelect).toHaveBeenCalledWith('*');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('filters by category when provided', async () => {
      mockOrder.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ data: [], error: null });

      await fetchSurpriseContent('memes' as never);
      expect(supabase.from).toHaveBeenCalledWith('surprise_content');
      expect(mockEq).toHaveBeenCalledWith('category', 'memes');
    });

    it('returns data on success', async () => {
      const content = [{ id: 's1', title: 'Surprise!' }];
      mockOrder.mockResolvedValue({ data: content, error: null });

      const result = await fetchSurpriseContent();
      expect(result).toEqual(content);
    });

    it('returns empty array when data is null', async () => {
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await fetchSurpriseContent();
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(fetchSurpriseContent()).rejects.toThrow('DB error');
    });
  });
});
