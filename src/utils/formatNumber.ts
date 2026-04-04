/**
 * Format a number in compact notation (e.g., 1.2M, 5K).
 * Used by FeedActionBar, SurpriseHelpers, and anywhere view/vote counts are displayed.
 */
// @edge values 1000-1499 display as "1K" (floor), not "1.5K" — intentional for cleaner UI
// @contract negative values pass through as-is (no compact formatting)
// @edge NaN input passes through String(NaN) → "NaN" — callers should default to 0
export function formatCompactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return String(value);
}
