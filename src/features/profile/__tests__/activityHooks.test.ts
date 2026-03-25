jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(),
}));

jest.mock('../activityApi', () => ({
  fetchUserActivity: jest.fn(),
  PAGE_SIZE: 20,
}));

import { renderHook, waitFor } from '@testing-library/react-native';
import { createWrapper } from '@/__tests__/helpers/createWrapper';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { fetchUserActivity } from '../activityApi';
import { useUserActivity } from '../activityHooks';

const mockUseAuth = useAuth as jest.Mock;
const mockFetch = fetchUserActivity as jest.Mock;

describe('useUserActivity', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns activity when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockFetch.mockResolvedValue([{ id: 'a1', action_type: 'vote' }]);

    const { result } = renderHook(() => useUserActivity('all'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetch).toHaveBeenCalledWith('u1', 'all', 0);
  });

  it('does not fetch when user is not authenticated', () => {
    mockUseAuth.mockReturnValue({ user: null });

    const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

    expect(result.current.data).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('stops pagination when last page has fewer items than PAGE_SIZE', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    // Return fewer than PAGE_SIZE (20) items — means no next page
    mockFetch.mockResolvedValue([{ id: 'a1', action_type: 'vote' }]);

    const { result } = renderHook(() => useUserActivity('all'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    // hasNextPage should be false since fewer than PAGE_SIZE items returned
    expect(result.current.hasNextPage).toBe(false);
  });

  it('continues pagination when last page has exactly PAGE_SIZE items', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    // Return exactly PAGE_SIZE (20) items — means there may be more
    const fullPage = Array.from({ length: 20 }, (_, i) => ({ id: `a${i}`, action_type: 'vote' }));
    mockFetch.mockResolvedValue(fullPage);

    const { result } = renderHook(() => useUserActivity('all'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(result.current.hasNextPage).toBe(true);
  });

  it('uses the filter parameter in the query key', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockFetch.mockResolvedValue([{ id: 'a1', action_type: 'follow' }]);

    const { result } = renderHook(() => useUserActivity('follows'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetch).toHaveBeenCalledWith('u1', 'follows', 0);
  });

  it('uses default filter of all when no filter argument provided', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockFetch.mockResolvedValue([{ id: 'a1', action_type: 'vote' }]);

    const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetch).toHaveBeenCalledWith('u1', 'all', 0);
  });

  it('fetches with different filter values to exercise query key differentiation', async () => {
    mockUseAuth.mockReturnValue({ user: { id: 'u1' } });
    mockFetch.mockResolvedValue([{ id: 'a1', action_type: 'review' }]);

    const { result } = renderHook(() => useUserActivity('votes'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.data).toBeDefined());
    expect(mockFetch).toHaveBeenCalledWith('u1', 'votes', 0);
  });

  it('uses userId fallback when user object has no id property', async () => {
    // user?.id evaluates to undefined, making userId=undefined.
    // enabled: !!undefined = false, so queryFn should NOT run.
    // This tests the falsy userId path more explicitly.
    mockUseAuth.mockReturnValue({ user: {} });
    mockFetch.mockResolvedValue([]);

    const { result } = renderHook(() => useUserActivity(), { wrapper: createWrapper() });

    // Query should be disabled since !!undefined is false
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
