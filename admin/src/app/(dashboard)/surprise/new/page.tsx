'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useCreateSurprise } from '@/hooks/useAdminSurprise';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

// @contract: categories must match the surprise_content.category CHECK constraint in the database
const categories = ['song', 'short-film', 'bts', 'interview', 'trailer'] as const;

export default function NewSurpriseContentPage() {
  const router = useRouter();
  const createItem = useCreateSurprise();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [youtubeId, setYoutubeId] = useState('');
  const [category, setCategory] = useState<string>('');
  const [views, setViews] = useState(0);

  const isDirty = useMemo(
    () => !!(title || description || youtubeId || category),
    [title, description, youtubeId, category],
  );

  useUnsavedChangesWarning(isDirty);

  // @sideeffect: inserts into surprise_content table, navigates to /surprise on success
  // @edge: empty description coerced to null; views defaults to 0
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createItem.mutate(
      {
        title,
        description: description || null,
        youtube_id: youtubeId,
        category: category as (typeof categories)[number],
        views,
      },
      /* v8 ignore start -- phantom else on mutation callbacks */
      {
        onSuccess: () => router.push('/surprise'),
        onError: (err: Error) => alert(err.message || 'Failed to create surprise item'),
      },
      /* v8 ignore stop */
    );
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link
          href="/surprise"
          className="p-2 text-on-surface-subtle hover:text-on-surface transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-status-yellow" />
          </div>
          <h1 className="text-2xl font-bold text-on-surface">Add Surprise Content</h1>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-surface-card border border-outline rounded-xl p-6 space-y-6"
      >
        <div className="space-y-2">
          <label htmlFor="title" className="block text-sm font-medium text-on-surface-muted">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="Enter title"
            className="w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface placeholder:text-on-surface-disabled focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="block text-sm font-medium text-on-surface-muted">
            Description
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional description"
            className="w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface placeholder:text-on-surface-disabled focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent resize-none"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="youtube_id" className="block text-sm font-medium text-on-surface-muted">
            YouTube ID
          </label>
          <input
            id="youtube_id"
            type="text"
            value={youtubeId}
            onChange={(e) => setYoutubeId(e.target.value)}
            required
            placeholder="e.g. dQw4w9WgXcQ"
            className="w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface placeholder:text-on-surface-disabled focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-medium text-on-surface-muted">
            Category
          </label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
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
            <label htmlFor="views" className="block text-sm font-medium text-on-surface-muted">
              Views
            </label>
            <input
              id="views"
              type="text"
              inputMode="numeric"
              value={views}
              onChange={(e) => setViews(Math.max(0, Math.floor(Number(e.target.value)) || 0))}
              className="w-full bg-input border border-outline rounded-lg px-4 py-2.5 text-on-surface focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
            />
          </div>
        </div>

        {createItem.isError && (
          <p className="text-status-red text-sm">
            {createItem.error instanceof Error
              ? createItem.error.message
              : 'Failed to create content'}
          </p>
        )}

        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={createItem.isPending}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createItem.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Create Content
          </button>
          <Link
            href="/surprise"
            className="px-6 py-2.5 text-on-surface-muted hover:text-on-surface transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}
