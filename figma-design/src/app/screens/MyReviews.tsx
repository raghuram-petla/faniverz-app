import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Star, ThumbsUp, Edit, Trash2, MessageSquare } from 'lucide-react';
import { movies, reviews as allReviews } from '../data/movies';

export function MyReviews() {
  const navigate = useNavigate();
  const [reviews] = useState(allReviews);
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'helpful'>('recent');

  const sortedReviews = [...reviews].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'helpful':
        return b.helpful - a.helpful;
      case 'recent':
      default:
        return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
  });

  const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
  const totalHelpful = reviews.reduce((sum, r) => sum + r.helpful, 0);

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black to-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => navigate('/profile')}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-white" />
            </button>
            <h1 className="text-2xl font-bold text-white">My Reviews</h1>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <MessageSquare className="w-4 h-4 text-blue-500" />
                <span className="text-lg font-bold text-white">{reviews.length}</span>
              </div>
              <p className="text-xs text-white/60">Reviews</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Star className="w-4 h-4 text-yellow-400" />
                <span className="text-lg font-bold text-white">{avgRating.toFixed(1)}</span>
              </div>
              <p className="text-xs text-white/60">Avg Rating</p>
            </div>
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <ThumbsUp className="w-4 h-4 text-green-500" />
                <span className="text-lg font-bold text-white">{totalHelpful}</span>
              </div>
              <p className="text-xs text-white/60">Helpful</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Sort Options */}
        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-white/60">Sort by:</span>
          <div className="flex gap-2">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === 'recent'
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSortBy('rating')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === 'rating'
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Rating
            </button>
            <button
              onClick={() => setSortBy('helpful')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                sortBy === 'helpful'
                  ? 'bg-red-600 text-white'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              Helpful
            </button>
          </div>
        </div>

        {/* Reviews List */}
        <div className="space-y-4">
          {sortedReviews.map((review) => {
            const movie = movies.find((m) => m.id === review.movieId);
            if (!movie) return null;

            return (
              <div
                key={review.id}
                className="bg-white/5 rounded-2xl overflow-hidden border border-white/10 hover:border-white/20 transition-colors"
              >
                <button
                  onClick={() => navigate(`/movie/${review.movieId}`)}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-16 h-24 rounded-lg object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-white mb-1 line-clamp-1">{movie.title}</h3>
                      <div className="flex items-center gap-1 mb-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-white/20'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-sm text-white/70 line-clamp-3">{review.body}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-white/40 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-4">
                      <span>{new Date(review.date).toLocaleDateString()}</span>
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3" />
                        <span>{review.helpful} helpful</span>
                      </div>
                    </div>
                  </div>
                </button>

                {/* Action Buttons */}
                <div className="flex border-t border-white/5">
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-white/5 transition-colors">
                    <Edit className="w-4 h-4 text-white/60" />
                    <span className="text-sm text-white/60 font-medium">Edit</span>
                  </button>
                  <div className="w-px bg-white/5" />
                  <button className="flex-1 flex items-center justify-center gap-2 py-3 hover:bg-white/5 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-500/60" />
                    <span className="text-sm text-red-500/60 font-medium">Delete</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
