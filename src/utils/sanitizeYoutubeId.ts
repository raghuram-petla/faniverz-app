/**
 * Validates a YouTube video ID contains only safe characters [a-zA-Z0-9_-].
 * Returns the ID if valid, empty string if not.
 * @contract: must be called before interpolating youtubeId into URLs or HTML.
 */
// @boundary XSS prevention — blocks script injection via crafted YouTube IDs in embed iframes
// @coupling called by buildYouTubeEmbedHtml in youtubeNavigation.ts
const YOUTUBE_ID_RE = /^[a-zA-Z0-9_-]+$/;

export function sanitizeYoutubeId(youtubeId: string): string {
  return YOUTUBE_ID_RE.test(youtubeId) ? youtubeId : '';
}
