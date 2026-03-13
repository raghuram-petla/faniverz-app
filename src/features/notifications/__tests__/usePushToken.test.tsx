import React from 'react';
import { renderHook, act } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        eas: { projectId: 'test-project-id' },
      },
    },
  },
}));

jest.mock('../pushApi', () => ({
  upsertPushToken: jest.fn().mockResolvedValue(undefined),
  deactivatePushToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({ user: null })),
}));

import { usePushToken } from '../usePushToken';
import { upsertPushToken, deactivatePushToken } from '../pushApi';
import { useAuth } from '@/features/auth/providers/AuthProvider';

const mockUseAuth = useAuth as jest.Mock;
const mockUpsert = upsertPushToken as jest.Mock;
const mockDeactivate = deactivatePushToken as jest.Mock;
const mockGetItem = AsyncStorage.getItem as jest.Mock;

// Helper: wait for async effect to settle
const flushAsync = () => new Promise((r) => setTimeout(r, 50));

describe('usePushToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
    mockGetItem.mockResolvedValue(null);
    (Device as { isDevice: boolean }).isDevice = true;
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExponentPushToken[test]',
    });
  });

  afterEach(() => {
    (Device as { isDevice: boolean }).isDevice = true;
  });

  // --- Existing behavior ---

  it('does not register when user is null', async () => {
    renderHook(() => usePushToken());
    await flushAsync();
    expect(mockUpsert).not.toHaveBeenCalled();
    expect(mockDeactivate).not.toHaveBeenCalled();
  });

  it('registers push token when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

    renderHook(() => usePushToken());
    await flushAsync();

    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith('user-123', 'ExponentPushToken[test]');
  });

  it('does not register on non-device', async () => {
    (Device as { isDevice: boolean }).isDevice = false;
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

    renderHook(() => usePushToken());
    await flushAsync();

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('requests permissions when not granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'undetermined',
    });

    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });
    renderHook(() => usePushToken());
    await flushAsync();

    expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
  });

  it('does not upsert when permissions denied', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });
    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'denied',
    });

    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });
    renderHook(() => usePushToken());
    await flushAsync();

    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('does not re-register on subsequent renders (registeredRef guard)', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

    const { rerender } = renderHook(() => usePushToken());
    await flushAsync();
    expect(mockUpsert).toHaveBeenCalledTimes(1);

    // Re-render should not re-register
    mockUpsert.mockClear();
    rerender({});
    await flushAsync();
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  // --- Opted-out flow (deactivatePushToken via getExistingPushToken) ---

  describe('opted-out flow', () => {
    it('calls deactivatePushToken when push_notifications is "false"', async () => {
      mockGetItem.mockResolvedValue('false');
      mockUseAuth.mockReturnValue({ user: { id: 'user-opt-out' } });

      renderHook(() => usePushToken());
      await flushAsync();

      // Should NOT request permissions (getExistingPushToken uses getPermissionsAsync only)
      expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
      // Should read existing permissions
      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      // Should deactivate, not upsert
      expect(mockDeactivate).toHaveBeenCalledWith('ExponentPushToken[test]');
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('does not deactivate when opted out but permissions not granted', async () => {
      mockGetItem.mockResolvedValue('false');
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
      mockUseAuth.mockReturnValue({ user: { id: 'user-opt-out' } });

      renderHook(() => usePushToken());
      await flushAsync();

      expect(mockDeactivate).not.toHaveBeenCalled();
      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('does not deactivate when opted out on non-device', async () => {
      (Device as { isDevice: boolean }).isDevice = false;
      mockGetItem.mockResolvedValue('false');
      mockUseAuth.mockReturnValue({ user: { id: 'user-opt-out' } });

      renderHook(() => usePushToken());
      await flushAsync();

      expect(mockDeactivate).not.toHaveBeenCalled();
    });

    it('sets registeredRef after deactivation to prevent re-runs', async () => {
      mockGetItem.mockResolvedValue('false');
      mockUseAuth.mockReturnValue({ user: { id: 'user-opt-out' } });

      const { rerender } = renderHook(() => usePushToken());
      await flushAsync();
      expect(mockDeactivate).toHaveBeenCalledTimes(1);

      // Re-render should not re-deactivate
      mockDeactivate.mockClear();
      rerender({});
      await flushAsync();
      expect(mockDeactivate).not.toHaveBeenCalled();
    });
  });

  // --- Session swap resetting registeredRef ---

  describe('session swap (user change)', () => {
    it('re-registers when user ID changes', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-A' } });

      const { rerender } = renderHook(() => usePushToken());
      await flushAsync();
      expect(mockUpsert).toHaveBeenCalledWith('user-A', 'ExponentPushToken[test]');

      // Switch to user B
      mockUpsert.mockClear();
      mockUseAuth.mockReturnValue({ user: { id: 'user-B' } });
      rerender({});
      await flushAsync();

      expect(mockUpsert).toHaveBeenCalledWith('user-B', 'ExponentPushToken[test]');
    });

    it('does not re-register when same user ID is provided again', async () => {
      mockUseAuth.mockReturnValue({ user: { id: 'user-A' } });

      const { rerender } = renderHook(() => usePushToken());
      await flushAsync();
      expect(mockUpsert).toHaveBeenCalledTimes(1);

      // Same user, re-render
      mockUpsert.mockClear();
      mockUseAuth.mockReturnValue({ user: { id: 'user-A' } });
      rerender({});
      await flushAsync();

      expect(mockUpsert).not.toHaveBeenCalled();
    });

    it('handles swap from opted-out user to opted-in user', async () => {
      // User A opts out
      mockGetItem.mockResolvedValue('false');
      mockUseAuth.mockReturnValue({ user: { id: 'user-A' } });

      const { rerender } = renderHook(() => usePushToken());
      await flushAsync();
      expect(mockDeactivate).toHaveBeenCalledTimes(1);
      expect(mockUpsert).not.toHaveBeenCalled();

      // Switch to user B who is opted in
      mockDeactivate.mockClear();
      mockGetItem.mockResolvedValue(null);
      mockUseAuth.mockReturnValue({ user: { id: 'user-B' } });
      rerender({});
      await flushAsync();

      expect(mockUpsert).toHaveBeenCalledWith('user-B', 'ExponentPushToken[test]');
      expect(mockDeactivate).not.toHaveBeenCalled();
    });
  });

  // --- Error handling with console.warn ---

  describe('error handling', () => {
    it('logs error with console.warn when registration fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const error = new Error('Network error');
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValueOnce(error);
      mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

      renderHook(() => usePushToken());
      await flushAsync();

      expect(warnSpy).toHaveBeenCalledWith('Push token registration failed:', error);
      expect(mockUpsert).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('logs error with console.warn when upsert fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const error = new Error('Supabase error');
      mockUpsert.mockRejectedValueOnce(error);
      mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

      renderHook(() => usePushToken());
      await flushAsync();

      expect(warnSpy).toHaveBeenCalledWith('Push token registration failed:', error);
      warnSpy.mockRestore();
    });

    it('logs error with console.warn when deactivation fails (opted out)', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const error = new Error('Deactivation error');
      mockGetItem.mockResolvedValue('false');
      mockDeactivate.mockRejectedValueOnce(error);
      mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

      renderHook(() => usePushToken());
      await flushAsync();

      expect(warnSpy).toHaveBeenCalledWith('Push token registration failed:', error);
      warnSpy.mockRestore();
    });

    it('does not crash the app when push token fetch fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValueOnce(
        new Error('Missing projectId'),
      );
      mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

      // Should not throw
      expect(() => renderHook(() => usePushToken())).not.toThrow();
      await flushAsync();

      expect(warnSpy).toHaveBeenCalledWith('Push token registration failed:', expect.any(Error));
      warnSpy.mockRestore();
    });

    it('does not crash when AsyncStorage.getItem fails', async () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      mockGetItem.mockRejectedValueOnce(new Error('Storage error'));
      mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

      expect(() => renderHook(() => usePushToken())).not.toThrow();
      await flushAsync();

      expect(warnSpy).toHaveBeenCalledWith('Push token registration failed:', expect.any(Error));
      warnSpy.mockRestore();
    });
  });
});
