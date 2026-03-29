import Constants from 'expo-constants';

const getWebViewAppId = () =>
  (
    Constants.expoConfig?.ios?.bundleIdentifier ??
    Constants.expoConfig?.android?.package ??
    'com.faniverz.app'
  ).toLowerCase();

// WebView base URL used for YouTube embed iframes.
// @coupling YouTube error 153 requires WebView embeds to provide an app identity via Referer/baseUrl instead of about:blank.
// @invariant must stay a valid https URL because React Native WebView forwards baseUrl as the local HTML referrer.
export const WEBVIEW_BASE_URL = `https://${getWebViewAppId()}`;
