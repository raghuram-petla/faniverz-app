'use client';
import { useState, useMemo, useCallback } from 'react';
import { Plus, X, Calendar, Play } from 'lucide-react';
import { VIDEO_TYPES } from '@shared/constants';
import type { VideoType, MovieVideo } from '@/lib/types';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';
import { FormInput, FormSelect } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';

// @contract shows thumbnail until clicked, then swaps to iframe with autoplay — avoids YouTube's red play button
function YouTubeThumbnail({ youtubeId, title }: { youtubeId: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const handlePlay = useCallback(() => setPlaying(true), []);

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
        className="w-full h-full"
        allow="autoplay; encrypted-media"
        allowFullScreen
        title={title}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={handlePlay}
      className="relative w-full h-full group cursor-pointer bg-black"
      aria-label={`Play ${title}`}
    >
      <img
        src={getYouTubeThumbnail(youtubeId, 'hqdefault')}
        alt={title}
        className="w-full h-full object-cover"
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-14 h-14 rounded-full bg-black/60 flex items-center justify-center group-hover:bg-black/80 transition-colors">
          <Play className="w-7 h-7 text-white fill-white ml-1" />
        </div>
      </div>
    </button>
  );
}

const EMPTY_VIDEO_FORM = {
  youtube_input: '',
  title: '',
  video_type: 'trailer' as VideoType,
  description: '',
  video_date: '',
};

type PendingVideo = {
  // @contract: stable ID for removal — prevents index-shift bugs
  _id: string;
  youtube_id: string;
  title: string;
  video_type: VideoType;
  description: string | null;
  video_date: string | null;
  display_order: number;
};

interface Props {
  visibleVideos: (
    | MovieVideo
    | (PendingVideo & { id: string; movie_id: string; created_at: string })
  )[];
  onAdd: (video: PendingVideo) => void;
  onRemove: (id: string, isPending: boolean) => void;
  showAddForm: boolean;
  onCloseAddForm: () => void;
  // @sync: Set of _id values for pending (unsaved) videos
  pendingIds: Set<string>;
}

export function VideosSection({
  visibleVideos,
  onAdd,
  onRemove,
  showAddForm,
  onCloseAddForm,
  pendingIds,
}: Props) {
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO_FORM);

  // @contract reverse so newest videos appear first
  const displayVideos = useMemo(() => [...visibleVideos].reverse(), [visibleVideos]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const youtubeId = extractYouTubeId(videoForm.youtube_input);
    if (!youtubeId) {
      alert('Invalid YouTube URL or ID. Please enter a valid YouTube video link.');
      return;
    }
    onAdd({
      _id: crypto.randomUUID(),
      youtube_id: youtubeId,
      title: videoForm.title,
      video_type: videoForm.video_type,
      description: videoForm.description || null,
      video_date: videoForm.video_date || null,
      display_order: visibleVideos.length,
    });
    setVideoForm(EMPTY_VIDEO_FORM);
    onCloseAddForm();
  }

  return (
    <div className="space-y-4">
      {showAddForm && (
        <form onSubmit={handleSubmit} className="bg-surface-elevated rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="YouTube URL or ID"
              required
              variant="compact"
              type="text"
              placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
              value={videoForm.youtube_input}
              onValueChange={(v) => setVideoForm((p) => ({ ...p, youtube_input: v }))}
            />
            <FormSelect
              label="Type"
              required
              variant="compact"
              value={videoForm.video_type}
              options={VIDEO_TYPES.map((t) => ({ value: t.value, label: t.label }))}
              onValueChange={(v) => setVideoForm((p) => ({ ...p, video_type: v as VideoType }))}
            />
          </div>
          <FormInput
            label="Title"
            required
            variant="compact"
            type="text"
            placeholder="e.g. Official Trailer"
            value={videoForm.title}
            onValueChange={(v) => setVideoForm((p) => ({ ...p, title: v }))}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="Date"
              variant="compact"
              type="date"
              value={videoForm.video_date}
              onValueChange={(v) => setVideoForm((p) => ({ ...p, video_date: v }))}
            />
          </div>
          {extractYouTubeId(videoForm.youtube_input) && (
            <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
              <YouTubeThumbnail
                youtubeId={extractYouTubeId(videoForm.youtube_input)!}
                title="YouTube preview"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!videoForm.youtube_input || !videoForm.title}
              icon={<Plus className="w-4 h-4" />}
            >
              Add Video
            </Button>
            <button
              type="button"
              onClick={() => {
                onCloseAddForm();
                setVideoForm(EMPTY_VIDEO_FORM);
              }}
              className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ─── Video list — below add form ─── */}
      {displayVideos.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {displayVideos.map((video) => (
            <div key={video.id} className="bg-surface-elevated rounded-xl overflow-hidden">
              {/* Title + type + date — above the iframe */}
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-on-surface font-medium text-sm truncate">{video.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-purple-600/20 text-status-purple px-2 py-0.5 rounded font-medium">
                      {VIDEO_TYPES.find((t) => t.value === video.video_type)?.label ??
                        video.video_type}
                    </span>
                    {video.video_date && (
                      <span className="text-xs text-on-surface-subtle flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {video.video_date}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="icon"
                  size="sm"
                  onClick={() => onRemove(video.id, pendingIds.has(video.id))}
                  aria-label={`Remove ${video.title}`}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="overflow-hidden" style={{ aspectRatio: '16/9' }}>
                <YouTubeThumbnail youtubeId={video.youtube_id} title={video.title} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
