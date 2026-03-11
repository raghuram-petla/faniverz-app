import React from 'react';
import { renderHook } from '@testing-library/react-native';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

jest.mock('../pushApi', () => ({
  upsertPushToken: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({ user: null })),
}));

import { usePushToken } from '../usePushToken';
import { upsertPushToken } from '../pushApi';
import { useAuth } from '@/features/auth/providers/AuthProvider';

const mockUseAuth = useAuth as jest.Mock;
const mockUpsert = upsertPushToken as jest.Mock;

describe('usePushToken', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({ user: null });
  });

  it('does not register when user is null', () => {
    renderHook(() => usePushToken());
    expect(mockUpsert).not.toHaveBeenCalled();
  });

  it('registers push token when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

    renderHook(() => usePushToken());

    // Wait for async operations
    await new Promise((r) => setTimeout(r, 50));

    expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
    expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
    expect(mockUpsert).toHaveBeenCalledWith('user-123', 'ExponentPushToken[test]');
  });

  it('does not register on non-device', async () => {
    (Device as { isDevice: boolean }).isDevice = false;
    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });

    renderHook(() => usePushToken());

    await new Promise((r) => setTimeout(r, 50));
    expect(mockUpsert).not.toHaveBeenCalled();

    // Restore
    (Device as { isDevice: boolean }).isDevice = true;
  });

  it('requests permissions when not granted', async () => {
    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValueOnce({
      status: 'undetermined',
    });

    mockUseAuth.mockReturnValue({ user: { id: 'user-123' } });
    renderHook(() => usePushToken());

    await new Promise((r) => setTimeout(r, 50));
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

    await new Promise((r) => setTimeout(r, 50));
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
