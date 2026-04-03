import { renderHook, act } from '@testing-library/react-native';
import { useProgrammaticRefresh } from '../useProgrammaticRefresh';

describe('useProgrammaticRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  const createParams = (overrides?: Partial<Parameters<typeof useProgrammaticRefresh>[0]>) => ({
    refreshing: false,
    onRefresh: jest.fn().mockResolvedValue(undefined),
    showRefreshIndicator: jest.fn(),
    hideRefreshIndicator: jest.fn(),
    ...overrides,
  });

  it('returns showProgrammaticRefreshIndicator=false initially', () => {
    const { result } = renderHook(() => useProgrammaticRefresh(createParams()));
    expect(result.current.showProgrammaticRefreshIndicator).toBe(false);
  });

  it('shows indicator and calls onRefresh when triggered', async () => {
    const params = createParams();
    const { result } = renderHook(() => useProgrammaticRefresh(params));

    await act(async () => {
      result.current.runProgrammaticRefresh();
    });

    expect(params.showRefreshIndicator).toHaveBeenCalledTimes(1);
    expect(params.onRefresh).toHaveBeenCalledTimes(1);
    expect(result.current.showProgrammaticRefreshIndicator).toBe(true);

    // Advance past minimum display time
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.showProgrammaticRefreshIndicator).toBe(false);
    expect(params.hideRefreshIndicator).toHaveBeenCalled();
  });

  it('does not run when already refreshing', () => {
    const params = createParams({ refreshing: true });
    const { result } = renderHook(() => useProgrammaticRefresh(params));

    act(() => {
      result.current.runProgrammaticRefresh();
    });
    expect(params.onRefresh).not.toHaveBeenCalled();
  });

  it('cleans up timeout on unmount', async () => {
    const params = createParams();
    const { result, unmount } = renderHook(() => useProgrammaticRefresh(params));

    await act(async () => {
      result.current.runProgrammaticRefresh();
    });

    unmount();
    expect(params.hideRefreshIndicator).toHaveBeenCalled();
  });
});
