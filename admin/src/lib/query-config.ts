/**
 * @contract Centralized TanStack Query cache timing constants for admin.
 * Import these instead of hardcoding staleTime values in hooks.
 */

/** No caching — always refetch (audit logs, real-time data) */
export const ADMIN_STALE_NONE = 0;

/** 30 seconds — rapidly changing data (search suggestions) */
export const ADMIN_STALE_30S = 30_000;

/** 1 minute — frequently updated data (movie lists, recent items) */
export const ADMIN_STALE_1M = 60_000;

/** 5 minutes — standard data freshness for most admin queries */
export const ADMIN_STALE_5M = 5 * 60_000;

/** 1 hour — slowly changing reference data (languages) */
export const ADMIN_STALE_1H = 60 * 60_000;

/** 24 hours — effectively static data (platform availability) */
export const ADMIN_STALE_24H = 24 * 60 * 60_000;
