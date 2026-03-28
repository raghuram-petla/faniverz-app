/**
 * @contract Centralized smart pagination configuration for all list screens.
 * Each screen has a preset defining initial load size, expanded page size,
 * prefetch threshold, and optional related-data prefetch behavior.
 */

/**
 * @contract Configuration for smart infinite query behavior.
 * - initialPageSize: items in first page (small for instant display)
 * - expandedPageSize: items in subsequent pages
 * - prefetchItemsRemaining: start fetching next page when N items left unseen
 * - backgroundExpand: auto-fetch page 2 after page 1 settles
 */
export interface SmartPaginationConfig {
  initialPageSize: number;
  expandedPageSize: number;
  prefetchItemsRemaining: number;
  backgroundExpand: boolean;
}

/**
 * @contract Extended config that includes related-data prefetch behavior.
 * Used by feeds to prefetch comments when items become visible.
 */
export interface SmartPaginationConfigWithPrefetch extends SmartPaginationConfig {
  prefetchRelated?: {
    /** Field on the item containing a count (e.g., 'comment_count') */
    countField: string;
    /** Only prefetch if count exceeds this threshold */
    countThreshold: number;
  };
}

/** @contract Default config — used as fallback for screens without a specific preset */
export const SMART_PAGINATION_DEFAULTS: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

/** Home feed — fast first paint + comment prefetch */
export const FEED_PAGINATION: SmartPaginationConfigWithPrefetch = {
  initialPageSize: 5,
  expandedPageSize: 15,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
  prefetchRelated: {
    countField: 'comment_count',
    countThreshold: 10,
  },
};

/** News feed — same as home feed */
export const NEWS_FEED_PAGINATION: SmartPaginationConfigWithPrefetch = {
  ...FEED_PAGINATION,
};

/** Discover grid */
export const DISCOVER_PAGINATION: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

/** Calendar screen */
export const CALENDAR_PAGINATION: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

/** Watchlist screen */
export const WATCHLIST_PAGINATION: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

/** Activity log */
export const ACTIVITY_PAGINATION: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 20,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

/** Comments list */
export const COMMENTS_PAGINATION: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 20,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

/** Notifications */
export const NOTIFICATIONS_PAGINATION: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 20,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};

/** Search results */
export const SEARCH_PAGINATION: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 3,
  backgroundExpand: true,
};

/** Reviews (movie + user) */
export const REVIEWS_PAGINATION: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 3,
  backgroundExpand: true,
};

/** Following list */
export const FOLLOWING_PAGINATION: SmartPaginationConfig = {
  initialPageSize: 5,
  expandedPageSize: 10,
  prefetchItemsRemaining: 5,
  backgroundExpand: true,
};
