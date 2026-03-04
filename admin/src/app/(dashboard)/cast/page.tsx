'use client';
import { useState, useEffect, useRef } from 'react';
import { useAdminActors, useCreateActor, useDeleteActor } from '@/hooks/useAdminCast';
import { Plus, Trash2, Search, Loader2, Users, Pencil, Upload, X } from 'lucide-react';
import Link from 'next/link';

const EMPTY_FORM = {
  name: '',
  photo_url: '',
  birth_date: '',
  person_type: 'actor' as 'actor' | 'technician',
  height_cm: '',
};

export default function CastPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const { data, isLoading, isFetching, hasNextPage, fetchNextPage, isFetchingNextPage } =
    useAdminActors(debouncedSearch);
  const actors = data?.pages.flat() ?? [];
  const createActor = useCreateActor();
  const deleteActor = useDeleteActor();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handlePhotoUpload(file: File) {
    if (file.size > 5 * 1024 * 1024) {
      alert('File too large. Maximum size is 5 MB.');
      return;
    }
    setUploading(true);
    try {
      const body = new FormData();
      body.append('file', file);
      const res = await fetch('/api/upload/actor-photo', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Upload failed');
      setForm((p) => ({ ...p, photo_url: data.url }));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(id);
  }, [search]);

  async function handleAdd() {
    if (!form.name.trim()) return;
    try {
      await createActor.mutateAsync({
        name: form.name,
        photo_url: form.photo_url || null,
        birth_date: form.birth_date || null,
        person_type: form.person_type,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
      });
      setForm(EMPTY_FORM);
      setShowAdd(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : JSON.stringify(err);
      alert(`Failed to add actor: ${msg}`);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-on-surface">Cast / Actors</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700"
        >
          <Plus className="w-4 h-4" /> Add Actor
        </button>
      </div>

      {showAdd && (
        <div className="bg-surface-card border border-outline rounded-xl p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Name *"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full bg-input rounded-lg px-4 py-2 text-on-surface outline-none focus:ring-2 focus:ring-red-600 text-sm"
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePhotoUpload(file);
                  e.target.value = '';
                }}
              />
              {form.photo_url ? (
                <div className="flex items-center gap-2 flex-1">
                  <img
                    src={form.photo_url}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover border border-outline shrink-0"
                  />
                  <span className="text-xs text-on-surface-subtle truncate flex-1">
                    Photo uploaded
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, photo_url: '' }))}
                    className="p-1 text-red-400 hover:text-red-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 bg-input rounded-lg px-4 py-2 text-sm text-on-surface-muted hover:bg-input-hover disabled:opacity-50"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? 'Uploading...' : 'Photo (optional)'}
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-on-surface-subtle mb-1">Person Type</label>
              <select
                value={form.person_type}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    person_type: e.target.value as 'actor' | 'technician',
                  }))
                }
                className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
              >
                <option value="actor">Actor</option>
                <option value="technician">Technician</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-on-surface-subtle mb-1">Date of Birth</label>
              <input
                type="date"
                value={form.birth_date}
                onChange={(e) => setForm((p) => ({ ...p, birth_date: e.target.value }))}
                className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-on-surface-subtle mb-1">Height (cm)</label>
              <input
                type="number"
                placeholder="e.g. 178"
                value={form.height_cm}
                onChange={(e) => setForm((p) => ({ ...p, height_cm: e.target.value }))}
                className="w-full bg-input rounded-lg px-3 py-2 text-on-surface text-sm outline-none focus:ring-2 focus:ring-red-600"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              disabled={createActor.isPending}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {createActor.isPending ? 'Adding...' : 'Add'}
            </button>
            <button
              onClick={() => {
                setShowAdd(false);
                setForm(EMPTY_FORM);
              }}
              className="text-on-surface-muted px-4 py-2 rounded-lg text-sm hover:bg-input"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
          <input
            type="text"
            placeholder="Search actors..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-input rounded-lg pl-10 pr-4 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600"
          />
          {isFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle animate-spin" />
          )}
        </div>
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && actors.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {actors.length} actor{actors.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {actors.map((actor) => (
            <div
              key={actor.id}
              className="bg-surface-card border border-outline rounded-xl p-4 flex items-center gap-4"
            >
              <Link href={'/cast/' + actor.id} className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-14 h-14 rounded-full bg-input flex items-center justify-center overflow-hidden shrink-0">
                  {actor.photo_url ? (
                    <img src={actor.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Users className="w-6 h-6 text-on-surface-subtle" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-on-surface truncate">{actor.name}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-on-surface-subtle capitalize">
                      {actor.person_type}
                    </span>
                  </div>
                </div>
              </Link>
              <Link
                href={'/cast/' + actor.id}
                className="p-2 rounded-lg text-on-surface-subtle hover:text-on-surface hover:bg-input"
              >
                <Pencil className="w-4 h-4" />
              </Link>
              <button
                onClick={() => {
                  if (confirm('Delete this actor?')) deleteActor.mutate(actor.id);
                }}
                className="p-2 rounded-lg text-on-surface-subtle hover:text-red-500 hover:bg-red-600/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {actors.length === 0 && (
            <p className="text-on-surface-subtle col-span-full text-center py-10">
              No actors found
            </p>
          )}
        </div>
      )}
      {hasNextPage && (
        <div className="flex justify-center">
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="flex items-center gap-2 bg-input hover:bg-input-hover text-on-surface px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
          >
            {isFetchingNextPage ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
