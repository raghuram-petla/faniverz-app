const mockRange = jest.fn();
const mockIn = jest.fn(() => ({ range: mockRange }));
const mockOrder = jest.fn(() => ({ range: mockRange, in: mockIn }));
const mockEq = jest.fn(() => ({ order: mockOrder }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({ select: mockSelect })),
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchUserActivity } from '../activityApi';

describe('fetchUserActivity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('fetches all activity for a user', async () => {
    const mockData = [{ id: '1', action_type: 'vote', entity_type: 'feed_item', entity_id: 'f1' }];
    mockRange.mockResolvedValue({ data: mockData, error: null });

    const result = await fetchUserActivity('user-1');

    expect(supabase.from).toHaveBeenCalledWith('user_activity');
    expect(mockSelect).toHaveBeenCalledWith('*');
    expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    expect(mockRange).toHaveBeenCalledWith(0, 19);
    expect(result).toEqual(mockData);
  });

  it('filters by action type when filter is votes', async () => {
    mockIn.mockReturnValue({ range: mockRange });
    mockRange.mockResolvedValue({ data: [], error: null });

    await fetchUserActivity('user-1', 'votes');

    expect(mockIn).toHaveBeenCalledWith('action_type', ['vote']);
  });

  it('filters by follow/unfollow when filter is follows', async () => {
    mockIn.mockReturnValue({ range: mockRange });
    mockRange.mockResolvedValue({ data: [], error: null });

    await fetchUserActivity('user-1', 'follows');

    expect(mockIn).toHaveBeenCalledWith('action_type', ['follow', 'unfollow']);
  });

  it('filters by comment when filter is comments', async () => {
    mockIn.mockReturnValue({ range: mockRange });
    mockRange.mockResolvedValue({ data: [], error: null });

    await fetchUserActivity('user-1', 'comments');

    expect(mockIn).toHaveBeenCalledWith('action_type', ['comment']);
  });

  it('paginates with offset parameter', async () => {
    mockRange.mockResolvedValue({ data: [], error: null });

    await fetchUserActivity('user-1', 'all', 40);

    expect(mockRange).toHaveBeenCalledWith(40, 59);
  });

  it('throws on error', async () => {
    mockRange.mockResolvedValue({ data: null, error: new Error('DB error') });

    await expect(fetchUserActivity('user-1')).rejects.toThrow('DB error');
  });

  it('returns empty array when data is null', async () => {
    mockRange.mockResolvedValue({ data: null, error: null });

    const result = await fetchUserActivity('user-1');
    expect(result).toEqual([]);
  });
});
