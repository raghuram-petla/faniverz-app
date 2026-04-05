import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { WEBVIEW_BASE_URL } from '@/constants/webview';

export interface InlineYouTubeWebViewProps {
  videoId: string;
  thumbnailUrl: string;
  autoPlay?: boolean;
  muted?: boolean;
  pauseToken?: number;
  resetToken?: number;
  onPlayPress?: () => void;
  onStateChange?: (state: string) => void;
}

interface WebShellMessage {
  type: 'shellReady' | 'playPressed' | 'stateChange';
  state?: string;
}

// @contract inline HTML owns the first trusted tap, so iOS starts playback from the WebView itself instead of a React Native overlay.
const buildInlineHtml = (videoId: string, thumbnailUrl: string, baseUrl: string) => `<!doctype html>
<html>
  <head>
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
    />
    <meta name="referrer" content="strict-origin-when-cross-origin" />
    <style>
      html, body, #app { margin: 0; padding: 0; width: 100%; height: 100%; background: #000; overflow: hidden; position: relative; }
      #playButton { position: relative; width: 100%; height: 100%; border: 0; padding: 0; background: #000; }
      #poster { width: 100%; height: 100%; object-fit: cover; display: block; }
      #scrim { display: none; }
      #loadingShell { position: absolute; inset: 0; z-index: 1; display: flex; width: 100%; height: 100%; align-items: center; justify-content: center; background: #000; }
      #loadingSpinner {
        position: absolute; top: 50%; left: 50%; width: 32px; height: 32px; margin: -16px 0 0 -16px; border-radius: 16px; box-sizing: border-box;
        border: 3px solid rgba(255, 255, 255, 0.26); border-top-color: #fff; animation: spin 0.7s linear infinite;
      }
      #playCircle {
        position: absolute; top: 12px; left: 12px; width: 56px; height: 56px;
        border-radius: 28px; background: rgba(0, 0, 0, 0.85);
      }
      #playTriangle {
        position: absolute; top: 50%; left: 50%; margin: -12px 0 0 -7px;
        border-top: 12px solid transparent; border-bottom: 12px solid transparent; border-left: 18px solid #fff;
      }
      #player { position: absolute; inset: 0; width: 100%; height: 100%; background: #000; }
      iframe { width: 100%; height: 100%; background: #000; }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    </style>
  </head>
  <body>
    <div id="app"></div>
    <script>
      (function () {
        var videoId = ${JSON.stringify(videoId)};
        var thumbnailUrl = ${JSON.stringify(thumbnailUrl)};
        var app = document.getElementById('app');
        var player = null;
        var isMuted = false;
        var apiRequested = false;
        var stateNames = { '-1': 'unstarted', '0': 'ended', '1': 'playing', '2': 'paused', '3': 'buffering', '5': 'cued' };

        function post(message) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(JSON.stringify(message));
          }
        }

        function applyMute() {
          if (!player || typeof player.mute !== 'function' || typeof player.unMute !== 'function') {
            return;
          }
          if (isMuted) {
            player.mute();
            return;
          }
          player.unMute();
        }

        function renderPoster() {
          app.innerHTML =
            '<button id="playButton" aria-label="Play video">' +
            '<img id="poster" alt="" />' +
            '<span id="scrim"></span>' +
            '<span id="playCircle"><span id="playTriangle"></span></span>' +
            '</button>';
          document.getElementById('poster').src = thumbnailUrl;
          document.getElementById('playButton').addEventListener('click', function () {
            post({ type: 'playPressed' });
            startPlayer();
          });
        }
        function renderLoading() {
          app.innerHTML =
            '<div id="player"></div>' +
            '<div id="loadingShell" aria-label="Loading video">' +
            '<img id="poster" alt="" />' +
            '<span id="scrim"></span>' +
            '<span id="loadingSpinner"></span>' +
            '</div>';
          document.getElementById('poster').src = thumbnailUrl;
        }
        function removeLoading() { var loadingShell = document.getElementById('loadingShell'); if (loadingShell) loadingShell.remove(); }
        function createPlayer() {
          if (!document.getElementById('player')) {
            renderLoading();
          }
          player = new window.YT.Player('player', {
            videoId: videoId,
            playerVars: {
              autoplay: 1,
              // @coupling YouTube exposes the progress bar/fullscreen button as part of the same control bar, so we keep controls enabled.
              controls: 1,
              fs: 1,
              playsinline: 1,
              rel: 0,
              modestbranding: 1,
              iv_load_policy: 3,
              origin: ${JSON.stringify(baseUrl)},
              widget_referrer: ${JSON.stringify(baseUrl)}
            },
            events: {
              onReady: function (event) {
                applyMute();
                event.target.playVideo();
              },
              onStateChange: function (event) {
                var state = stateNames[String(event.data)] || String(event.data);
                if (state === 'playing') {
                  removeLoading();
                }
                post({ type: 'stateChange', state: state });
              }
            }
          });
        }

        function ensureApi() {
          if (window.YT && window.YT.Player) {
            createPlayer();
            return;
          }
          if (apiRequested) {
            return;
          }
          apiRequested = true;
          var script = document.createElement('script');
          script.src = 'https://www.youtube.com/iframe_api';
          document.body.appendChild(script);
        }

        function startPlayer() {
          if (player && typeof player.playVideo === 'function') {
            player.playVideo();
            return;
          }
          // @edge replace the poster immediately after the trusted tap so iOS never flashes the thumbnail while the iframe bootstraps.
          renderLoading();
          ensureApi();
        }

        function resetPlayer() {
          if (player && typeof player.destroy === 'function') {
            player.destroy();
          }
          player = null;
          renderPoster();
          post({ type: 'stateChange', state: 'idle' });
        }

        window.onYouTubeIframeAPIReady = function () {
          createPlayer();
        };

        // @boundary native injects JSON-encoded commands here instead of relying on fragile cross-window event wiring.
        window.__faniverzReceiveNativeCommand = function (rawCommand) {
          try {
            var command = JSON.parse(rawCommand);
            if (command.type === 'play') {
              startPlayer();
              return;
            }
            if (command.type === 'reset') {
              resetPlayer();
              return;
            }
            if (command.type === 'pause') {
              if (player && typeof player.pauseVideo === 'function') {
                player.pauseVideo();
              }
              return;
            }
            if (command.type === 'mute') {
              isMuted = true;
              applyMute();
              return;
            }
            if (command.type === 'unmute') {
              isMuted = false;
              applyMute();
            }
          } catch {}
        };

        renderPoster();
        post({ type: 'shellReady' });
      })();
    </script>
  </body>
</html>`;

const commandScript = (type: 'play' | 'pause' | 'reset' | 'mute' | 'unmute') =>
  `window.__faniverzReceiveNativeCommand(${JSON.stringify(JSON.stringify({ type }))}); true;`;

export function InlineYouTubeWebView({
  videoId,
  thumbnailUrl,
  autoPlay = false,
  muted = false,
  pauseToken = 0,
  resetToken = 0,
  onPlayPress,
  onStateChange,
}: InlineYouTubeWebViewProps) {
  // @sync commands are injected only after the shell posts shellReady, which avoids racing the HTML bootstrap on slower iOS WebViews.
  const webViewRef = useRef<WebView | null>(null);
  const [isShellReady, setIsShellReady] = useState(false);
  const html = useMemo(
    () => buildInlineHtml(videoId, thumbnailUrl, WEBVIEW_BASE_URL),
    [thumbnailUrl, videoId],
  );
  useEffect(() => setIsShellReady(false), [html]);

  const injectCommand = useCallback(
    (type: 'play' | 'pause' | 'reset' | 'mute' | 'unmute') => {
      if (!isShellReady || typeof webViewRef.current?.injectJavaScript !== 'function') {
        return;
      }
      webViewRef.current.injectJavaScript(commandScript(type));
    },
    [isShellReady],
  );

  useEffect(() => {
    injectCommand(muted ? 'mute' : 'unmute');
  }, [injectCommand, muted]);

  useEffect(() => {
    if (autoPlay) {
      injectCommand('play');
    }
  }, [autoPlay, injectCommand]);

  useEffect(() => {
    if (resetToken > 0) injectCommand('reset');
  }, [injectCommand, resetToken]);
  useEffect(() => {
    if (pauseToken > 0) injectCommand('pause');
  }, [injectCommand, pauseToken]);

  // @edge empty catch swallows malformed messages from WebView (e.g., third-party scripts posting non-JSON strings)
  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const message = JSON.parse(event.nativeEvent.data) as WebShellMessage;
        if (message.type === 'shellReady') return void setIsShellReady(true);
        if (message.type === 'playPressed') return void onPlayPress?.();
        if (message.type === 'stateChange' && message.state) onStateChange?.(message.state);
      } catch {}
    },
    [onPlayPress, onStateChange],
  );

  // @assumes WEBVIEW_BASE_URL must match the origin in the embedded HTML's playerVars — YouTube API rejects mismatched origins silently.
  // @coupling allowsInlineMediaPlayback + mediaPlaybackRequiresUserAction=false are iOS-only props; on Android these are no-ops.
  return (
    <WebView
      ref={webViewRef}
      testID="youtube-inline-webview"
      source={{ html, baseUrl: WEBVIEW_BASE_URL }}
      originWhitelist={['https://*']}
      onMessage={handleMessage}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      scrollEnabled={false}
      bounces={false}
      setSupportMultipleWindows={false}
      allowsFullscreenVideo
      style={{ backgroundColor: 'transparent' }}
    />
  );
}
