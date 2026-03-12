import { Linking, Share } from 'react-native';
import type { ShouldStartLoadRequest } from 'react-native-webview/lib/WebViewTypes';
import { WEBVIEW_BASE_URL } from '@/constants/webview';

/**
 * Builds the HTML wrapper for embedding a YouTube video.
 */
export function buildYouTubeEmbedHtml(youtubeId: string, autoMute = false): string {
  const muteParam = autoMute ? '&mute=1' : '';
  return `<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1">
<style>*{margin:0;padding:0}body{background:#000;overflow:hidden}
iframe{position:absolute;top:0;left:0;width:100%;height:100%;border:none}</style>
</head><body>
<iframe src="https://www.youtube.com/embed/${youtubeId}?autoplay=1&playsinline=1${muteParam}&rel=0"
  allowfullscreen webkitallowfullscreen mozallowfullscreen></iframe>
</body></html>`;
}

/**
 * Triggers the native iOS share sheet with a YouTube video URL.
 */
export function shareYouTubeVideo(youtubeId: string): void {
  Share.share({ message: `https://www.youtube.com/watch?v=${youtubeId}` });
}

/**
 * Handles new window requests from YouTube embed iframes.
 * YouTube's player uses window.open() for logo clicks and channel links.
 */
export function handleYouTubeOpenWindow(targetUrl: string, youtubeId: string): void {
  if (targetUrl.includes('youtube.com/share') || targetUrl.includes('intent://')) {
    shareYouTubeVideo(youtubeId);
  } else {
    Linking.openURL(targetUrl);
  }
}

/**
 * Intercepts regular navigation requests in YouTube embed WebViews.
 * Allows embed/initial loads, blocks and handles everything else.
 */
export function handleYouTubeNavigation(
  request: ShouldStartLoadRequest,
  youtubeId: string,
): boolean {
  const { url } = request;

  if (url === 'about:blank' || url === `${WEBVIEW_BASE_URL}/` || url.includes('/embed/')) {
    return true;
  }

  handleYouTubeOpenWindow(url, youtubeId);
  return false;
}
