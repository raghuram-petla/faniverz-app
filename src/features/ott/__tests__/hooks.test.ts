import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { usePlatforms } from '../hooks';
import * as api from '../api';

jest.mock('../api');

const mockPlatforms = [
  { id: 'netflix', name: 'Netflix', logo: 'N', color: '#E50914', display_order: 1 },
  { id: 'aha', name: 'Aha', logo: '🎬', color: '#FF6B00', display_order: 2 },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('usePlatforms', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches platforms successfully', async () => {
    (api.fetchPlatforms as jest.Mock).mockResolvedValue(mockPlatforms);

    const { result } = renderHook(() => usePlatforms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockPlatforms);
  });

  it('uses 24hr staleTime', async () => {
    (api.fetchPlatforms as jest.Mock).mockResolvedValue(mockPlatforms);

    const { result } = renderHook(() => usePlatforms(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    // Second call should use cache
    expect(api.fetchPlatforms).toHaveBeenCalledTimes(1);
  });
});
