import { sanitizeYoutubeId } from '@/utils/sanitizeYoutubeId';

/**
 * Builds a full HTML page that embeds a YouTube video using the IFrame Player API.
 * The player posts JSON messages back to React Native for state tracking.
 *
 * @contract message schema: { type: 'ready' | 'stateChange' | 'timeUpdate', ... }
 * @contract commands are received via window.receiveCommand(cmd, value)
 */
// @invariant safeId is validated before interpolation to prevent XSS
export function buildYouTubePlayerHtml(youtubeId: string): string {
  const safeId = sanitizeYoutubeId(youtubeId);
  if (!safeId) return '<html><body style="background:#000"></body></html>';

  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #000; overflow: hidden; }
    #player { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
  </style>
</head>
<body>
<div id="player"></div>
<script>
  var player;
  var timeInterval;

  function onYouTubeIframeAPIReady() {
    player = new YT.Player('player', {
      videoId: '${safeId}',
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, controls: 0 },
      events: {
        onReady: function() {
          postToRN({ type: 'ready', duration: player.getDuration() });
          timeInterval = setInterval(function() {
            if (player && player.getCurrentTime) {
              postToRN({
                type: 'timeUpdate',
                currentTime: player.getCurrentTime(),
                duration: player.getDuration(),
              });
            }
          }, 500);
        },
        onStateChange: function(e) {
          var stateMap = { '-1': 'unstarted', 0: 'ended', 1: 'playing', 2: 'paused', 3: 'buffering', 5: 'cued' };
          postToRN({ type: 'stateChange', playerState: stateMap[e.data] || 'unknown' });
          if (e.data === 0) { clearInterval(timeInterval); }
        },
      },
    });
  }

  function postToRN(msg) {
    if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(msg));
  }

  // @contract: called by useYouTubePlayer to send commands into the player
  window.receiveCommand = function(cmd, value) {
    if (!player) return;
    if (cmd === 'play') player.playVideo();
    else if (cmd === 'pause') player.pauseVideo();
    else if (cmd === 'seek') player.seekTo(value, true);
  };
</script>
<script src="https://www.youtube.com/iframe_api"></script>
</body>
</html>`;
}
