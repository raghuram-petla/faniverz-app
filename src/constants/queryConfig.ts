/**
 * @contract Centralized TanStack Query cache timing constants.
 * Import these instead of hardcoding staleTime values in hooks.
 */

/** 1 minute — fast-changing data like notifications */
export const STALE_1M = 60 * 1000;

/** 2 minutes — frequently updated data like watchlists */
export const STALE_2M = 2 * 60 * 1000;

/** 5 minutes — standard data freshness for most queries */
export const STALE_5M = 5 * 60 * 1000;

/** 10 minutes — moderately static data like actor/movie details */
export const STALE_10M = 10 * 60 * 1000;

/** 15 minutes — rarely changing data */
export const STALE_15M = 15 * 60 * 1000;

/** 24 hours — effectively static data like platform lists */
export const STALE_24H = 24 * 60 * 60 * 1000;
