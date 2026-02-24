const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockUpdate = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      select: mockSelect,
      update: mockUpdate,
    })),
  },
}));

import { supabase } from '@/lib/supabase';
import { fetchNotifications, markAsRead, markAllAsRead } from '../api';

describe('notifications api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchNotifications', () => {
    it('queries notifications with movie join for the user', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: [], error: null });

      await fetchNotifications('user-1');
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockSelect).toHaveBeenCalledWith('*, movie:movies(title, poster_url)');
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('returns data on success', async () => {
      const notifications = [{ id: 'n1', title: 'New release' }];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: notifications, error: null });

      const result = await fetchNotifications('user-1');
      expect(result).toEqual(notifications);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: null });

      const result = await fetchNotifications('user-1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(fetchNotifications('user-1')).rejects.toThrow('DB error');
    });
  });

  describe('markAsRead', () => {
    it('updates a notification as read', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: null });

      await markAsRead('n1');
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({ read: true });
      expect(mockEq).toHaveBeenCalledWith('id', 'n1');
    });

    it('throws on error', async () => {
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockResolvedValue({ error: new Error('Not found') });

      await expect(markAsRead('n1')).rejects.toThrow('Not found');
    });
  });

  describe('markAllAsRead', () => {
    it('updates all unread notifications for the user', async () => {
      const mockEq2 = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: null });

      await markAllAsRead('user-1');
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockUpdate).toHaveBeenCalledWith({ read: true });
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockEq2).toHaveBeenCalledWith('read', false);
    });

    it('throws on error', async () => {
      const mockEq2 = jest.fn();
      mockUpdate.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockEq2.mockResolvedValue({ error: new Error('Failed') });

      await expect(markAllAsRead('user-1')).rejects.toThrow('Failed');
    });
  });
});
