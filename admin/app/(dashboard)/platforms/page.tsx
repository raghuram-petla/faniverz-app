'use client';

import { useState } from 'react';
import {
  useAdminPlatforms,
  useCreatePlatform,
  useUpdatePlatform,
  useDeletePlatform,
} from '@/hooks/useAdminPlatforms';

export default function PlatformsPage() {
  const { data: platforms = [], isLoading } = useAdminPlatforms();
  const createPlatform = useCreatePlatform();
  const updatePlatform = useUpdatePlatform();
  const deletePlatform = useDeletePlatform();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    logo_url: '',
    base_deep_link: '',
    color: '#6366f1',
    display_order: 0,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      slug: '',
      logo_url: '',
      base_deep_link: '',
      color: '#6366f1',
      display_order: 0,
    });
    setEditId(null);
    setShowForm(false);
  };

  const startEdit = (platform: Record<string, unknown>) => {
    setFormData({
      name: (platform.name as string) ?? '',
      slug: (platform.slug as string) ?? '',
      logo_url: (platform.logo_url as string) ?? '',
      base_deep_link: (platform.base_deep_link as string) ?? '',
      color: (platform.color as string) ?? '#6366f1',
      display_order: (platform.display_order as number) ?? 0,
    });
    setEditId(platform.id as number);
    setShowForm(true);
  };

  const handleSave = () => {
    if (editId) {
      updatePlatform.mutate({ id: editId, updates: formData }, { onSuccess: resetForm });
    } else {
      createPlatform.mutate(formData, { onSuccess: resetForm });
    }
  };

  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this platform?')) {
      deletePlatform.mutate(id);
    }
  };

  return (
    <div data-testid="platforms-page">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Platforms</h1>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
        >
          Add Platform
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">
            {editId ? 'Edit Platform' : 'New Platform'}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name *</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Slug *</label>
              <input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Logo URL</label>
              <input
                value={formData.logo_url}
                onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Base Deep Link</label>
              <input
                value={formData.base_deep_link}
                onChange={(e) => setFormData({ ...formData, base_deep_link: e.target.value })}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Brand Color</label>
              <input
                type="color"
                value={formData.color}
                onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                className="mt-1 block h-10 w-20 rounded border border-gray-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Order</label>
              <input
                type="number"
                value={formData.display_order}
                onChange={(e) =>
                  setFormData({ ...formData, display_order: Number(e.target.value) })
                }
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleSave}
              disabled={createPlatform.isPending || updatePlatform.isPending}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              {editId ? 'Update' : 'Create'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p>Loading...</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table data-testid="platforms-table" className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Order</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Slug</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Color</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {platforms.map((platform: Record<string, unknown>) => (
                <tr key={platform.id as number} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{platform.display_order as number}</td>
                  <td className="px-4 py-3 font-medium">{platform.name as string}</td>
                  <td className="px-4 py-3 text-gray-600">{platform.slug as string}</td>
                  <td className="px-4 py-3">
                    <span
                      className="inline-block w-6 h-6 rounded"
                      style={{ backgroundColor: (platform.color as string) ?? '#ccc' }}
                    />
                  </td>
                  <td className="px-4 py-3 space-x-2">
                    <button
                      onClick={() => startEdit(platform)}
                      className="text-indigo-600 hover:text-indigo-800 text-xs font-medium"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(platform.id as number)}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
