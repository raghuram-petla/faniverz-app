'use client';

import { useState } from 'react';
import { useAdminComments, useDeleteComment, useUpdateComment } from '@/hooks/useAdminComments';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { Trash2, Pencil, Loader2, X, Check } from 'lucide-react';
import { usePermissions } from '@/hooks/usePermissions';

// @contract Inline editing uses local state (editingId/editBody) — only one comment editable at a time.
// @boundary No pagination — all matching comments loaded in a single query.
// @coupling Shares identical inline-edit UX pattern with ReviewsPage (same Save/Cancel buttons).
export default function CommentsPage() {
  const { isReadOnly } = usePermissions();
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  // @invariant At most one comment can be in edit mode (editingId is singular)
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const {
    data: comments,
    isLoading,
    isFetching,
    isError,
    error,
  } = useAdminComments(debouncedSearch);
  const deleteComment = useDeleteComment();
  const updateComment = useUpdateComment();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this comment? This cannot be undone.')) return;
    deleteComment.mutate(id);
  };

  const startEdit = (id: string, body: string) => {
    setEditingId(id);
    setEditBody(body);
  };

  const cancelEdit = () => setEditingId(null);

  // @sideeffect Persists edited comment body and exits edit mode on success
  const saveEdit = () => {
    /* v8 ignore start */
    if (!editingId) return;
    /* v8 ignore stop */
    updateComment.mutate(
      { id: editingId, body: editBody },
      { onSuccess: () => setEditingId(null) },
    );
  };

  return (
    <div className="space-y-6">
      {comments && (
        <p className="text-sm text-on-surface-muted">
          {comments.length} comment{comments.length !== 1 ? 's' : ''}
        </p>
      )}

      <div className="space-y-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by comment text or commenter name..."
          isLoading={isFetching}
        />
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && comments && comments.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {comments.length} comment{comments.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-status-red">
          Error loading comments: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !comments?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">No comments found.</div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Post
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  User
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Comment
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Date
                </th>
                <th className="text-right text-sm font-medium text-on-surface-muted px-6 py-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {comments.map((comment) => (
                <tr
                  key={comment.id}
                  className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-on-surface font-medium text-sm">
                      {comment.feed_item?.title ?? 'Untitled post'}
                      {/* @nullable feed_item may be null if post was deleted */}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {comment.profile?.display_name ?? comment.profile?.email ?? 'Unknown'}
                    {/* @nullable Falls through display_name -> email -> 'Unknown' */}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted max-w-md">
                    {editingId === comment.id ? (
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="w-full bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600 min-h-[60px]"
                        rows={3}
                      />
                    ) : (
                      <span className="truncate block">{comment.body}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isReadOnly ? null : editingId === comment.id ? (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={updateComment.isPending}
                            className="p-2 text-status-green hover:text-status-green transition-colors disabled:opacity-50"
                            title="Save"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="p-2 text-on-surface-subtle hover:text-on-surface transition-colors"
                            title="Cancel"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(comment.id, comment.body)}
                            className="p-2 text-on-surface-subtle hover:text-status-blue transition-colors"
                            title="Edit comment"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(comment.id)}
                            disabled={deleteComment.isPending}
                            className="p-2 text-on-surface-subtle hover:text-status-red transition-colors disabled:opacity-50"
                            title="Delete comment"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
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
