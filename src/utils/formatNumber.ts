/**
 * Format a number in compact notation (e.g., 1.2M, 5K).
 * Used by FeedActionBar, SurpriseHelpers, and anywhere view/vote counts are displayed.
 */
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}
