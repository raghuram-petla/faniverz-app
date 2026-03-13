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

  // @edge: bare ID check is fixed at exactly 11 chars. YouTube has used 11-char IDs
  // since launch, but this is not a documented guarantee. If YouTube ever uses
  // longer IDs, they'll be rejected here and the admin must paste the full URL instead.
  // Also, any random 11-char alphanumeric string passes this check — no validation
  // that the video actually exists on YouTube.
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

// @boundary: YouTube thumbnail URLs are publicly accessible without an API key, but
// 'maxresdefault' quality is not available for all videos — YouTube returns a grey
// placeholder image (120x90) with no error status code. The default 'mqdefault' is
// always available. The admin trailer preview uses this for thumbnail display.
export function getYouTubeThumbnail(
  id: string,
  quality: 'default' | 'mqdefault' | 'hqdefault' | 'maxresdefault' = 'mqdefault',
): string {
  return `https://img.youtube.com/vi/${id}/${quality}.jpg`;
}
