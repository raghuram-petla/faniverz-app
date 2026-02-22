import { renderHook, waitFor, act } from '@testing-library/react-native';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@/lib/supabase', () => ({ supabase: {} }));

const mockFetchPrefs = jest.fn();
const mockUpdatePrefs = jest.fn();

jest.mock('../api', () => ({
  fetchNotificationPreferences: (...args: unknown[]) => mockFetchPrefs(...args),
  updateNotificationPreferences: (...args: unknown[]) => mockUpdatePrefs(...args),
}));

import { useNotificationSettings } from '../useNotificationSettings';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  }
  return Wrapper;
}

describe('useNotificationSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches notification preferences', async () => {
    const mockPrefs = { notify_watchlist: true, notify_ott: true, notify_digest: false };
    mockFetchPrefs.mockResolvedValue(mockPrefs);

    const { result } = renderHook(() => useNotificationSettings('user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.preferences).toEqual(mockPrefs);
  });

  it('updates a preference', async () => {
    const mockPrefs = { notify_watchlist: true, notify_ott: true, notify_digest: false };
    mockFetchPrefs.mockResolvedValue(mockPrefs);
    mockUpdatePrefs.mockResolvedValue(undefined);

    const { result } = renderHook(() => useNotificationSettings('user-1'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      result.current.updatePreference({ notify_digest: true });
    });

    expect(mockUpdatePrefs).toHaveBeenCalledWith('user-1', { notify_digest: true });
  });

  it('does not fetch when userId is undefined', () => {
    renderHook(() => useNotificationSettings(undefined), {
      wrapper: createWrapper(),
    });
    expect(mockFetchPrefs).not.toHaveBeenCalled();
  });
});
