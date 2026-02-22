import React from 'react';
import { Text } from 'react-native';
import { render, screen, waitFor } from '@testing-library/react-native';
import { AuthProvider } from '../providers/AuthProvider';
import { useAuth } from '../hooks/useAuth';

const mockGetSession = jest.fn();
const mockOnAuthStateChange = jest.fn();

jest.mock('../../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      onAuthStateChange: (callback: unknown) => mockOnAuthStateChange(callback),
    },
  },
}));

function TestConsumer() {
  const { session, user, isLoading } = useAuth();
  return (
    <Text testID="auth-info">
      {isLoading ? 'loading' : 'ready'}|{session ? 'session' : 'no-session'}|
      {user ? user.id : 'no-user'}
    </Text>
  );
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: jest.fn() } },
    });
  });

  it('provides null session when unauthenticated', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      const info = screen.getByTestId('auth-info');
      expect(info.props.children.join('')).toContain('ready');
      expect(info.props.children.join('')).toContain('no-session');
    });
  });

  it('isLoading starts true then becomes false', async () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    // Initially loading
    const info = screen.getByTestId('auth-info');
    expect(info.props.children.join('')).toContain('loading');

    // After session resolves
    await waitFor(() => {
      expect(screen.getByTestId('auth-info').props.children.join('')).toContain('ready');
    });
  });

  it('provides session after sign-in', async () => {
    const mockSession = {
      user: { id: 'user-123', email: 'test@test.com' },
      access_token: 'token',
    };
    mockGetSession.mockResolvedValue({ data: { session: mockSession } });

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    await waitFor(() => {
      const info = screen.getByTestId('auth-info');
      expect(info.props.children.join('')).toContain('session');
      expect(info.props.children.join('')).toContain('user-123');
    });
  });

  it('subscribes to auth state changes', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(mockOnAuthStateChange).toHaveBeenCalledWith(expect.any(Function));
  });

  it('unsubscribes on unmount', () => {
    const mockUnsubscribe = jest.fn();
    mockOnAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: mockUnsubscribe } },
    });

    const { unmount } = render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    unmount();
    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
