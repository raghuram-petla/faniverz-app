// @contract: lightweight class-name joiner — NOT the npm 'clsx' package.
// Intentionally avoids object syntax ({active: bool}) to keep bundle small.
export function cn(...classes: (string | undefined | null | false)[]) {
  return classes.filter(Boolean).join(' ');
}

// @edge TMDB can return "", " ", or malformed dates — only accept valid YYYY-MM-DD strings.
export function safeDateOrNull(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) return null;
  return trimmed;
}

// @edge: hardcoded 'en-US' locale — admin panel dates display in US format regardless of the admin user's browser locale.
// @edge: new Date(date) with a bare date string "2025-01-15" is parsed as UTC midnight,
// which in IST (UTC+5:30) shows as Jan 14 — off by one day for Indian admins.
export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function formatDateTime(date: string | Date) {
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// @edge: does not handle multi-byte characters — truncating a string mid-emoji
// (e.g. "Hello 🎬 World" at length 8) produces a broken surrogate pair.
export function truncate(str: string, maxLength: number) {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '...';
}
