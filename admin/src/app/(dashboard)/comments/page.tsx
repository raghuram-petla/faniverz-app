'use client';

import { useAdminComments, useDeleteComment } from '@/hooks/useAdminComments';
import { MessageSquare, Trash2, Loader2 } from 'lucide-react';

export default function CommentsPage() {
  const { data: comments, isLoading } = useAdminComments();
  const deleteComment = useDeleteComment();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this comment? This cannot be undone.')) return;
    deleteComment.mutate(id, { onError: (err: Error) => alert(`Error: ${err.message}`) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-purple-600/20 flex items-center justify-center">
          <MessageSquare className="w-5 h-5 text-purple-500" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Comments</h1>
        {comments && <span className="text-sm text-on-surface-muted">({comments.length})</span>}
      </div>

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
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {comment.profile?.display_name ?? comment.profile?.email ?? 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted max-w-md truncate">
                    {comment.body}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {new Date(comment.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(comment.id)}
                      disabled={deleteComment.isPending}
                      className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Delete comment"
                    >
                      <Trash2 className="w-4 h-4" />
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
