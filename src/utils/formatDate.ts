/**
 * Format a date string as relative time (e.g., "2m ago", "3h ago", "5d ago").
 * Falls back to short date for older timestamps.
 */
export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format a date string as "Mon DD, YYYY" (e.g., "Mar 15, 2025").
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * Format a date string as "Month YYYY" (e.g., "March 2025") for member-since display.
 */
export function formatMemberSince(dateStr: string | null | undefined): string {
  if (!dateStr) return 'Unknown';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

/**
 * Format minutes as hours string (e.g., 270 -> "4h").
 */
export function formatWatchTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  return `${h}h`;
}
