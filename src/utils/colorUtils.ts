/**
 * Returns true if the given hex color has low luminance (perceived as dark).
 * Uses the ITU-R BT.601 luma formula.
 */
// @edge threshold 40 is intentionally low — only very dark colors return true
export function isDark(hex: string): boolean {
  const c = hex.replace('#', '');
  if (c.length < 6) return false; // @edge: short hex strings default to "not dark"
  const r = parseInt(c.substring(0, 2), 16);
  const g = parseInt(c.substring(2, 4), 16);
  const b = parseInt(c.substring(4, 6), 16);
  if (isNaN(r) || isNaN(g) || isNaN(b)) return false;
  return (r * 299 + g * 587 + b * 114) / 1000 < 40;
}
