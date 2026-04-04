'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useCreateFeedItem } from '@/hooks/useAdminFeed';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import type { FeedType } from '@/lib/types';
import { getYouTubeThumbnail } from '@/lib/youtube';
import { VIDEO_TYPES, FEED_CONTENT_TYPE_LABELS } from '@shared/constants';

// @contract: FEED_TYPES must match feed_items.feed_type CHECK constraint in the database
// @assumes: only 'update', 'video', and 'poster' are creatable via admin; backdrop/surprise omitted
const FEED_TYPES: { label: string; value: FeedType }[] = [
  { label: 'Update (text announcement)', value: 'update' },
  { label: 'Video', value: 'video' },
  { label: 'Poster', value: 'poster' },
];

// @contract: content_type values must match feed_items.content_type CHECK constraint in the database
// @coupling: video content types sourced from VIDEO_TYPES (shared) filtered to exclude 'other';
//   labels resolved via FEED_CONTENT_TYPE_LABELS so 'bts' renders as 'BTS' (not 'Behind the Scenes')
// @assumes: CONTENT_TYPES covers backdrop/surprise for completeness even though FEED_TYPES dropdown omits them
const VIDEO_CONTENT_TYPES = VIDEO_TYPES.filter((v) => v.value !== 'other').map((v) => ({
  value: v.value,
  label: FEED_CONTENT_TYPE_LABELS[v.value] ?? v.label,
}));

const CONTENT_TYPES: Record<FeedType, { label: string; value: string }[]> = {
  update: [{ label: 'Update', value: 'update' }],
  video: VIDEO_CONTENT_TYPES,
  poster: [{ label: 'Poster', value: 'poster' }],
  backdrop: [{ label: 'Backdrop', value: 'backdrop' }],
  surprise: [
    { label: FEED_CONTENT_TYPE_LABELS['song'] ?? 'Song', value: 'song' },
    { label: FEED_CONTENT_TYPE_LABELS['short-film'] ?? 'Short Film', value: 'short-film' },
    { label: FEED_CONTENT_TYPE_LABELS['bts'] ?? 'BTS', value: 'bts' },
    { label: FEED_CONTENT_TYPE_LABELS['interview'] ?? 'Interview', value: 'interview' },
    { label: FEED_CONTENT_TYPE_LABELS['trailer'] ?? 'Trailer', value: 'trailer' },
  ],
};

export default function NewFeedItemPage() {
  const router = useRouter();
  const createMutation = useCreateFeedItem();
  const [feedType, setFeedType] = useState<FeedType>('update');
  const [contentType, setContentType] = useState('update');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);

  const isDirty = useMemo(
    () => !!(title || description || youtubeId || thumbnailUrl || isPinned || isFeatured),
    [title, description, youtubeId, thumbnailUrl, isPinned, isFeatured],
  );

  useUnsavedChangesWarning(isDirty);

  // @sync: switching feed type resets content type to the first option for the new type
  const handleFeedTypeChange = (type: FeedType) => {
    setFeedType(type);
    /* v8 ignore start */
    setContentType(CONTENT_TYPES[type]?.[0]?.value ?? type);
    /* v8 ignore stop */
  };

  // @sideeffect: inserts into feed_items table, navigates to /feed on success
  // @edge: when youtubeId is set but thumbnailUrl is blank, auto-generates thumbnail from YouTube hqdefault endpoint
  // @nullable: description, youtube_id, thumbnail_url all coerced to null when empty
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        feed_type: feedType,
        content_type: contentType,
        title,
        description: description || null,
        youtube_id: youtubeId || null,
        thumbnail_url:
          thumbnailUrl || (youtubeId ? getYouTubeThumbnail(youtubeId, 'hqdefault') : null),
        is_pinned: isPinned,
        is_featured: isFeatured,
      } as Partial<import('@/lib/types').NewsFeedItem>);
      router.push('/feed');
    } catch (error) {
      window.alert((error as Error).message || 'Operation failed');
    }
  };

  /* v8 ignore start */
  const contentTypes = CONTENT_TYPES[feedType] ?? [];
  /* v8 ignore stop */
  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/feed"
          className="p-2 rounded-lg hover:bg-surface-elevated text-on-surface-muted"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold text-on-surface">Add Feed Item</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Feed Type */}
        <div>
          <label className="block text-sm font-medium text-on-surface mb-2">Feed Type</label>
          <select
            value={feedType}
            onChange={(e) => handleFeedTypeChange(e.target.value as FeedType)}
            className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            {FEED_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Content Type */}
        {contentTypes.length > 1 ? (
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Content Type</label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
            >
              {contentTypes.map((ct) => (
                <option key={ct.value} value={ct.value}>
                  {ct.label}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-on-surface mb-2">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
            placeholder="Enter title"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-on-surface mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600 resize-none"
            placeholder="Optional description"
          />
        </div>

        {/* YouTube ID (for video types) */}
        {feedType === 'video' ? (
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">YouTube ID</label>
            <input
              type="text"
              value={youtubeId}
              onChange={(e) => setYoutubeId(e.target.value)}
              className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
              placeholder="e.g. dQw4w9WgXcQ"
            />
          </div>
        ) : null}

        {/* Thumbnail URL (for poster/update types) */}
        {feedType !== 'video' ? (
          <div>
            <label className="block text-sm font-medium text-on-surface mb-2">Thumbnail URL</label>
            <input
              type="text"
              value={thumbnailUrl}
              onChange={(e) => setThumbnailUrl(e.target.value)}
              className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
              placeholder="Image URL"
            />
          </div>
        ) : null}

        {/* Toggles */}
        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPinned}
              onChange={(e) => setIsPinned(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-on-surface">Pin to top</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-on-surface">Featured</span>
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={createMutation.isPending || !title}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Create
          </button>
          <Link
            href="/feed"
            className="px-6 py-3 rounded-lg border border-outline text-on-surface-muted hover:bg-surface-elevated"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
