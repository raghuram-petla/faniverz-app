'use client';

import { useState } from 'react';
import {
  useAdminPlatforms,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
} from '@/hooks/useAdminPlatforms';
import type { OTTPlatform } from '@/lib/types';
import { Monitor, Plus, Pencil, Trash2, X, Loader2 } from 'lucide-react';

interface PlatformFormData {
  name: string;
  logo: string;
  color: string;
  display_order: number;
}

const emptyForm: PlatformFormData = { name: '', logo: '', color: '#e50914', display_order: 0 };

export default function PlatformsPage() {
  const { data: platforms, isLoading } = useAdminPlatforms();
  const createPlatform = useCreatePlatform();
  const updatePlatform = useUpdatePlatform();
  const deletePlatform = useDeletePlatform();

  const [showDialog, setShowDialog] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PlatformFormData>(emptyForm);

  const openAdd = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowDialog(true);
  };

  const openEdit = (platform: OTTPlatform) => {
    setEditingId(platform.id);
    setForm({
      name: platform.name,
      logo: platform.logo,
      color: platform.color,
      display_order: platform.display_order,
    });
    setShowDialog(true);
  };

  const handleClose = () => {
    setShowDialog(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      updatePlatform.mutate({ id: editingId, ...form }, { onSuccess: handleClose });
    } else {
      createPlatform.mutate(form, { onSuccess: handleClose });
    }
  };

  const handleDelete = (id: string) => {
    if (!confirm('Delete this platform? This will also remove all related OTT releases.')) return;
    deletePlatform.mutate(id);
  };

  const isSaving = createPlatform.isPending || updatePlatform.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-600/20 flex items-center justify-center">
            <Monitor className="w-5 h-5 text-blue-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Platforms</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Platform
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : !platforms?.length ? (
        <div className="text-center py-20 text-white/40">
          No platforms found. Add one to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {platforms.map((platform) => (
            <div
              key={platform.id}
              className="bg-zinc-900 border border-white/10 rounded-xl p-5 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: platform.color }}
                  >
                    {platform.logo}
                  </span>
                  <div>
                    <h3 className="text-white font-semibold text-lg">{platform.name}</h3>
                    <p className="text-white/40 text-sm font-mono">{platform.color}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(platform)}
                    className="p-2 text-white/40 hover:text-blue-400 transition-colors"
                    title="Edit platform"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(platform.id)}
                    disabled={deletePlatform.isPending}
                    className="p-2 text-white/40 hover:text-red-500 transition-colors disabled:opacity-50"
                    title="Delete platform"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Display Order</span>
                <span className="text-white font-medium">{platform.display_order}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog overlay */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-white/10 rounded-xl p-6 w-full max-w-md mx-4 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">
                {editingId ? 'Edit Platform' : 'Add Platform'}
              </h2>
              <button
                onClick={handleClose}
                className="p-1 text-white/40 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="block text-sm font-medium text-white/60">
                  Name
                </label>
                <input
                  id="name"
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  placeholder="e.g. Netflix"
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="logo" className="block text-sm font-medium text-white/60">
                  Logo Text
                </label>
                <input
                  id="logo"
                  type="text"
                  value={form.logo}
                  onChange={(e) => setForm({ ...form, logo: e.target.value })}
                  required
                  placeholder="e.g. N"
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="color" className="block text-sm font-medium text-white/60">
                  Brand Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="w-10 h-10 rounded border border-white/10 bg-transparent cursor-pointer"
                  />
                  <input
                    id="color"
                    type="text"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    required
                    placeholder="#e50914"
                    className="flex-1 bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white font-mono placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="display_order" className="block text-sm font-medium text-white/60">
                  Display Order
                </label>
                <input
                  id="display_order"
                  type="number"
                  value={form.display_order}
                  onChange={(e) => setForm({ ...form, display_order: Number(e.target.value) })}
                  required
                  min={0}
                  className="w-full bg-zinc-800 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-red-600 focus:border-transparent"
                />
              </div>

              {/* Preview */}
              <div className="pt-2">
                <p className="text-sm text-white/40 mb-2">Preview</p>
                <div className="flex items-center gap-3">
                  <span
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold text-white"
                    style={{ backgroundColor: form.color || '#333' }}
                  >
                    {form.logo || '?'}
                  </span>
                  <span className="font-medium" style={{ color: form.color || '#fff' }}>
                    {form.name || 'Platform'}
                  </span>
                </div>
              </div>

              {(createPlatform.isError || updatePlatform.isError) && (
                <p className="text-red-400 text-sm">Failed to save platform. Please try again.</p>
              )}

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-2.5 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editingId ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2.5 text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
