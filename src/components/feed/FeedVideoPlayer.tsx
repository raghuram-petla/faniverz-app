import { CustomYouTubePlayer } from '@/components/youtube/CustomYouTubePlayer';

export interface FeedVideoPlayerProps {
  youtubeId: string;
  thumbnailUrl: string | null;
  isActive: boolean;
}

/**
 * @contract Thin wrapper over CustomYouTubePlayer for feed context.
 * Feed videos auto-play muted when scrolled into view (isActive=true).
 * When isActive=false, only a static thumbnail is rendered (no player loaded).
 */
export function FeedVideoPlayer({ youtubeId, thumbnailUrl, isActive }: FeedVideoPlayerProps) {
  return (
    <CustomYouTubePlayer
      youtubeId={youtubeId}
      thumbnailUrl={thumbnailUrl}
      isActive={isActive}
      autoPlay={isActive}
      autoMute
      borderRadius={0}
    />
  );
}
