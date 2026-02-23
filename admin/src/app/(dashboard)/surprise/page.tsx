'use client';

import { useAdminSurprise, useDeleteSurprise } from '@/hooks/useAdminSurprise';
import { Sparkles, Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';

const categoryColors: Record<string, { bg: string; text: string }> = {
  song: { bg: 'bg-pink-600/20', text: 'text-pink-400' },
  'short-film': { bg: 'bg-purple-600/20', text: 'text-purple-400' },
  bts: { bg: 'bg-yellow-600/20', text: 'text-yellow-400' },
  interview: { bg: 'bg-blue-600/20', text: 'text-blue-400' },
  trailer: { bg: 'bg-red-600/20', text: 'text-red-400' },
};

export default function SurpriseContentPage() {
  const { data: items, isLoading } = useAdminSurprise();
  const deleteItem = useDeleteSurprise();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this surprise content?')) return;
    deleteItem.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Surprise Content</h1>
        </div>
        <Link
          href="/surprise/new"
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium"
        >
          <Plus className="w-4 h-4" />
          Add Content
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-white/40 animate-spin" />
        </div>
      ) : !items?.length ? (
        <div className="text-center py-20 text-white/40">
          No surprise content found. Add one to get started.
        </div>
      ) : (
        <div className="bg-zinc-900 border border-white/10 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Title</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Category</th>
                <th className="text-left text-sm font-medium text-white/60 px-6 py-4">Duration</th>
                <th className="text-right text-sm font-medium text-white/60 px-6 py-4">Views</th>
                <th className="text-right text-sm font-medium text-white/60 px-6 py-4">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const cat = categoryColors[item.category] ?? {
                  bg: 'bg-white/10',
                  text: 'text-white/60',
                };
                return (
                  <tr
                    key={item.id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-white font-medium">{item.title}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${cat.bg} ${cat.text}`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-white/60 text-sm">{item.duration ?? '--'}</td>
                    <td className="px-6 py-4 text-right text-white/60 text-sm">
                      {item.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/surprise/${item.id}`}
                          className="p-2 text-white/40 hover:text-blue-400 transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={deleteItem.isPending}
                          className="p-2 text-white/40 hover:text-red-500 transition-colors disabled:opacity-50"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
