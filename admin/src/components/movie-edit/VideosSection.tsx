'use client';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { VIDEO_TYPES } from '@shared/constants';
import type { VideoType, MovieVideo } from '@/lib/types';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';
import { FormInput, FormSelect } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';

const EMPTY_VIDEO_FORM = {
  youtube_input: '',
  title: '',
  video_type: 'trailer' as VideoType,
  description: '',
  video_date: '',
  duration: '',
};

type PendingVideo = {
  youtube_id: string;
  title: string;
  video_type: VideoType;
  // @nullable description, video_date, duration — all optional metadata
  description: string | null;
  video_date: string | null;
  duration: string | null;
  display_order: number;
};

// @contract manages video gallery: YouTube URL/ID input, type classification, and legacy trailer import
interface Props {
  // @assumes visibleVideos is a union of persisted and pending videos with synthetic ids
  visibleVideos: (
    | MovieVideo
    | (PendingVideo & { id: string; movie_id: string; created_at: string })
  )[];
  // @coupling trailerUrl comes from the movie's legacy trailer_url field (basic info)
  trailerUrl: string;
  movieTitle: string;
  onAdd: (video: PendingVideo) => void;
  onRemove: (id: string, isPending: boolean) => void;
}

export function VideosSection({ visibleVideos, trailerUrl, movieTitle, onAdd, onRemove }: Props) {
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO_FORM);

  // @boundary validates YouTube input before adding; accepts both full URLs and bare IDs
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const youtubeId = extractYouTubeId(videoForm.youtube_input);
    if (!youtubeId) {
      alert('Invalid YouTube URL or ID. Please enter a valid YouTube video link.');
      return;
    }
    onAdd({
      youtube_id: youtubeId,
      title: videoForm.title,
      video_type: videoForm.video_type,
      description: videoForm.description || null,
      video_date: videoForm.video_date || null,
      duration: videoForm.duration || null,
      display_order: visibleVideos.length,
    });
    setVideoForm(EMPTY_VIDEO_FORM);
  }

  return (
    <div className="space-y-4">
      {/* @edge backward compat: legacy trailer_url exists but no video entries — offer one-click import */}
      {trailerUrl && visibleVideos.length === 0 && (
        <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-400 font-medium">
              This movie has a trailer URL but no videos.
            </p>
            <p className="text-xs text-on-surface-subtle mt-1">
              Import it as the first video entry?
            </p>
          </div>
          <Button
            type="button"
            variant="blue"
            size="md"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => {
              const youtubeId = extractYouTubeId(trailerUrl);
              if (!youtubeId) {
                alert('Could not extract a YouTube ID from the trailer URL.');
                return;
              }
              onAdd({
                youtube_id: youtubeId,
                title: `${movieTitle} - Official Trailer`,
                video_type: 'trailer',
                description: null,
                video_date: null,
                duration: null,
                display_order: 0,
              });
            }}
          >
            Import
          </Button>
        </div>
      )}

      {visibleVideos.length > 0 && (
        <div className="space-y-2">
          {visibleVideos.map((video) => (
            <div
              key={video.id}
              className="flex items-center gap-3 bg-surface-elevated rounded-xl px-4 py-3"
            >
              <img
                src={getYouTubeThumbnail(video.youtube_id)}
                alt={video.title}
                className="w-24 h-[54px] rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-on-surface font-medium text-sm truncate">{video.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded">
                    {VIDEO_TYPES.find((t) => t.value === video.video_type)?.label ??
                      video.video_type}
                  </span>
                  {video.duration && (
                    <span className="text-xs text-on-surface-subtle">{video.duration}</span>
                  )}
                </div>
              </div>
              <Button
                variant="icon"
                size="sm"
                onClick={() => onRemove(video.id, video.id.startsWith('pending-video-'))}
                aria-label={`Remove ${video.title}`}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-surface-elevated rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-on-surface-muted">Add Video</p>
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
            label="Duration"
            variant="compact"
            type="text"
            placeholder="e.g. 2:34"
            value={videoForm.duration}
            onValueChange={(v) => setVideoForm((p) => ({ ...p, duration: v }))}
          />
          <FormInput
            label="Date"
            variant="compact"
            type="date"
            value={videoForm.video_date}
            onValueChange={(v) => setVideoForm((p) => ({ ...p, video_date: v }))}
          />
        </div>
        {/* @sideeffect live YouTube embed renders on valid ID — network request to youtube.com */}
        {extractYouTubeId(videoForm.youtube_input) && (
          <div className="rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <iframe
              src={`https://www.youtube.com/embed/${extractYouTubeId(videoForm.youtube_input)}`}
              className="w-full h-full"
              allowFullScreen
              title="YouTube preview"
            />
          </div>
        )}
        <Button
          type="submit"
          variant="primary"
          size="md"
          disabled={!videoForm.youtube_input || !videoForm.title}
          icon={<Plus className="w-4 h-4" />}
        >
          Add Video
        </Button>
      </form>
    </div>
  );
}
