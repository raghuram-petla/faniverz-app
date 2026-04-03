// Mock requestAnimationFrame to execute synchronously
global.requestAnimationFrame = (cb: FrameRequestCallback) => {
  cb(0);
  return 0;
};
global.cancelAnimationFrame = jest.fn();

jest.mock('@/features/auth/providers/AuthProvider', () => ({
  useAuth: jest.fn(() => ({ user: { id: 'user-1' } })),
}));

jest.mock('@/features/feed/viewTrackingApi', () => ({
  recordFeedViews: jest.fn(),
}));

import { renderHook, act } from '@testing-library/react-native';
import { useTrackFeedViews } from '../useTrackFeedViews';
import { useAuth } from '@/features/auth/providers/AuthProvider';
import { recordFeedViews } from '@/features/feed/viewTrackingApi';

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockRecordFeedViews = recordFeedViews as jest.MockedFunction<typeof recordFeedViews>;

const makeViewToken = (id: string) => ({
  item: { id },
  key: id,
  index: 0,
  isViewable: true,
});

describe('useTrackFeedViews', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseAuth.mockReturnValue({ user: { id: 'user-1' } } as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('batches viewable items and flushes after interval', () => {
    const { result } = renderHook(() => useTrackFeedViews());

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [makeViewToken('a'), makeViewToken('b')],
      });
    });

    // Not flushed yet
    expect(mockRecordFeedViews).not.toHaveBeenCalled();

    // Advance past flush interval
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockRecordFeedViews).toHaveBeenCalledWith(['a', 'b']);
  });

  it('deduplicates — same item ID is not added to batch twice', () => {
    const { result } = renderHook(() => useTrackFeedViews());

    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken('a')] });
    });
    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken('a')] });
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockRecordFeedViews).toHaveBeenCalledTimes(1);
    expect(mockRecordFeedViews).toHaveBeenCalledWith(['a']);
  });

  it('flushes immediately when batch reaches 10 items', () => {
    const { result } = renderHook(() => useTrackFeedViews());

    const tokens = Array.from({ length: 10 }, (_, i) => makeViewToken(`item-${i}`));

    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: tokens });
    });

    // Should have flushed immediately (batch threshold reached)
    expect(mockRecordFeedViews).toHaveBeenCalledTimes(1);
    expect(mockRecordFeedViews).toHaveBeenCalledWith(
      expect.arrayContaining(['item-0', 'item-9']),
    );
  });

  it('resetDedup clears session set — same item can be re-tracked', () => {
    const { result } = renderHook(() => useTrackFeedViews());

    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken('a')] });
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockRecordFeedViews).toHaveBeenCalledTimes(1);

    // Reset dedup
    act(() => {
      result.current.resetDedup();
    });

    // Same item should now be tracked again
    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken('a')] });
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(mockRecordFeedViews).toHaveBeenCalledTimes(2);
    expect(mockRecordFeedViews).toHaveBeenLastCalledWith(['a']);
  });

  it('flushes remaining pending items on unmount', () => {
    const { result, unmount } = renderHook(() => useTrackFeedViews());

    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken('x')] });
    });

    expect(mockRecordFeedViews).not.toHaveBeenCalled();

    unmount();

    expect(mockRecordFeedViews).toHaveBeenCalledWith(['x']);
  });

  it('does nothing when user is not authenticated', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockUseAuth.mockReturnValue({ user: null } as any);

    const { result } = renderHook(() => useTrackFeedViews());

    act(() => {
      result.current.onViewableItemsChanged({ viewableItems: [makeViewToken('a')] });
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockRecordFeedViews).not.toHaveBeenCalled();
  });

  it('skips items without an id field', () => {
    const { result } = renderHook(() => useTrackFeedViews());

    act(() => {
      result.current.onViewableItemsChanged({
        viewableItems: [
          { item: { name: 'no-id' }, key: '0', index: 0, isViewable: true },
          makeViewToken('valid'),
        ],
      });
    });

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(mockRecordFeedViews).toHaveBeenCalledWith(['valid']);
  });
});
