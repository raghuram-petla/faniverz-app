'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  useAdminSurpriseItem,
  useUpdateSurprise,
  useDeleteSurprise,
} from '@/hooks/useAdminSurprise';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import { useFormChanges } from '@/hooks/useFormChanges';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { Sparkles, ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import type { FieldConfig } from '@/hooks/useFormChanges';
import { usePermissions } from '@/hooks/usePermissions';

// @contract: categories must match the surprise_content.category CHECK constraint in the database
const categories = ['song', 'short-film', 'bts', 'interview', 'trailer'] as const;
const CATEGORY_OPTIONS: Record<string, string> = Object.fromEntries(
  categories.map((c) => [c, c.charAt(0).toUpperCase() + c.slice(1).replace('-', ' ')]),
);

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'youtubeId', label: 'YouTube ID', type: 'text' },
  { key: 'category', label: 'Category', type: 'select', options: CATEGORY_OPTIONS },
  { key: 'views', label: 'Views', type: 'number' },
];

export default function EditSurpriseContentPage() {
  const { isReadOnly } = usePermissions();
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
  const [views, setViews] = useState(0);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success'>('idle');
  const initialRef = useRef<{
    title: string;
    description: string;
    youtubeId: string;
    category: string;
    views: number;
  } | null>(null);

  useEffect(() => {
    if (item) {
      const loaded = {
        title: item.title,
        description: item.description ?? '',
        youtubeId: item.youtube_id,
        category: item.category,
        views: item.views,
      };
      setTitle(loaded.title);
      setDescription(loaded.description);
      setYoutubeId(loaded.youtubeId);
      setCategory(loaded.category);
      setViews(loaded.views);
      initialRef.current = loaded;
    }
  }, [item]);

  const currentValues = useMemo(
    () => ({ title, description, youtubeId, category, views }),
    [title, description, youtubeId, category, views],
  );
  const { changes, isDirty, changeCount } = useFormChanges(
    FIELD_CONFIG,
    initialRef.current,
    currentValues,
  );

  useUnsavedChangesWarning(isDirty);

  function handleSave() {
    setSaveStatus('saving');
    updateItem.mutate(
      {
        id,
        title,
        description: description || null,
        youtube_id: youtubeId,
        category: category as (typeof categories)[number],
        views,
      },
      {
        onSuccess: () => {
          initialRef.current = { title, description, youtubeId, category, views };
          setSaveStatus('success');
          setTimeout(() => setSaveStatus('idle'), 3000);
        },
        onError: () => setSaveStatus('idle'),
      },
    );
  }

  const handleDiscard = useCallback(() => {
    if (!initialRef.current) return;
    const init = initialRef.current;
    setTitle(init.title);
    setDescription(init.description);
    setYoutubeId(init.youtubeId);
    setCategory(init.category);
    setViews(init.views);
  }, []);

  const handleRevertField = useCallback((key: string) => {
    if (!initialRef.current) return;
    const init = initialRef.current;
    if (key === 'title') setTitle(init.title);
    if (key === 'description') setDescription(init.description);
    if (key === 'youtubeId') setYoutubeId(init.youtubeId);
    if (key === 'category') setCategory(init.category);
    if (key === 'views') setViews(init.views);
  }, []);

  const handleDelete = () => {
    if (!confirm('Delete this surprise content? This cannot be undone.')) return;
    deleteItem.mutate(id, { onSuccess: () => router.push('/surprise') });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
      </div>
    );
  }

  if (!item) {
    return <div className="text-center py-20 text-on-surface-subtle">Content not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
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
            <h1 className="text-2xl font-bold text-on-surface">Edit Content</h1>
          </div>
        </div>
        {!isReadOnly && (
          <button
            onClick={handleDelete}
            disabled={deleteItem.isPending}
            className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 text-status-red px-4 py-2 rounded-lg transition-colors font-medium disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>

      {youtubeId && (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
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

      <div
        className={`bg-surface-card border border-outline rounded-xl p-6 space-y-6${isReadOnly ? ' pointer-events-none opacity-70' : ''}`}
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

        {updateItem.isError && (
          <p className="text-status-red text-sm">
            {updateItem.error instanceof Error
              ? updateItem.error.message
              : 'Failed to update content'}
          </p>
        )}
      </div>

      <FormChangesDock
        changes={changes}
        changeCount={changeCount}
        saveStatus={saveStatus}
        onSave={handleSave}
        onDiscard={handleDiscard}
        onRevertField={handleRevertField}
      />
    </div>
  );
}
