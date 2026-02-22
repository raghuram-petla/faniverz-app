import { parseNotificationDeepLink } from '../deep-link';

describe('parseNotificationDeepLink', () => {
  it('returns movie link for movieId number', () => {
    expect(parseNotificationDeepLink({ movieId: 42 })).toBe('/movie/42');
  });

  it('returns movie link for movieId string', () => {
    expect(parseNotificationDeepLink({ movieId: '42' })).toBe('/movie/42');
  });

  it('returns movie link for movie_id', () => {
    expect(parseNotificationDeepLink({ movie_id: 99 })).toBe('/movie/99');
  });

  it('returns url if starts with /', () => {
    expect(parseNotificationDeepLink({ url: '/settings/notifications' })).toBe(
      '/settings/notifications'
    );
  });

  it('ignores non-relative urls', () => {
    expect(parseNotificationDeepLink({ url: 'https://example.com' })).toBeNull();
  });

  it('returns null for empty data', () => {
    expect(parseNotificationDeepLink(null)).toBeNull();
  });

  it('returns null for unrecognized data', () => {
    expect(parseNotificationDeepLink({ foo: 'bar' })).toBeNull();
  });

  it('prefers movieId over url', () => {
    expect(parseNotificationDeepLink({ movieId: 42, url: '/other' })).toBe('/movie/42');
  });
});
