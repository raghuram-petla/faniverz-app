jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

jest.mock('../../usernameApi', () => ({
  checkUsernameAvailable: jest.fn(),
  setUsername: jest.fn(),
  validateUsername: jest.fn(),
}));

import { renderHook, act, waitFor } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCheckUsername, useSetUsername } from '../useUsername';
import { checkUsernameAvailable, validateUsername } from '../../usernameApi';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useCheckUsername', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null availability for empty string', () => {
    (validateUsername as jest.Mock).mockReturnValue('Username must be at least 3 characters');
    const { result } = renderHook(() => useCheckUsername(''));
    expect(result.current.isAvailable).toBeNull();
  });

  it('returns validation error for short username', () => {
    (validateUsername as jest.Mock).mockReturnValue('Username must be at least 3 characters');
    const { result } = renderHook(() => useCheckUsername('ab'));
    expect(result.current.error).toBe('Username must be at least 3 characters');
  });

  it('checks availability after debounce for valid username', async () => {
    (validateUsername as jest.Mock).mockReturnValue(null);
    (checkUsernameAvailable as jest.Mock).mockResolvedValue(true);

    const { result } = renderHook(() => useCheckUsername('valid_user'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current.isAvailable).toBe(true));
  });

  it('sets error when username is taken', async () => {
    (validateUsername as jest.Mock).mockReturnValue(null);
    (checkUsernameAvailable as jest.Mock).mockResolvedValue(false);

    const { result } = renderHook(() => useCheckUsername('taken_user'));

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    await waitFor(() => expect(result.current.error).toBe('Username is taken'));
  });
});

describe('useSetUsername', () => {
  it('returns a mutation function', () => {
    const { result } = renderHook(() => useSetUsername(), { wrapper: createWrapper() });
    expect(result.current.mutateAsync).toBeDefined();
  });
});
