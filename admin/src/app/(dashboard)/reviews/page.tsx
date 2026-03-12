'use client';

import { useState } from 'react';
import { useAdminReviews, useDeleteReview, useUpdateReview } from '@/hooks/useAdminReviews';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';
import { SearchInput } from '@/components/common/SearchInput';
import { Star, Trash2, Pencil, Loader2, X, Check } from 'lucide-react';
import type { Review } from '@/lib/types';

function RatingStars({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${i < rating ? 'text-yellow-500 fill-yellow-500' : 'text-outline'}`}
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const { search, setSearch, debouncedSearch } = useDebouncedSearch();
  const [ratingFilter, setRatingFilter] = useState(0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState('');
  const {
    data: reviews,
    isLoading,
    isFetching,
    isError,
    error,
  } = useAdminReviews(debouncedSearch, ratingFilter);
  const deleteReview = useDeleteReview();
  const updateReview = useUpdateReview();

  const handleDelete = (id: string) => {
    if (!confirm('Delete this review? This cannot be undone.')) return;
    deleteReview.mutate(id, { onError: (err: Error) => alert(`Error: ${err.message}`) });
  };

  const startEdit = (review: Review) => {
    setEditingId(review.id);
    setEditBody(review.body ?? '');
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = () => {
    if (!editingId) return;
    updateReview.mutate({ id: editingId, body: editBody }, { onSuccess: () => setEditingId(null) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-yellow-600/20 flex items-center justify-center">
          <Star className="w-5 h-5 text-yellow-500" />
        </div>
        <h1 className="text-2xl font-bold text-on-surface">Reviews</h1>
        {reviews && <span className="text-sm text-on-surface-muted">({reviews.length})</span>}
      </div>

      <div className="space-y-2">
        <div className="flex gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by movie, reviewer, or review text..."
            isLoading={isFetching}
            className="flex-1"
          />
          <select
            value={ratingFilter}
            onChange={(e) => setRatingFilter(Number(e.target.value))}
            className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
          >
            <option value={0}>All Ratings</option>
            <option value={1}>1 Star</option>
            <option value={2}>2 Stars</option>
            <option value={3}>3 Stars</option>
            <option value={4}>4 Stars</option>
            <option value={5}>5 Stars</option>
          </select>
        </div>
        {search.length === 1 && (
          <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
        )}
        {!isLoading && reviews && reviews.length > 0 && (
          <p className="text-xs text-on-surface-subtle">
            Showing {reviews.length} review{reviews.length !== 1 ? 's' : ''}
            {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
            {ratingFilter > 0 ? ` (${ratingFilter} star${ratingFilter !== 1 ? 's' : ''})` : ''}
          </p>
        )}
      </div>

      {isError && (
        <div className="bg-red-600/10 border border-red-600/30 rounded-lg px-4 py-3 text-sm text-red-400">
          Error loading reviews: {error instanceof Error ? error.message : 'Unknown error'}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-on-surface-subtle animate-spin" />
        </div>
      ) : !reviews?.length ? (
        <div className="text-center py-20 text-on-surface-subtle">No reviews found.</div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline">
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Movie
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  User
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Rating
                </th>
                <th className="text-left text-sm font-medium text-on-surface-muted px-6 py-4">
                  Review
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
              {reviews.map((review) => (
                <tr
                  key={review.id}
                  className="border-b border-outline-subtle hover:bg-surface-elevated transition-colors"
                >
                  <td className="px-6 py-4">
                    <span className="text-on-surface font-medium text-sm">
                      {review.movie?.title ?? 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {review.profile?.display_name ?? review.profile?.email ?? 'Unknown'}
                  </td>
                  <td className="px-6 py-4">
                    <RatingStars rating={review.rating} />
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted max-w-xs">
                    {review.contains_spoiler && (
                      <span className="inline-block px-1.5 py-0.5 rounded text-xs bg-red-600/20 text-red-400 mr-2">
                        Spoiler
                      </span>
                    )}
                    {editingId === review.id ? (
                      <textarea
                        value={editBody}
                        onChange={(e) => setEditBody(e.target.value)}
                        className="w-full bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600 min-h-[60px]"
                        rows={3}
                      />
                    ) : (
                      <span className="truncate block">{review.title ?? review.body ?? '--'}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-on-surface-muted">
                    {new Date(review.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === review.id ? (
                        <>
                          <button
                            onClick={saveEdit}
                            disabled={updateReview.isPending}
                            className="p-2 text-green-500 hover:text-green-400 transition-colors disabled:opacity-50"
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
                            onClick={() => startEdit(review)}
                            className="p-2 text-on-surface-subtle hover:text-blue-500 transition-colors"
                            title="Edit review"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(review.id)}
                            disabled={deleteReview.isPending}
                            className="p-2 text-on-surface-subtle hover:text-red-500 transition-colors disabled:opacity-50"
                            title="Delete review"
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
