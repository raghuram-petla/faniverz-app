import { useState, useCallback, useEffect } from 'react';
import { CustomYouTubePlayer } from '@/components/youtube/CustomYouTubePlayer';

export interface FeedVideoPlayerProps {
  youtubeId: string;
  thumbnailUrl: string | null;
  isActive: boolean;
  shouldMount?: boolean;
}

/**
 * @contract Thin wrapper over CustomYouTubePlayer for feed context.
 * Feed videos mount their WebView shell when the card is visible, then only
 * begin playback after a direct in-WebView tap.
 * @edge manualPlay is sticky for the current video card, but resets when
 * FlashList recycles the cell for a different youtubeId.
 */
export function FeedVideoPlayer({
  youtubeId,
  thumbnailUrl,
  isActive,
  shouldMount = false,
}: FeedVideoPlayerProps) {
  /** @sideeffect flips to true on manual tap; remains scoped to the current youtubeId. */
  const [manualPlay, setManualPlay] = useState(false);
  const handlePlay = useCallback(() => setManualPlay(true), []);

  useEffect(() => {
    // @edge FlashList can recycle list cells across different videos, so manualPlay must be scoped to the current youtubeId.
    setManualPlay(false);
  }, [youtubeId]);

  const shouldMountPlayer = shouldMount || isActive || manualPlay;
  // @contract feed no longer auto-plays on scroll; visible cards mount an interactive shell so the first tap is the real YouTube tap.
  const shouldAutoPlay = manualPlay;

  return (
    <CustomYouTubePlayer
      youtubeId={youtubeId}
      thumbnailUrl={thumbnailUrl}
      isActive={manualPlay}
      autoPlay={shouldAutoPlay}
      autoMute={false}
      mountShellWhenIdle={shouldMountPlayer}
      onPlay={handlePlay}
      borderRadius={0}
    />
  );
}
