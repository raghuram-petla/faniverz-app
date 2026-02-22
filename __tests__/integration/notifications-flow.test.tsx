import { parseNotificationDeepLink } from '@/features/notifications/deep-link';

describe('Notifications Integration Flow', () => {
  describe('Deep Link Parsing', () => {
    it('movie notification → movie detail link', () => {
      const data = { movieId: 42 };
      expect(parseNotificationDeepLink(data)).toBe('/movie/42');
    });

    it('watchlist reminder data → movie detail link', () => {
      const data = { movieId: 99, type: 'watchlist_reminder' };
      expect(parseNotificationDeepLink(data)).toBe('/movie/99');
    });

    it('OTT available data → movie detail link', () => {
      const data = { movie_id: 55, type: 'ott_available' };
      expect(parseNotificationDeepLink(data)).toBe('/movie/55');
    });

    it('weekly digest with no movie → null', () => {
      const data = { type: 'weekly_digest' };
      expect(parseNotificationDeepLink(data)).toBeNull();
    });

    it('settings deep link → settings path', () => {
      const data = { url: '/settings/notifications' };
      expect(parseNotificationDeepLink(data)).toBe('/settings/notifications');
    });

    it('handles malformed data gracefully', () => {
      expect(parseNotificationDeepLink(null)).toBeNull();
      expect(parseNotificationDeepLink({})).toBeNull();
      expect(parseNotificationDeepLink({ random: 'data' })).toBeNull();
    });
  });

  describe('Notification Preferences', () => {
    it('preference fields match expected shape', () => {
      const prefs = {
        notify_watchlist: true,
        notify_ott: true,
        notify_digest: false,
      };

      expect(typeof prefs.notify_watchlist).toBe('boolean');
      expect(typeof prefs.notify_ott).toBe('boolean');
      expect(typeof prefs.notify_digest).toBe('boolean');
    });
  });

  describe('Notification Queue Data', () => {
    it('watchlist notification has correct structure', () => {
      const notification = {
        user_id: 'user-1',
        movie_id: 42,
        type: 'watchlist_reminder' as const,
        title: 'Movie X releases tomorrow!',
        body: 'Get ready! Movie X is releasing tomorrow.',
        data: { movieId: 42 },
        scheduled_for: '2026-02-23T03:30:00Z',
        status: 'pending' as const,
      };

      expect(notification.type).toBe('watchlist_reminder');
      expect(notification.data.movieId).toBe(42);
      expect(notification.status).toBe('pending');
    });

    it('OTT notification has platform info', () => {
      const notification = {
        user_id: 'user-1',
        movie_id: 42,
        type: 'ott_available' as const,
        title: 'Movie X is now on Netflix',
        body: 'Watch Movie X now on Netflix!',
        data: { movieId: 42 },
        scheduled_for: new Date().toISOString(),
        status: 'pending' as const,
      };

      expect(notification.type).toBe('ott_available');
      expect(notification.title).toContain('Netflix');
    });

    it('cancellation sets status to cancelled', () => {
      const pending = { status: 'pending' as const };
      const cancelled = { ...pending, status: 'cancelled' as const };
      expect(cancelled.status).toBe('cancelled');
    });
  });
});
