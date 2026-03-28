/** Pure formatting utilities extracted from fieldDiffHelpers. */

export function fmt(val: string | string[] | number | null | undefined): string {
  if (val == null) return '';
  if (Array.isArray(val)) return val.join(', ');
  if (typeof val === 'number') return String(val);
  return val;
}

export function truncate(s: string | null | undefined, n = 80): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}
