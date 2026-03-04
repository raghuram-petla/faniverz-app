'use client';
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { VIDEO_TYPES } from '@shared/constants';
import type { VideoType, MovieVideo } from '@/lib/types';
import { extractYouTubeId, getYouTubeThumbnail } from '@/lib/youtube';

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
  description: string | null;
  video_date: string | null;
  duration: string | null;
  display_order: number;
};

interface Props {
  visibleVideos: (
    | MovieVideo
    | (PendingVideo & { id: string; movie_id: string; created_at: string })
  )[];
  trailerUrl: string;
  movieTitle: string;
  onAdd: (video: PendingVideo) => void;
  onRemove: (id: string, isPending: boolean) => void;
}

export function VideosSection({ visibleVideos, trailerUrl, movieTitle, onAdd, onRemove }: Props) {
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO_FORM);

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
      {/* Backward compat: import trailer_url as a video */}
      {trailerUrl && visibleVideos.length === 0 && (
        <div className="bg-blue-600/10 border border-blue-600/20 rounded-xl p-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-blue-400 font-medium">
              This movie has a trailer URL but no videos.
            </p>
            <p className="text-xs text-white/40 mt-1">Import it as the first video entry?</p>
          </div>
          <button
            type="button"
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
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 shrink-0"
          >
            <Plus className="w-4 h-4" /> Import
          </button>
        </div>
      )}

      {visibleVideos.length > 0 && (
        <div className="space-y-2">
          {visibleVideos.map((video) => (
            <div key={video.id} className="flex items-center gap-3 bg-white/5 rounded-xl px-4 py-3">
              <img
                src={getYouTubeThumbnail(video.youtube_id)}
                alt={video.title}
                className="w-24 h-[54px] rounded-lg object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{video.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded">
                    {VIDEO_TYPES.find((t) => t.value === video.video_type)?.label ??
                      video.video_type}
                  </span>
                  {video.duration && (
                    <span className="text-xs text-white/40">{video.duration}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onRemove(video.id, video.id.startsWith('pending-video-'))}
                className="p-1 rounded hover:bg-white/10 text-white/40 hover:text-red-400"
                aria-label={`Remove ${video.title}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white/5 rounded-xl p-4 space-y-3">
        <p className="text-sm font-semibold text-white/60">Add Video</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">YouTube URL or ID *</label>
            <input
              type="text"
              required
              placeholder="https://youtube.com/watch?v=... or dQw4w9WgXcQ"
              value={videoForm.youtube_input}
              onChange={(e) => setVideoForm((p) => ({ ...p, youtube_input: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Type *</label>
            <select
              value={videoForm.video_type}
              onChange={(e) =>
                setVideoForm((p) => ({ ...p, video_type: e.target.value as VideoType }))
              }
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            >
              {VIDEO_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-white/40 mb-1">Title *</label>
          <input
            type="text"
            required
            placeholder="e.g. Official Trailer"
            value={videoForm.title}
            onChange={(e) => setVideoForm((p) => ({ ...p, title: e.target.value }))}
            className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-white/40 mb-1">Duration</label>
            <input
              type="text"
              placeholder="e.g. 2:34"
              value={videoForm.duration}
              onChange={(e) => setVideoForm((p) => ({ ...p, duration: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
          <div>
            <label className="block text-xs text-white/40 mb-1">Date</label>
            <input
              type="date"
              value={videoForm.video_date}
              onChange={(e) => setVideoForm((p) => ({ ...p, video_date: e.target.value }))}
              className="w-full bg-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:ring-2 focus:ring-red-600"
            />
          </div>
        </div>
        {/* YouTube embed preview */}
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
        <button
          type="submit"
          disabled={!videoForm.youtube_input || !videoForm.title}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Video
        </button>
      </form>
    </div>
  );
}
