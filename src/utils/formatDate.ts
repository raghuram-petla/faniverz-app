/**
 * Format a date string as relative time (e.g., "2m ago", "3h ago", "5d ago").
 * Falls back to short date for older timestamps.
 */
// @nullable dateStr — returns 'Unknown' for null/undefined/unparseable input
// @edge future dates produce negative diffs, shown as "Just now"
// @coupling used by FeedCard, CommentItem, NotificationItem for timestamp display
export function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown';
  const now = new Date();
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  // @edge transitions from weeks to absolute date at ~4 weeks (not exactly 1 month)
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 4) return `${diffWeeks}w ago`;

  // @edge include year when the post is from a different year
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' };
  if (date.getFullYear() !== now.getFullYear()) opts.year = 'numeric';
  return date.toLocaleDateString('en-IN', opts);
}

/**
 * Format a date string as full timestamp (e.g., "15 Jan 2025, 3:30 PM").
 * Used on post detail screens to show exact publish time.
 */
// @nullable dateStr — returns 'Unknown' for null/undefined/unparseable input
export function formatFullTimestamp(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format a date string as "Mon DD, YYYY" (e.g., "Mar 15, 2025").
 */
// @edge no null guard — caller must ensure dateStr is valid; invalid input produces "Invalid Date"
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date string as "Month YYYY" (e.g., "March 2025") for member-since display.
 */
// @nullable dateStr — returns 'Unknown' for null/undefined/empty input
export function formatMemberSince(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format minutes as hours+minutes string (e.g., 270 -> "4h 30m", 45 -> "45m").
 */
export function formatWatchTime(minutes: number): string {
  if (minutes <= 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Extract the year from a date string. Returns null for undefined/null/empty input.
 */
// @nullable both input and return — callers must handle null
export function extractReleaseYear(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const year = new Date(dateStr).getFullYear();
  return isNaN(year) ? null : year;
}
