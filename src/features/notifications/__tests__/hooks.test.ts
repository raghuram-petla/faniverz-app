import { renderHook } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const mockRegisterPushToken = jest.fn();
jest.mock('../api', () => ({
  registerPushToken: (...args: unknown[]) => mockRegisterPushToken(...args),
}));

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockAddListener = jest.fn((_cb: unknown) => ({ remove: jest.fn() }));
const mockGetLastResponse = jest.fn(() => Promise.resolve(null));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: () => mockGetPermissionsAsync(),
  requestPermissionsAsync: () => mockRequestPermissionsAsync(),
  getExpoPushTokenAsync: () => mockGetExpoPushTokenAsync(),
  addNotificationResponseReceivedListener: (cb: unknown) => mockAddListener(cb),
  getLastNotificationResponseAsync: () => mockGetLastResponse(),
}));

jest.mock('expo-device', () => ({
  isDevice: true,
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));

import { useNotifications, useNotificationHandler } from '../hooks';

describe('useNotifications', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('registers push token when permission granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
    mockRegisterPushToken.mockResolvedValue({});

    renderHook(() => useNotifications('user-1'));

    // Wait for async registration
    await new Promise((r) => setTimeout(r, 50));

    expect(mockRegisterPushToken).toHaveBeenCalledWith('user-1', 'ExponentPushToken[abc]', 'ios');
  });

  it('requests permission if not granted', async () => {
    mockGetPermissionsAsync.mockResolvedValue({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
    mockGetExpoPushTokenAsync.mockResolvedValue({ data: 'ExponentPushToken[abc]' });
    mockRegisterPushToken.mockResolvedValue({});

    renderHook(() => useNotifications('user-1'));

    await new Promise((r) => setTimeout(r, 50));

    expect(mockRequestPermissionsAsync).toHaveBeenCalled();
    expect(mockRegisterPushToken).toHaveBeenCalled();
  });

  it('does not register when userId is undefined', async () => {
    renderHook(() => useNotifications(undefined));

    await new Promise((r) => setTimeout(r, 50));

    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
  });
});

describe('useNotificationHandler', () => {
  it('sets up notification listener', () => {
    renderHook(() => useNotificationHandler());
    expect(mockAddListener).toHaveBeenCalled();
  });

  it('checks last notification response on mount', () => {
    renderHook(() => useNotificationHandler());
    expect(mockGetLastResponse).toHaveBeenCalled();
  });
});
