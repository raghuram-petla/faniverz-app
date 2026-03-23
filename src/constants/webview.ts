// WebView base URL used for YouTube embed iframes
// @coupling used by youtubeNavigation.ts handleYouTubeNavigation() for origin matching
// @invariant must be 'about:blank' — React Native WebView uses this as the origin for inline HTML
export const WEBVIEW_BASE_URL = 'about:blank';
