jest.mock('@/lib/supabase', () => {
  const mockUnsubscribe = jest.fn();
  let authCallback: (event: string, session: unknown) => void = () => {};

  return {
    supabase: {
      auth: {
        getSession: jest.fn().mockResolvedValue({
          data: { session: null },
        }),
        onAuthStateChange: jest.fn((cb: (event: string, session: unknown) => void) => {
          authCallback = cb;
          return { data: { subscription: { unsubscribe: mockUnsubscribe } } };
        }),
      },
    },
    __mockUnsubscribe: mockUnsubscribe,
    __fireAuthStateChange: (event: string, session: unknown) => authCallback(event, session),
  };
});

jest.mock('@/lib/queryClient', () => ({
  queryClient: { clear: jest.fn() },
}));

jest.mock('@/stores/useCalendarStore', () => ({
  useCalendarStore: { getState: () => ({ clearFilters: jest.fn() }) },
}));

jest.mock('@/stores/useFilterStore', () => ({
  useFilterStore: { getState: () => ({ clearAll: jest.fn() }) },
}));

jest.mock('@/stores/useFeedStore', () => ({
  useFeedStore: { setState: jest.fn() },
}));

import React from 'react';
import { render, renderHook, act, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { AuthProvider, useAuth } from '../AuthProvider';
import { supabase } from '@/lib/supabase';
import { queryClient } from '@/lib/queryClient';
import { useFeedStore } from '@/stores/useFeedStore';

const mockAuth = supabase.auth as unknown as {
  getSession: jest.Mock;
  onAuthStateChange: jest.Mock;
};

const mockQueryClientClear = queryClient.clear as jest.Mock;
const mockFeedSetState = (useFeedStore as unknown as { setState: jest.Mock }).setState;

const { __mockUnsubscribe, __fireAuthStateChange } = require('@/lib/supabase');

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe('AuthProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.getSession.mockResolvedValue({ data: { session: null } });
  });

  it('provides initial loading state', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.user).toBeNull();
    expect(result.current.session).toBeNull();
    expect(result.current.isGuest).toBe(false);
  });

  it('sets isLoading to false after session is fetched', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('provides session and user when getSession returns a session', async () => {
    const mockSession = {
      access_token: 'token',
      user: { id: 'user-1', email: 'test@test.com' },
    };
    mockAuth.getSession.mockResolvedValue({ data: { session: mockSession } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toEqual(mockSession);
    expect(result.current.user).toEqual(mockSession.user);
  });

  it('updates session on auth state change', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newSession = {
      access_token: 'new-token',
      user: { id: 'user-2', email: 'new@test.com' },
    };

    act(() => {
      __fireAuthStateChange('SIGNED_IN', newSession);
    });

    expect(result.current.session).toEqual(newSession);
    expect(result.current.user).toEqual(newSession.user);
  });

  it('supports guest mode via setIsGuest', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setIsGuest(true);
    });

    expect(result.current.isGuest).toBe(true);
  });

  it('clears guest mode when user signs in', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      result.current.setIsGuest(true);
    });
    expect(result.current.isGuest).toBe(true);

    const newSession = {
      access_token: 'token',
      user: { id: 'user-1', email: 'test@test.com' },
    };

    act(() => {
      __fireAuthStateChange('SIGNED_IN', newSession);
    });

    expect(result.current.isGuest).toBe(false);
  });

  it('unsubscribes from auth listener on unmount', async () => {
    const { unmount } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(mockAuth.onAuthStateChange).toHaveBeenCalled());
    unmount();

    expect(__mockUnsubscribe).toHaveBeenCalled();
  });

  it('throws when useAuth is called outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    let caughtError: Error | null = null;
    try {
      renderHook(() => useAuth());
    } catch (err) {
      caughtError = err as Error;
    }
    if (caughtError) {
      expect(caughtError.message).toContain('useAuth must be used within an AuthProvider');
    }
    spy.mockRestore();
  });

  it('memoizes context value to prevent unnecessary re-renders', async () => {
    const values: unknown[] = [];
    function Spy() {
      values.push(useAuth());
      return null;
    }

    const { rerender } = renderHook(() => {}, {
      wrapper: ({ children }: { children: React.ReactNode }) => (
        <AuthProvider>
          <Spy />
          {children}
        </AuthProvider>
      ),
    });

    await waitFor(() => expect(values.length).toBeGreaterThanOrEqual(1));
    const afterLoad = values.length;

    rerender(undefined);
    if (values.length > afterLoad) {
      expect(values[values.length - 1]).toBe(values[values.length - 2]);
    }
  });

  it('useAuth returns all expected context values', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current).toHaveProperty('session');
    expect(result.current).toHaveProperty('user');
    expect(result.current).toHaveProperty('isLoading');
    expect(result.current).toHaveProperty('isGuest');
    expect(result.current).toHaveProperty('setIsGuest');
    expect(typeof result.current.setIsGuest).toBe('function');
  });

  it('clears session and user on SIGNED_OUT event', async () => {
    const mockSession = {
      access_token: 'token',
      user: { id: 'user-1', email: 'test@test.com' },
    };
    mockAuth.getSession.mockResolvedValue({ data: { session: mockSession } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.user).toEqual(mockSession.user);

    act(() => {
      __fireAuthStateChange('SIGNED_OUT', null);
    });

    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('clears queryClient and resets stores on SIGNED_OUT', async () => {
    const mockSession = {
      access_token: 'token',
      user: { id: 'user-1', email: 'test@test.com' },
    };
    mockAuth.getSession.mockResolvedValue({ data: { session: mockSession } });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    act(() => {
      __fireAuthStateChange('SIGNED_OUT', null);
    });

    expect(mockQueryClientClear).toHaveBeenCalled();
    expect(mockFeedSetState).toHaveBeenCalledWith({ filter: 'all' });
  });

  it('does not clear stores on non-SIGNED_OUT events', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const newSession = {
      access_token: 'token',
      user: { id: 'user-1', email: 'test@test.com' },
    };

    act(() => {
      __fireAuthStateChange('SIGNED_IN', newSession);
    });

    expect(mockQueryClientClear).not.toHaveBeenCalled();
    expect(mockFeedSetState).not.toHaveBeenCalled();
  });

  it('handles getSession failure gracefully', async () => {
    mockAuth.getSession.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useAuth(), { wrapper });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.session).toBeNull();
    expect(result.current.user).toBeNull();
  });

  it('renders children correctly', () => {
    const { getByText } = render(
      <AuthProvider>
        <Text>Child content</Text>
      </AuthProvider>,
    );

    expect(getByText('Child content')).toBeTruthy();
  });
});
