'use client';

import { useAdminFeedVotes, useDeleteFeedVote } from '@/hooks/useAdminFeedVotes';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { ThumbsUp, Trash2, Loader2 } from 'lucide-react';

export default function FeedVotesPage() {
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const { data: votes, isLoading, isFetching, isError, error } = useAdminFeedVotes(debouncedSearch);
  const deleteVote = useDeleteFeedVote();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this vote? This cannot be undone.')) return;
    deleteVote.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-green-600/20 flex items-center justify-center">
          <ThumbsUp className="w-5 h-5 text-green-500" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Feed Votes</h1>
        {votes && <span className="text-sm text-on-surface-muted">({votes.length})</span>}
      </div>

      <div className="space-y-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by user name, feed title, or vote type..."
          isLoading={isFetching}
        />
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && votes && votes.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {votes.length} vote{votes.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          </p>
        )}
      </div>

      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-red-400">
          Error loading votes: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !votes?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">No votes found.</div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  User
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Feed Item
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Vote
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
              {votes.map((vote) => (
                <tr
                  key={vote.id}
                  className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-on-surface">
                    {vote.profile?.display_name ?? vote.profile?.email ?? 'Unknown'}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted max-w-xs truncate">
                    {vote.feed_item?.title ?? vote.feed_item_id}
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        vote.vote_type === 'up'
                          ? 'bg-green-600/20 text-green-400'
                          : 'bg-red-600/20 text-red-400'
                      }`}
                    >
                      {vote.vote_type === 'up' ? '▲ Upvote' : '▼ Downvote'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {new Date(vote.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(vote.id)}
                      disabled={deleteVote.isPending}
                      className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                      title="Delete vote"
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
