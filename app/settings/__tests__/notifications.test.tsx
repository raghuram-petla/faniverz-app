import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
  };
});

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}));

const mockUpdatePreference = jest.fn();
jest.mock('@/features/notifications/useNotificationSettings', () => ({
  useNotificationSettings: () => ({
    preferences: {
      notify_watchlist: true,
      notify_ott: true,
      notify_digest: false,
    },
    isLoading: false,
    updatePreference: mockUpdatePreference,
    isPending: false,
  }),
}));

jest.mock('expo-notifications', () => ({
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
}));

import NotificationSettingsScreen from '../notifications';

describe('NotificationSettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders notification settings', () => {
    render(<NotificationSettingsScreen />);
    expect(screen.getByTestId('notification-settings')).toBeTruthy();
  });

  it('renders three toggles', () => {
    render(<NotificationSettingsScreen />);
    expect(screen.getByTestId('toggle-watchlist')).toBeTruthy();
    expect(screen.getByTestId('toggle-ott')).toBeTruthy();
    expect(screen.getByTestId('toggle-digest')).toBeTruthy();
  });

  it('shows correct toggle states', () => {
    render(<NotificationSettingsScreen />);
    expect(screen.getByTestId('toggle-watchlist').props.value).toBe(true);
    expect(screen.getByTestId('toggle-ott').props.value).toBe(true);
    expect(screen.getByTestId('toggle-digest').props.value).toBe(false);
  });

  it('calls updatePreference when toggle changes', () => {
    render(<NotificationSettingsScreen />);
    fireEvent(screen.getByTestId('toggle-digest'), 'valueChange', true);
    expect(mockUpdatePreference).toHaveBeenCalledWith({ notify_digest: true });
  });

  it('calls updatePreference for watchlist toggle', () => {
    render(<NotificationSettingsScreen />);
    fireEvent(screen.getByTestId('toggle-watchlist'), 'valueChange', false);
    expect(mockUpdatePreference).toHaveBeenCalledWith({ notify_watchlist: false });
  });
});
