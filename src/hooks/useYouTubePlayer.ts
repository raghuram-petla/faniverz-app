import { useRef, useState, useCallback } from 'react';
import type { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

export type PlayerState =
  | 'unstarted'
  | 'playing'
  | 'paused'
  | 'buffering'
  | 'ended'
  | 'cued'
  | 'unknown';

export interface YoutubePlayerState {
  playerState: PlayerState;
  isReady: boolean;
  currentTime: number;
  duration: number;
}

export interface YoutubePlayerActions {
  togglePlayPause: () => void;
  seek: (time: number) => void;
}

export interface UseYouTubePlayerResult {
  state: YoutubePlayerState;
  actions: YoutubePlayerActions;
  webViewRef: React.RefObject<WebView | null>;
  handleMessage: (event: WebViewMessageEvent) => void;
}

// @boundary: bridges WebView-based YouTube IFrame API and React Native via postMessage / injectJavaScript
// @coupling: message schema must match buildYouTubePlayerHtml postToRN calls
export function useYouTubePlayer(): UseYouTubePlayerResult {
  const webViewRef = useRef<WebView>(null);
  const [state, setState] = useState<YoutubePlayerState>({
    playerState: 'unstarted',
    isReady: false,
    currentTime: 0,
    duration: 0,
  });

  // @sideeffect: parses JSON messages from the WebView YouTube player
  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data) as Record<string, unknown>;
      if (msg.type === 'ready') {
        setState((s) => ({ ...s, isReady: true, duration: (msg.duration as number) ?? 0 }));
      } else if (msg.type === 'stateChange') {
        setState((s) => ({ ...s, playerState: (msg.playerState as PlayerState) ?? 'unknown' }));
      } else if (msg.type === 'timeUpdate') {
        setState((s) => ({
          ...s,
          currentTime: (msg.currentTime as number) ?? s.currentTime,
          duration: (msg.duration as number) ?? s.duration,
        }));
      }
    } catch {
      // ignore malformed messages
    }
  }, []);

  // @sideeffect: injects JS command into the WebView player
  const sendCommand = useCallback((cmd: string, value?: number) => {
    const js =
      value !== undefined
        ? `window.receiveCommand('${cmd}', ${value}); true;`
        : `window.receiveCommand('${cmd}'); true;`;
    webViewRef.current?.injectJavaScript(js);
  }, []);

  const togglePlayPause = useCallback(() => {
    // @assumes: state is read from closure — may be stale under rapid taps, acceptable for media controls
    setState((s) => {
      sendCommand(s.playerState === 'playing' ? 'pause' : 'play');
      return s;
    });
  }, [sendCommand]);

  const seek = useCallback(
    (time: number) => {
      sendCommand('seek', time);
    },
    [sendCommand],
  );

  return {
    state,
    actions: { togglePlayPause, seek },
    webViewRef,
    handleMessage,
  };
}
