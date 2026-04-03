const mockSelect = jest.fn();
const mockEq = jest.fn();
const mockOrder = jest.fn();
const mockLimit = jest.fn();
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
import { fetchNotifications, fetchNotificationsPaginated, markAsRead, markAllAsRead } from '../api';

describe('notifications api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('fetchNotifications', () => {
    it('queries notifications with movie join for the user', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: [], error: null });

      await fetchNotifications('user-1');
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockSelect).toHaveBeenCalledWith(
        '*, movie:movies(id, title, poster_url, poster_image_type), platform:platforms(id, name, logo, color), actor_profile:profiles!notifications_actor_user_id_fkey(display_name, avatar_url)',
      );
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
    });

    it('returns data on success', async () => {
      const notifications = [{ id: 'n1', title: 'New release' }];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: notifications, error: null });

      const result = await fetchNotifications('user-1');
      expect(result).toEqual(notifications);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: null, error: null });

      const result = await fetchNotifications('user-1');
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ limit: mockLimit });
      mockLimit.mockResolvedValue({ data: null, error: new Error('DB error') });

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

  describe('fetchNotificationsPaginated', () => {
    // @contract uses range() instead of limit() — same select chain as fetchNotifications
    const mockRange = jest.fn();

    it('queries notifications with range for pagination', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: [], error: null });

      await fetchNotificationsPaginated('user-1', 0, 20);
      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockSelect).toHaveBeenCalledWith(
        '*, movie:movies(id, title, poster_url, poster_image_type), platform:platforms(id, name, logo, color), actor_profile:profiles!notifications_actor_user_id_fkey(display_name, avatar_url)',
      );
      expect(mockEq).toHaveBeenCalledWith('user_id', 'user-1');
      expect(mockRange).toHaveBeenCalledWith(0, 19);
    });

    it('computes correct range for offset=20, limit=20 (to=39)', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: [], error: null });

      await fetchNotificationsPaginated('user-1', 20, 20);
      expect(mockRange).toHaveBeenCalledWith(20, 39);
    });

    it('uses default limit of 20', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: [], error: null });

      await fetchNotificationsPaginated('user-1', 0);
      expect(mockRange).toHaveBeenCalledWith(0, 19);
    });

    it('returns data on success', async () => {
      const notifications = [{ id: 'n1', title: 'Movie release' }];
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: notifications, error: null });

      const result = await fetchNotificationsPaginated('user-1', 0, 20);
      expect(result).toEqual(notifications);
    });

    it('returns empty array when data is null', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: null, error: null });

      const result = await fetchNotificationsPaginated('user-1', 0, 20);
      expect(result).toEqual([]);
    });

    it('throws on error', async () => {
      mockSelect.mockReturnValue({ eq: mockEq });
      mockEq.mockReturnValue({ order: mockOrder });
      mockOrder.mockReturnValue({ range: mockRange });
      mockRange.mockResolvedValue({ data: null, error: new Error('DB error') });

      await expect(fetchNotificationsPaginated('user-1', 0, 20)).rejects.toThrow('DB error');
    });
  });
});
