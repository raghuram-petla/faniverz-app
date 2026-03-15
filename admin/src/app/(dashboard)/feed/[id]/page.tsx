'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useAdminFeedItem, useUpdateFeedItem, useDeleteFeedItem } from '@/hooks/useAdminFeed';

export default function EditFeedItemPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  // @coupling: useAdminFeedItem joins feed_items with movies for the movie badge display
  const { data: item, isLoading } = useAdminFeedItem(id);
  const updateMutation = useUpdateFeedItem();
  const deleteMutation = useDeleteFeedItem();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const initialRef = useRef<{
    title: string;
    description: string;
    isPinned: boolean;
    isFeatured: boolean;
  } | null>(null);

  useEffect(() => {
    if (item) {
      const loaded = {
        title: item.title,
        description: item.description ?? '',
        isPinned: item.is_pinned,
        isFeatured: item.is_featured,
      };
      setTitle(loaded.title);
      setDescription(loaded.description);
      setIsPinned(loaded.isPinned);
      setIsFeatured(loaded.isFeatured);
      initialRef.current = loaded;
    }
  }, [item]);

  const isDirty = useMemo(() => {
    if (!initialRef.current) return false;
    return (
      title !== initialRef.current.title ||
      description !== initialRef.current.description ||
      isPinned !== initialRef.current.isPinned ||
      isFeatured !== initialRef.current.isFeatured
    );
  }, [title, description, isPinned, isFeatured]);

  useUnsavedChangesWarning(isDirty);

  // @sideeffect: updates feed_items row in Supabase, navigates to /feed on success
  // @edge: empty description coerced to null to avoid storing blank strings in DB
  // @contract: type assertion needed because mutateAsync expects full NewsFeedItem but we only send a partial update
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateMutation.mutateAsync({
        id,
        title,
        description: description || null,
        is_pinned: isPinned,
        is_featured: isFeatured,
      } as Partial<import('@/lib/types').NewsFeedItem> & { id: string });
      router.push('/feed');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Operation failed'}`);
    }
  };

  // @sideeffect: hard-deletes the feed_items row — no soft-delete/undo
  const handleDelete = async () => {
    if (!confirm('Delete this feed item?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      router.push('/feed');
    } catch (err) {
      alert(`Error: ${err instanceof Error ? err.message : 'Operation failed'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
      </div>
    );
  }

  if (!item) {
    return <div className="text-center py-20 text-on-surface-muted">Feed item not found.</div>;
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/feed"
            className="p-2 rounded-lg hover:bg-surface-elevated text-on-surface-muted"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold text-on-surface">Edit Feed Item</h1>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleteMutation.isPending}
          className="flex items-center gap-2 text-red-400 hover:text-red-300 disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* Source info */}
      {/* @invariant: items with source_table are auto-generated — edits here may be overwritten by source sync */}
      {item.source_table ? (
        <div className="bg-surface-elevated rounded-lg px-4 py-3 text-sm text-on-surface-muted">
          Auto-generated from <span className="font-mono text-on-surface">{item.source_table}</span>{' '}
          — Changes to the source will sync automatically.
        </div>
      ) : null}

      {/* Preview */}
      {/* @edge: youtube_id takes priority over thumbnail_url when both exist */}
      {item.youtube_id ? (
        <div className="rounded-xl overflow-hidden aspect-video bg-surface-elevated">
          <iframe
            src={`https://www.youtube.com/embed/${item.youtube_id}`}
            className="w-full h-full"
            allowFullScreen
            title="Video preview"
          />
        </div>
      ) : item.thumbnail_url ? (
        <div className="rounded-xl overflow-hidden bg-surface-elevated">
          <img src={item.thumbnail_url} alt="" className="w-full object-cover max-h-64" />
        </div>
      ) : null}

      {/* Info badges */}
      <div className="flex gap-2 flex-wrap">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-input text-on-surface-muted">
          Type: {item.feed_type}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-input text-on-surface-muted">
          Content: {item.content_type}
        </span>
        {item.movie?.title ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-600/20 text-blue-400">
            Movie: {item.movie.title}
          </span>
        ) : null}
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-on-surface mb-2">Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600 resize-none"
          />
        </div>

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

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={updateMutation.isPending || !title}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white px-6 py-3 rounded-lg font-medium"
          >
            {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Save Changes
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
