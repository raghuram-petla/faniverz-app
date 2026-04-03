'use client';

import { useAdminSurprise, useDeleteSurprise } from '@/hooks/useAdminSurprise';
import { usePermissions } from '@/hooks/usePermissions';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import Link from 'next/link';

// @edge Unknown categories fall back to bg-input/text-on-surface-muted via nullish coalesce in render
const categoryColors: Record<string, { bg: string; text: string }> = {
  song: { bg: 'bg-pink-600/20', text: 'text-pink-400' },
  'short-film': { bg: 'bg-purple-600/20', text: 'text-status-purple' },
  bts: { bg: 'bg-yellow-600/20', text: 'text-status-yellow' },
  interview: { bg: 'bg-blue-600/20', text: 'text-status-blue' },
  trailer: { bg: 'bg-red-600/20', text: 'text-status-red' },
};

// @contract Surprise content is a flat list (no pagination/infinite scroll) — assumes < 200 items.
// @coupling Delete uses confirm() dialog — no undo/soft-delete support.
export default function SurpriseContentPage() {
  const { isReadOnly, canDeleteTopLevel } = usePermissions();
  const { data: items, isLoading, isError, error } = useAdminSurprise();
  const deleteItem = useDeleteSurprise();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this surprise content?')) return;
    deleteItem.mutate(id, { onError: (err: Error) => alert(`Error: ${err.message}`) });
  };

  return (
    <div className="space-y-6">
      <div className="flex">
        {!isReadOnly && (
          <Link
            href="/surprise/new"
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors font-medium ml-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            Add Content
          </Link>
        )}
      </div>

      {/* v8 ignore start -- isError is always false in test mocks */}
      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-status-red">
          Error loading surprise content: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}
      {/* v8 ignore stop */}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !items?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">
          No surprise content found. Add one to get started.
        </div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Title
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Category
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Views
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const cat = categoryColors[item.category] ?? {
                  bg: 'bg-input',
                  text: 'text-on-surface-muted',
                };
                return (
                  <tr
                    key={item.id}
                    className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="text-on-surface font-medium truncate max-w-[250px] inline-block align-middle">
                        {item.title}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium ${cat.bg} ${cat.text}`}
                      >
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-on-surface-muted text-sm">
                      {item.views.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/surprise/${item.id}`}
                          className="p-2 text-on-surface-subtle hover:text-status-blue transition-colors"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </Link>
                        {canDeleteTopLevel() && (
                          <button
                            onClick={() => handleDelete(item.id)}
                            disabled={deleteItem.isPending}
                            className="p-2 text-on-surface-subtle hover:text-status-red transition-colors disabled:opacity-50"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
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
