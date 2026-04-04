import {
  FEED_PAGINATION,
  NEWS_FEED_PAGINATION,
  DISCOVER_PAGINATION,
  CALENDAR_PAGINATION,
  WATCHLIST_PAGINATION,
  ACTIVITY_PAGINATION,
  COMMENTS_PAGINATION,
  SEARCH_PAGINATION,
} from '../paginationConfig';

describe('paginationConfig', () => {
  describe('FEED_PAGINATION', () => {
    it('has fast first paint settings with comment prefetch', () => {
      expect(FEED_PAGINATION.initialPageSize).toBe(5);
      expect(FEED_PAGINATION.expandedPageSize).toBe(15);
      expect(FEED_PAGINATION.prefetchItemsRemaining).toBe(5);
      expect(FEED_PAGINATION.backgroundExpand).toBe(true);
      expect(FEED_PAGINATION.prefetchRelated).toEqual({
        countField: 'comment_count',
        countThreshold: 10,
      });
    });
  });

  describe('NEWS_FEED_PAGINATION', () => {
    it('mirrors FEED_PAGINATION settings', () => {
      expect(NEWS_FEED_PAGINATION).toEqual(FEED_PAGINATION);
    });
  });

  describe('DISCOVER_PAGINATION', () => {
    it('has discover grid settings', () => {
      expect(DISCOVER_PAGINATION).toEqual({
        initialPageSize: 5,
        expandedPageSize: 10,
        prefetchItemsRemaining: 5,
        backgroundExpand: true,
      });
    });
  });

  describe('CALENDAR_PAGINATION', () => {
    it('has calendar screen settings', () => {
      expect(CALENDAR_PAGINATION).toEqual({
        initialPageSize: 5,
        expandedPageSize: 10,
        prefetchItemsRemaining: 5,
        backgroundExpand: true,
      });
    });
  });

  describe('WATCHLIST_PAGINATION', () => {
    it('has watchlist screen settings', () => {
      expect(WATCHLIST_PAGINATION).toEqual({
        initialPageSize: 5,
        expandedPageSize: 10,
        prefetchItemsRemaining: 5,
        backgroundExpand: true,
      });
    });
  });

  describe('ACTIVITY_PAGINATION', () => {
    it('has larger expanded page for activity log', () => {
      expect(ACTIVITY_PAGINATION.expandedPageSize).toBe(20);
      expect(ACTIVITY_PAGINATION.initialPageSize).toBe(5);
    });
  });

  describe('COMMENTS_PAGINATION', () => {
    it('has larger expanded page for comments list', () => {
      expect(COMMENTS_PAGINATION.expandedPageSize).toBe(20);
      expect(COMMENTS_PAGINATION.initialPageSize).toBe(5);
    });
  });

  describe('SEARCH_PAGINATION', () => {
    it('has smaller prefetch threshold for search results', () => {
      expect(SEARCH_PAGINATION.prefetchItemsRemaining).toBe(3);
      expect(SEARCH_PAGINATION.expandedPageSize).toBe(10);
    });
  });
});
