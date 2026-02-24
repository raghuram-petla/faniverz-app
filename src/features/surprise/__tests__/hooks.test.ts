import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { useSurpriseContent } from '../hooks';
import * as api from '../api';

jest.mock('../api');

const mockContent = [
  { id: 's1', title: 'Surprise 1', category: 'memes' },
  { id: 's2', title: 'Surprise 2', category: 'trivia' },
];

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(QueryClientProvider, { client: queryClient }, children);
  };
}

describe('useSurpriseContent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches surprise content without category', async () => {
    (api.fetchSurpriseContent as jest.Mock).mockResolvedValue(mockContent);

    const { result } = renderHook(() => useSurpriseContent(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockContent);
    expect(api.fetchSurpriseContent).toHaveBeenCalledWith(undefined);
  });

  it('fetches surprise content with category filter', async () => {
    const filtered = [mockContent[0]];
    (api.fetchSurpriseContent as jest.Mock).mockResolvedValue(filtered);

    const { result } = renderHook(() => useSurpriseContent('memes' as never), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(filtered);
    expect(api.fetchSurpriseContent).toHaveBeenCalledWith('memes');
  });

  it('uses 15min staleTime (single fetch per session)', async () => {
    (api.fetchSurpriseContent as jest.Mock).mockResolvedValue(mockContent);

    const { result } = renderHook(() => useSurpriseContent(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.fetchSurpriseContent).toHaveBeenCalledTimes(1);
  });
});
