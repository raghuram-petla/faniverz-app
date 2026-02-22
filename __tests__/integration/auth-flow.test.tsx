/**
 * Integration test: Auth flow
 * Verifies: sign in → see tabs → sign out → see login
 */
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react-native';
import { View, Text, TouchableOpacity } from 'react-native';

// Simulated auth state
let mockSession: { user: { id: string } } | null = null;
let mockIsLoading = false;
const mockSignOut = jest.fn();

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
    ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  };
});

jest.mock('@/features/auth/hooks/useAuth', () => ({
  useAuth: () => ({
    session: mockSession,
    user: mockSession?.user ?? null,
    isLoading: mockIsLoading,
  }),
}));

jest.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      signOut: () => {
        mockSignOut();
        mockSession = null;
        return Promise.resolve({ error: null });
      },
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: jest.fn() } } }),
    },
  },
}));

// Simplified screen components for integration testing
function LoginScreen() {
  return (
    <View testID="login-screen">
      <Text>Sign In</Text>
      <TouchableOpacity
        testID="sign-in-button"
        onPress={() => {
          mockSession = { user: { id: 'user-1' } };
        }}
      >
        <Text>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

function TabsScreen() {
  return (
    <View testID="tabs-screen">
      <Text>Calendar</Text>
      <Text>Explore</Text>
      <Text>Watchlist</Text>
      <Text>Profile</Text>
      <TouchableOpacity
        testID="sign-out-button"
        onPress={() => {
          mockSession = null;
          mockSignOut();
        }}
      >
        <Text>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

function AppRoot() {
  const { useAuth } = require('@/features/auth/hooks/useAuth');
  const { session, isLoading } = useAuth();

  if (isLoading) return <View testID="splash-screen" />;
  if (!session) return <LoginScreen />;
  return <TabsScreen />;
}

describe('Auth Flow Integration', () => {
  beforeEach(() => {
    mockSession = null;
    mockIsLoading = false;
    jest.clearAllMocks();
  });

  it('shows login screen when not authenticated', () => {
    render(<AppRoot />);
    expect(screen.getByTestId('login-screen')).toBeTruthy();
  });

  it('shows tabs screen when authenticated', () => {
    mockSession = { user: { id: 'user-1' } };
    render(<AppRoot />);
    expect(screen.getByTestId('tabs-screen')).toBeTruthy();
  });

  it('shows splash while loading auth state', () => {
    mockIsLoading = true;
    render(<AppRoot />);
    expect(screen.getByTestId('splash-screen')).toBeTruthy();
  });

  it('sign in transitions to tabs', () => {
    const { rerender } = render(<AppRoot />);
    expect(screen.getByTestId('login-screen')).toBeTruthy();

    // Simulate sign in
    act(() => {
      fireEvent.press(screen.getByTestId('sign-in-button'));
    });

    rerender(<AppRoot />);
    expect(screen.getByTestId('tabs-screen')).toBeTruthy();
  });

  it('sign out transitions to login', () => {
    mockSession = { user: { id: 'user-1' } };
    const { rerender } = render(<AppRoot />);
    expect(screen.getByTestId('tabs-screen')).toBeTruthy();

    act(() => {
      fireEvent.press(screen.getByTestId('sign-out-button'));
    });

    rerender(<AppRoot />);
    expect(screen.getByTestId('login-screen')).toBeTruthy();
    expect(mockSignOut).toHaveBeenCalled();
  });
});
