import { Share } from 'react-native';

/**
 * Triggers the native iOS share sheet with a YouTube video URL.
 */
export function shareYouTubeVideo(youtubeId: string): void {
  Share.share({ message: `https://www.youtube.com/watch?v=${youtubeId}` });
}
