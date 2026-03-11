import { Platform } from 'react-native';
import { upsertPushToken, deactivatePushToken } from '../pushApi';

const mockUpsert = jest.fn().mockResolvedValue({ error: null });
const mockUpdate = jest.fn().mockReturnValue({
  eq: jest.fn().mockResolvedValue({ error: null }),
});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    from: jest.fn((table: string) => {
      if (table === 'push_tokens') {
        return {
          upsert: mockUpsert,
          update: mockUpdate,
        };
      }
      return {};
    }),
  },
}));

describe('pushApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('upsertPushToken', () => {
    it('upserts token with correct platform for iOS', async () => {
      Platform.OS = 'ios';
      await upsertPushToken('user-1', 'ExponentPushToken[abc123]');

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'user-1',
          token: 'ExponentPushToken[abc123]',
          platform: 'ios',
          is_active: true,
        },
        { onConflict: 'user_id,token' },
      );
    });

    it('upserts token with correct platform for Android', async () => {
      Platform.OS = 'android';
      await upsertPushToken('user-2', 'ExponentPushToken[xyz789]');

      expect(mockUpsert).toHaveBeenCalledWith(
        {
          user_id: 'user-2',
          token: 'ExponentPushToken[xyz789]',
          platform: 'android',
          is_active: true,
        },
        { onConflict: 'user_id,token' },
      );
    });

    it('throws on supabase error', async () => {
      mockUpsert.mockResolvedValueOnce({ error: new Error('DB error') });

      await expect(upsertPushToken('user-1', 'token')).rejects.toThrow('DB error');
    });
  });

  describe('deactivatePushToken', () => {
    it('sets token as inactive', async () => {
      const mockEq = jest.fn().mockResolvedValue({ error: null });
      mockUpdate.mockReturnValueOnce({ eq: mockEq });

      await deactivatePushToken('ExponentPushToken[abc123]');

      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(mockEq).toHaveBeenCalledWith('token', 'ExponentPushToken[abc123]');
    });

    it('throws on supabase error', async () => {
      mockUpdate.mockReturnValueOnce({
        eq: jest.fn().mockResolvedValue({ error: new Error('Fail') }),
      });

      await expect(deactivatePushToken('token')).rejects.toThrow('Fail');
    });
  });
});
