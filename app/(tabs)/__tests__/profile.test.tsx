import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';

const mockSignOut = jest.fn().mockResolvedValue({});

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: { signOut: () => mockSignOut() },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnValue({ data: null, error: null }),
      update: jest.fn().mockReturnThis(),
    }),
  },
}));

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
  useAuth: () => ({
    user: { id: 'user-1', email: 'test@test.com' },
    session: {},
    isLoading: false,
  }),
}));

jest.mock('@/features/auth/hooks/useProfile', () => ({
  useProfile: () => ({
    data: { display_name: 'Test User', avatar_url: null },
    isLoading: false,
  }),
}));

jest.mock('@/features/auth/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({
    mutate: jest.fn(),
    isLoading: false,
  }),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
}));

import ProfileScreen from '../profile';

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders profile screen', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('profile-screen')).toBeTruthy();
  });

  it('shows display name', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('display-name')).toBeTruthy();
    expect(screen.getByText('Test User')).toBeTruthy();
  });

  it('shows user email', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('user-email')).toBeTruthy();
    expect(screen.getByText('test@test.com')).toBeTruthy();
  });

  it('shows avatar', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('avatar')).toBeTruthy();
  });

  it('shows theme toggle', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('theme-toggle')).toBeTruthy();
    expect(screen.getByTestId('theme-light')).toBeTruthy();
    expect(screen.getByTestId('theme-dark')).toBeTruthy();
    expect(screen.getByTestId('theme-system')).toBeTruthy();
  });

  it('shows settings links', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('notifications-link')).toBeTruthy();
    expect(screen.getByTestId('language-link')).toBeTruthy();
    expect(screen.getByTestId('about-link')).toBeTruthy();
  });

  it('shows sign out button', () => {
    render(<ProfileScreen />);
    expect(screen.getByTestId('sign-out-button')).toBeTruthy();
  });

  it('calls signOut when sign out pressed', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('sign-out-button'));
    expect(mockSignOut).toHaveBeenCalledTimes(1);
  });

  it('toggles to edit mode', () => {
    render(<ProfileScreen />);
    fireEvent.press(screen.getByTestId('edit-button'));
    expect(screen.getByTestId('edit-name-input')).toBeTruthy();
    expect(screen.getByTestId('save-button')).toBeTruthy();
  });
});
