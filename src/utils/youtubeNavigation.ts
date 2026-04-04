import { Share } from 'react-native';

/**
 * Triggers the native iOS share sheet with a YouTube video URL.
 */
// @edge Share.share() returns a promise that can reject if the user cancels the share sheet — ignored here (fire-and-forget)
// @assumes youtubeId is a valid YouTube video ID — no sanitization applied (unlike feedHelpers.getYouTubeThumbnail)
export function shareYouTubeVideo(youtubeId: string): void {
  Share.share({ message: `https://www.youtube.com/watch?v=${youtubeId}` });
}
