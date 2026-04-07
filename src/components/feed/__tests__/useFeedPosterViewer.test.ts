const mockOpenImage = jest.fn();

jest.mock('@/providers/ImageViewerProvider', () => ({
  useImageViewer: () => ({ openImage: mockOpenImage, closeImage: jest.fn() }),
}));

jest.mock('@/utils/measureView', () => ({
  measureView: jest.fn((_ref: unknown, cb: (layout: object) => void) =>
    cb({ x: 0, y: 100, width: 300, height: 400 }),
  ),
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

import { renderHook, act } from '@testing-library/react-native';
import { useFeedPosterViewer } from '../useFeedPosterViewer';

beforeEach(() => jest.clearAllMocks());

describe('useFeedPosterViewer', () => {
  it('returns posterRef, posterHidden=false, and handlePress', () => {
    const { result } = renderHook(() => useFeedPosterViewer('https://img.jpg', 'POSTERS', false));
    expect(result.current.posterHidden).toBe(false);
    expect(result.current.posterRef).toBeDefined();
    expect(typeof result.current.handlePress).toBe('function');
  });

  it('calls openImage with correct params on press', () => {
    const { result } = renderHook(() => useFeedPosterViewer('https://img.jpg', 'POSTERS', false));
    act(() => result.current.handlePress());
    expect(mockOpenImage).toHaveBeenCalledWith(
      expect.objectContaining({
        feedUrl: 'https://img.jpg',
        fullUrl: 'https://img.jpg',
        borderRadius: 0,
        isLandscape: false,
        onSourceHide: expect.any(Function),
        onSourceShow: expect.any(Function),
      }),
    );
  });

  it('passes isLandscape=true for backdrop images', () => {
    const { result } = renderHook(() => useFeedPosterViewer('https://img.jpg', 'BACKDROPS', true));
    act(() => result.current.handlePress());
    expect(mockOpenImage).toHaveBeenCalledWith(expect.objectContaining({ isLandscape: true }));
  });

  it('does not call openImage when imageUrl is null', () => {
    const { result } = renderHook(() => useFeedPosterViewer(null, 'POSTERS', false));
    act(() => result.current.handlePress());
    expect(mockOpenImage).not.toHaveBeenCalled();
  });

  it('passes topChrome from getter', () => {
    const topChrome = {
      variant: 'home-feed' as const,
      insetTop: 44,
      headerContentHeight: 52,
      headerTranslateY: 0,
    };
    const getter = jest.fn(() => topChrome);
    const { result } = renderHook(() =>
      useFeedPosterViewer('https://img.jpg', 'POSTERS', false, getter),
    );
    act(() => result.current.handlePress());
    expect(getter).toHaveBeenCalled();
    expect(mockOpenImage).toHaveBeenCalledWith(expect.objectContaining({ topChrome }));
  });

  it('toggles posterHidden via onSourceHide/onSourceShow callbacks', () => {
    const { result } = renderHook(() => useFeedPosterViewer('https://img.jpg', 'POSTERS', false));
    act(() => result.current.handlePress());
    const { onSourceHide, onSourceShow } = mockOpenImage.mock.calls[0][0];
    act(() => onSourceHide());
    expect(result.current.posterHidden).toBe(true);
    act(() => onSourceShow());
    expect(result.current.posterHidden).toBe(false);
  });
});
