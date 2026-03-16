'use client';
import { useState, useMemo } from 'react';
import { Plus, X, Calendar } from 'lucide-react';
import { VIDEO_TYPES } from '@shared/constants';
import type { VideoType, MovieVideo } from '@/lib/types';
import { extractYouTubeId } from '@/lib/youtube';
import { FormInput, FormSelect } from '@/components/common/FormField';
import { Button } from '@/components/common/Button';

const EMPTY_VIDEO_FORM = {
  youtube_input: '',
  title: '',
  video_type: 'trailer' as VideoType,
  description: '',
  video_date: '',
};

type PendingVideo = {
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
  trailerUrl: string;
  movieTitle: string;
  onAdd: (video: PendingVideo) => void;
  onRemove: (id: string, isPending: boolean) => void;
  showAddForm: boolean;
  onCloseAddForm: () => void;
}

export function VideosSection({
  visibleVideos,
  trailerUrl,
  movieTitle,
  onAdd,
  onRemove,
  showAddForm,
  onCloseAddForm,
}: Props) {
  const [videoForm, setVideoForm] = useState(EMPTY_VIDEO_FORM);

  // @contract unify legacy trailer_url with video entries — always include unless already in gallery
  const consolidatedVideos = useMemo(() => {
    if (!trailerUrl) return visibleVideos;
    const youtubeId = extractYouTubeId(trailerUrl);
    if (!youtubeId) return visibleVideos;
    const alreadyInGallery = visibleVideos.some((v) => v.youtube_id === youtubeId);
    if (alreadyInGallery) return visibleVideos;
    const legacyEntry = {
      id: 'legacy-trailer',
      movie_id: '',
      youtube_id: youtubeId,
      title: `${movieTitle || 'Movie'} - Official Trailer`,
      video_type: 'trailer' as VideoType,
      description: null,
      video_date: null,
      display_order: -1,
      created_at: '',
    };
    return [legacyEntry, ...visibleVideos];
  }, [visibleVideos, trailerUrl, movieTitle]);
  // @contract reverse so newest videos appear first
  const displayVideos = useMemo(() => [...consolidatedVideos].reverse(), [consolidatedVideos]);

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
              <iframe
                src={`https://www.youtube.com/embed/${extractYouTubeId(videoForm.youtube_input)}`}
                className="w-full h-full"
                allowFullScreen
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
          {displayVideos.map((video) => {
            const isLegacy = video.id === 'legacy-trailer';
            return (
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
                  {!isLegacy && (
                    <Button
                      variant="icon"
                      size="sm"
                      onClick={() => onRemove(video.id, video.id.startsWith('pending-video-'))}
                      aria-label={`Remove ${video.title}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                <div className="overflow-hidden" style={{ aspectRatio: '16/9' }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${video.youtube_id}`}
                    className="w-full h-full"
                    loading="lazy"
                    allowFullScreen
                    title={video.title}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
