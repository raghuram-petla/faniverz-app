jest.mock('../searchApi', () => ({
  searchAll: jest.fn().mockResolvedValue({ movies: [], actors: [], productionHouses: [] }),
}));

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUniversalSearch } from '../searchHooks';
import { searchAll } from '../searchApi';

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

describe('useUniversalSearch', () => {
  beforeEach(() => jest.clearAllMocks());

  it('does not search when query is too short', () => {
    renderHook(() => useUniversalSearch('a'), { wrapper: createWrapper() });
    expect(searchAll).not.toHaveBeenCalled();
  });

  it('searches when query length >= 2', async () => {
    const { result } = renderHook(() => useUniversalSearch('ab'), { wrapper: createWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(searchAll).toHaveBeenCalledWith('ab');
  });
});
