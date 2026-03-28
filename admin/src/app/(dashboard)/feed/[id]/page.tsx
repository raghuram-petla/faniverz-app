'use client';
import { useParams } from 'next/navigation';
import { ArrowLeft, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { FormChangesDock } from '@/components/common/FormChangesDock';
import { useAdminFeedItem, useUpdateFeedItem, useDeleteFeedItem } from '@/hooks/useAdminFeed';
import { usePermissions } from '@/hooks/usePermissions';
import { useEditPageState } from '@/hooks/useEditPageState';
import type { FieldConfig } from '@/hooks/useFormChanges';
import type { NewsFeedItem } from '@/lib/types';

interface FeedForm {
  title: string;
  description: string;
  isPinned: boolean;
  isFeatured: boolean;
}

const FIELD_CONFIG: FieldConfig[] = [
  { key: 'title', label: 'Title', type: 'text' },
  { key: 'description', label: 'Description', type: 'text' },
  { key: 'isPinned', label: 'Pinned', type: 'boolean' },
  { key: 'isFeatured', label: 'Featured', type: 'boolean' },
];

const INITIAL_FORM: FeedForm = {
  title: '',
  description: '',
  isPinned: false,
  isFeatured: false,
};

/** @boundary Converts raw API data to form shape; unsafe cast from unknown */
// @assumes data is a valid NewsFeedItem — no runtime validation
function dataToForm(data: unknown): FeedForm {
  const item = data as NewsFeedItem;
  return {
    title: item.title,
    /* v8 ignore start */
    description: item.description ?? '',
    /* v8 ignore stop */

    isPinned: item.is_pinned,
    isFeatured: item.is_featured,
  };
}

/** @boundary Converts form state to API payload shape */
// @edge empty title string is allowed through — no validation before save
function formToPayload(form: FeedForm, id: string) {
  return {
    id,
    title: form.title,
    description: form.description || null,
    is_pinned: form.isPinned,
    is_featured: form.isFeatured,
  };
}

/** @coupling useEditPageState, useAdminFeedItem, useUpdateFeedItem, useDeleteFeedItem */
// @sideeffect delete navigates to /feed via useEditPageState
export default function EditFeedItemPage() {
  const { isReadOnly, canDeleteTopLevel } = usePermissions();
  const params = useParams();
  // @nullable: UNGUARDED — params.id cast to string without null check
  const id = params.id as string;
  const dataResult = useAdminFeedItem(id);
  const item = dataResult.data;
  const updateMutation = useUpdateFeedItem();
  const deleteMutation = useDeleteFeedItem();

  const {
    form,
    setForm,
    saveStatus,
    changes,
    changeCount,
    isLoading,
    handleSave,
    handleDiscard,
    handleRevertField,
    handleDelete,
  } = useEditPageState<FeedForm>(
    {
      id,
      fieldConfig: FIELD_CONFIG,
      initialForm: INITIAL_FORM,
      dataToForm,
      formToPayload,
      deleteRoute: '/feed',
      deleteMessage: 'Delete this feed item?',
    },
    { dataResult, updateMutation, deleteMutation },
  );

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
        {canDeleteTopLevel() && (
          <button
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="flex items-center gap-2 text-status-red hover:text-status-red-hover disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>

      {item.source_table ? (
        <div className="bg-surface-elevated rounded-lg px-4 py-3 text-sm text-on-surface-muted">
          Auto-generated from <span className="font-mono text-on-surface">{item.source_table}</span>{' '}
          — Changes to the source will sync automatically.
        </div>
      ) : null}

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

      <div className="flex gap-2 flex-wrap">
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-input text-on-surface-muted">
          Type: {item.feed_type}
        </span>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-input text-on-surface-muted">
          Content: {item.content_type}
        </span>
        {item.movie?.title ? (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-blue-600/20 text-status-blue">
            Movie: {item.movie.title}
          </span>
        ) : null}
      </div>

      <div className={`space-y-5${isReadOnly ? ' pointer-events-none opacity-70' : ''}`}>
        <div>
          <label className="block text-sm font-medium text-on-surface mb-2">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
            required
            className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-on-surface mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
            rows={3}
            className="w-full bg-input rounded-lg px-4 py-3 text-on-surface outline-none focus:ring-2 focus:ring-red-600 resize-none"
          />
        </div>

        <div className="flex gap-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isPinned as boolean}
              onChange={(e) => setForm((p) => ({ ...p, isPinned: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-on-surface">Pin to top</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={form.isFeatured as boolean}
              onChange={(e) => setForm((p) => ({ ...p, isFeatured: e.target.checked }))}
              className="rounded"
            />
            <span className="text-sm text-on-surface">Featured</span>
          </label>
        </div>
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
