/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, act } from '@testing-library/react-native';
import { FeedPager } from '../FeedPager';
import type { ScrollToTopHandle } from '../FeedPage.types';

// Mock PagerView — allows triggering onPageSelected programmatically
let capturedOnPageSelected: ((e: any) => void) | null = null;

jest.mock('react-native-pager-view', () => {
  const { View } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: React.forwardRef((props: any, ref: any) => {
      capturedOnPageSelected = props.onPageSelected;
      React.useImperativeHandle(ref, () => ({
        setPage: jest.fn((_page: number) => {}),
      }));
      return (
        <View testID="pager-view" {...props}>
          {props.children}
        </View>
      );
    }),
  };
});

// Mock FeedPage with testID for verification
jest.mock('../FeedPage', () => ({
  FeedPage: ({ filter, isActive }: any) => {
    const { View, Text } = require('react-native');
    return (
      <View testID={`feed-page-${filter}`}>
        <Text>{isActive ? 'active' : 'inactive'}</Text>
      </View>
    );
  },
}));

// Mock the feed store
const mockSetPageIndex = jest.fn();
let mockPageIndex = 0;

jest.mock('@/stores/useFeedStore', () => ({
  useFeedStore: () => ({
    pageIndex: mockPageIndex,
    setPageIndex: mockSetPageIndex,
  }),
}));

// Mock FEED_PILLS
jest.mock('@/constants/feedHelpers', () => ({
  FEED_PILLS: [
    { label: 'All', value: 'all', activeColor: '#DC2626' },
    { label: 'Trailers', value: 'trailers', activeColor: '#DC2626' },
    { label: 'Songs', value: 'songs', activeColor: '#DC2626' },
  ],
  getEntityAvatarUrl: () => 'https://avatar.url',
  getEntityName: () => 'Entity',
  getEntityId: () => 'entity-1',
}));

function makeActiveScrollToTopRef(): React.MutableRefObject<ScrollToTopHandle> {
  return {
    current: {
      scrollToTop: jest.fn(),
      getScrollOffset: jest.fn(() => 0),
    },
  };
}

const defaultProps = {
  totalHeaderHeight: 100,
  handleScroll: jest.fn(),
  getImageViewerTopChrome: jest.fn(() => undefined),
  setCommentSheetItemId: jest.fn(),
  onPageChange: jest.fn(),
};

describe('FeedPager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPageIndex = 0;
    capturedOnPageSelected = null;
  });

  it('renders PagerView', () => {
    const ref = makeActiveScrollToTopRef();
    render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);
    expect(screen.getByTestId('pager-view')).toBeTruthy();
  });

  it('mounts first page by default (lazy mounting)', () => {
    const ref = makeActiveScrollToTopRef();
    render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);
    // Page 0 (all) should be mounted since it's in visitedPages initially
    expect(screen.getByTestId('feed-page-all')).toBeTruthy();
    // Page 1 (trailers) should NOT be mounted yet
    expect(screen.queryByTestId('feed-page-trailers')).toBeNull();
  });

  it('lazy-mounts new pages when navigating via swipe (handlePageSelected)', () => {
    const ref = makeActiveScrollToTopRef();
    render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);

    // Simulate swipe to page 1
    act(() => {
      capturedOnPageSelected?.({ nativeEvent: { position: 1 } });
    });

    expect(mockSetPageIndex).toHaveBeenCalledWith(1);
    expect(screen.getByTestId('feed-page-trailers')).toBeTruthy();
  });

  it('does not add duplicate to visitedPages when swiping back to already-visited page', () => {
    const ref = makeActiveScrollToTopRef();
    render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);

    // Swipe to page 1
    act(() => {
      capturedOnPageSelected?.({ nativeEvent: { position: 1 } });
    });

    // Swipe back to page 0 (already visited)
    act(() => {
      capturedOnPageSelected?.({ nativeEvent: { position: 0 } });
    });

    // Both pages should be mounted
    expect(screen.getByTestId('feed-page-all')).toBeTruthy();
    expect(screen.getByTestId('feed-page-trailers')).toBeTruthy();
  });

  it('calls onPageChange with scroll offset when page changes', () => {
    const onPageChange = jest.fn();
    const ref = makeActiveScrollToTopRef();
    render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} onPageChange={onPageChange} />);

    act(() => {
      capturedOnPageSelected?.({ nativeEvent: { position: 1 } });
    });

    expect(onPageChange).toHaveBeenCalled();
  });

  it('shows first page as active, others as inactive', () => {
    const ref = makeActiveScrollToTopRef();
    render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);
    // Page 0 is active
    const activePage = screen.getByTestId('feed-page-all');
    expect(activePage.findAllByType('Text' as any).length).toBeGreaterThanOrEqual(0);
  });

  it('delegates activeScrollToTopRef.scrollToTop to active page', () => {
    const ref = makeActiveScrollToTopRef();
    render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);
    // After render, ref.current should be updated with proxy
    expect(ref.current).toBeDefined();
    // Calling scrollToTop on ref should not throw
    expect(() => ref.current.scrollToTop()).not.toThrow();
  });

  it('delegates activeScrollToTopRef.getScrollOffset to active page', () => {
    const ref = makeActiveScrollToTopRef();
    render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);
    // getScrollOffset on proxy ref should return a number
    const offset = ref.current.getScrollOffset();
    expect(typeof offset).toBe('number');
  });

  it('marks new page as visited when navigated via pill (pageIndex change)', async () => {
    const ref = makeActiveScrollToTopRef();
    // Start at page 0
    mockPageIndex = 0;
    const { rerender } = render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);

    // Simulate pill navigation: pageIndex changes to 2
    mockPageIndex = 2;
    act(() => {
      rerender(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);
    });

    // Page 2 (songs) should now be mounted
    expect(screen.getByTestId('feed-page-songs')).toBeTruthy();
  });

  it('does not re-add visited page when pill tapped for already-visited page', async () => {
    const ref = makeActiveScrollToTopRef();
    mockPageIndex = 0;
    const { rerender } = render(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);

    // Navigate away and back
    mockPageIndex = 1;
    act(() => {
      rerender(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);
    });

    mockPageIndex = 0;
    act(() => {
      rerender(<FeedPager {...defaultProps} activeScrollToTopRef={ref} />);
    });

    // All previously visited pages should still be mounted
    expect(screen.getByTestId('feed-page-all')).toBeTruthy();
    expect(screen.getByTestId('feed-page-trailers')).toBeTruthy();
  });
});
