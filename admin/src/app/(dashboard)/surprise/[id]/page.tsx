'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useAdminSurpriseItem,
  useUpdateSurprise,
  useDeleteSurprise,
} from '@/hooks/useAdminSurprise';
import { Sparkles, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';

const categories = ['song', 'short-film', 'bts', 'interview', 'trailer'] as const;

export default function EditSurpriseContentPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: item, isLoading } = useAdminSurpriseItem(id);
  const updateItem = useUpdateSurprise();
  const deleteItem = useDeleteSurprise();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [category, setCategory] = useState<string>('');
  const [duration, setDuration] = useState('');
  const [views, setViews] = useState(0);

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setDescription(item.description ?? '');
      setYoutubeId(item.youtube_id);
      setCategory(item.category);
      setDuration(item.duration ?? '');
      setViews(item.views);
    }
  }, [item]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateItem.mutate(
      {
        id,
        title,
        description: description || null,
        youtube_id: youtubeId,
        category: category as (typeof categories)[number],
        duration: duration || null,
        views,
      },
      { onSuccess: () => router.push('/surprise') },
    );
  };

  const handleDelete = () => {
    if (!confirm('Delete this surprise content? This cannot be undone.')) return;
    deleteItem.mutate(id, { onSuccess: () => router.push('/surprise') });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
      </div>
    );
  }

  if (!item) {
    return <div className="text-center py-20 text-white/40">Content not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/surprise" className="p-2 text-white/40 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-yellow-500" />
            </div>
            <h1 className="text-2xl font-bold text-white">Edit Content</h1>
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleteItem.isPending}
          className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>

      {/* YouTube Preview */}
      {youtubeId && (
        <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title="YouTube preview"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-zinc-900 border border-white/10 rounded-xl p-6 space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-white/60">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter title"
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-white/60">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description"
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="youtube_id" className="block text-sm font-medium text-white/60">
            YouTube ID
          </label>
          <input
            id="youtube_id"
            type="text"
            value={youtubeId}
            onChange={(e) => setYoutubeId(e.target.value)}
            required
            placeholder="e.g. dQw4w9WgXcQ"
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-white/60">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
          >
            <option value="">Select category...</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="duration" className="block text-sm font-medium text-white/60">
              Duration
            </label>
            <input
              id="duration"
              type="text"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="e.g. 3:45"
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="views" className="block text-sm font-medium text-white/60">
              Views
            </label>
            <input
              id="views"
              type="number"
              value={views}
              onChange={(e) => setViews(Number(e.target.value))}
              min={0}
              className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
          </div>
        </div>

        {updateItem.isError && (
          <p className="text-red-400 text-sm">
            {updateItem.error instanceof Error
              ? updateItem.error.message
              : 'Failed to update content'}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={updateItem.isPending}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {updateItem.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Update Content
          </button>
          <Link
            href="/surprise"
            className="px-6 py-2.5 text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
