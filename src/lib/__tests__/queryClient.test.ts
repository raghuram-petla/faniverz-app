import { queryClient, markCacheRestored, wasCacheRestored } from '../queryClient';

describe('queryClient', () => {
  it('has correct default staleTime', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.staleTime).toBe(5 * 60 * 1000);
  });

  it('has correct default gcTime', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.gcTime).toBe(24 * 60 * 60 * 1000);
  });

  it('has retry set to 1', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.retry).toBe(1);
  });

  it('has refetchOnWindowFocus disabled', () => {
    const defaults = queryClient.getDefaultOptions();
    expect(defaults.queries?.refetchOnWindowFocus).toBe(false);
  });

  it('markCacheRestored sets the flag and wasCacheRestored reads it', () => {
    // Note: module-level flag persists across tests in the same suite
    markCacheRestored();
    expect(wasCacheRestored()).toBe(true);
  });
});
