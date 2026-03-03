/**
 * Extract a YouTube video ID from various URL formats or a bare ID.
 *
 * Handles:
 * - https://www.youtube.com/watch?v=ID
 * - https://youtu.be/ID
 * - https://www.youtube.com/embed/ID
 * - https://www.youtube.com/shorts/ID
 * - bare 11-char IDs like "dQw4w9WgXcQ"
 */
export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  // Try URL patterns
  try {
    const url = new URL(trimmed);
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1) || null;
    }
    if (
      url.hostname === 'www.youtube.com' ||
      url.hostname === 'youtube.com' ||
      url.hostname === 'm.youtube.com'
    ) {
      // /watch?v=ID
      const v = url.searchParams.get('v');
      if (v) return v;

      // /embed/ID or /shorts/ID
      const match = url.pathname.match(/^\/(embed|shorts)\/([^/?]+)/);
      if (match) return match[2];
    }
  } catch {
    // Not a valid URL — try bare ID
  }

  // Bare YouTube ID (typically 11 chars, alphanumeric + - + _)
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Get YouTube thumbnail URL for a given video ID.
 */
export function getYouTubeThumbnail(
  id: string,
  quality: 'default' | 'mqdefault' | 'hqdefault' | 'maxresdefault' = 'mqdefault',
): string {
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}
