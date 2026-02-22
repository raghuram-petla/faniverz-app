import {
  registerPushToken,
  deactivatePushToken,
  fetchNotificationPreferences,
  updateNotificationPreferences,
} from '../api';

const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockUpsert = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockEq2 = jest.fn();

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn(() => ({
      upsert: mockUpsert,
      update: mockUpdate,
      select: mockSelect,
    })),
  },
}));

describe('Notifications API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerPushToken', () => {
    it('upserts a push token', async () => {
      const mockData = {
        id: 1,
        user_id: 'user-1',
        expo_push_token: 'ExponentPushToken[xxx]',
        device_platform: 'ios',
        is_active: true,
      };
      mockSingle.mockResolvedValue({ data: mockData, error: null });
      mockSelect.mockReturnValue({ single: mockSingle });
      mockUpsert.mockReturnValue({ select: mockSelect });

      const result = await registerPushToken('user-1', 'ExponentPushToken[xxx]', 'ios');
      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          expo_push_token: 'ExponentPushToken[xxx]',
          device_platform: 'ios',
          is_active: true,
        },
        { onConflict: 'user_id,expo_push_token' }
      );
      expect(result).toEqual(mockData);
    });
  });

  describe('deactivatePushToken', () => {
    it('deactivates a token', async () => {
      mockEq2.mockResolvedValue({ error: null });
      mockEq.mockReturnValue({ eq: mockEq2 });
      mockUpdate.mockReturnValue({ eq: mockEq });

      await deactivatePushToken('user-1', 'ExponentPushToken[xxx]');
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
    });
  });

  describe('fetchNotificationPreferences', () => {
    it('fetches user notification prefs', async () => {
      const mockPrefs = { notify_watchlist: true, notify_ott: true, notify_digest: false };
      mockSingle.mockResolvedValue({ data: mockPrefs, error: null });
      mockEq.mockReturnValue({ single: mockSingle });
      mockSelect.mockReturnValue({ eq: mockEq });

      const result = await fetchNotificationPreferences('user-1');
      expect(result).toEqual(mockPrefs);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('updates preferences', async () => {
      mockEq.mockResolvedValue({ error: null });
      mockUpdate.mockReturnValue({ eq: mockEq });

      await updateNotificationPreferences('user-1', { notify_digest: true });
      expect(mockUpdate).toHaveBeenCalledWith({ notify_digest: true });
    });
  });
});
