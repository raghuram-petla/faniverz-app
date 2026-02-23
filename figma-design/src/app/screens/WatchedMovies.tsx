import { useState } from 'react';
import { useNavigate } from 'react-router';
import { ChevronLeft, Star, Calendar, Check, Filter, ChevronDown } from 'lucide-react';
import { movies } from '../data/movies';

export function WatchedMovies() {
  const navigate = useNavigate();
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'title'>('recent');
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Mock watched movies (first 8 movies)
  const watchedMovies = movies.slice(0, 8).map((movie) => ({
    ...movie,
    watchedDate: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
  }));

  const sortedMovies = [...watchedMovies].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'title':
        return a.title.localeCompare(b.title);
      case 'recent':
      default:
        return new Date(b.watchedDate).getTime() - new Date(a.watchedDate).getTime();
    }
  });

  const avgRating = watchedMovies.reduce((sum, m) => sum + m.rating, 0) / watchedMovies.length;
  const totalHours = watchedMovies.length * 2.5; // Assuming avg 2.5 hours per movie

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
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white">Watched Movies</h1>
              <p className="text-sm text-white/60">{watchedMovies.length} movies watched</p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-white/5 rounded-xl p-3 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-lg font-bold text-white">{watchedMovies.length}</span>
              </div>
              <p className="text-xs text-white/60">Watched</p>
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
                <Calendar className="w-4 h-4 text-blue-500" />
                <span className="text-lg font-bold text-white">{totalHours.toFixed(0)}h</span>
              </div>
              <p className="text-xs text-white/60">Watch Time</p>
            </div>
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowSortDropdown(!showSortDropdown)}
              className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-white/10 text-white/90 hover:bg-white/15 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Sort by: <span className="capitalize">{sortBy}</span>
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`}
              />
            </button>

            {showSortDropdown && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-900 rounded-lg border border-white/10 shadow-xl z-50">
                <button
                  onClick={() => {
                    setSortBy('recent');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors border-b border-white/5 ${
                    sortBy === 'recent'
                      ? 'bg-red-600 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Recently Watched
                </button>
                <button
                  onClick={() => {
                    setSortBy('rating');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors border-b border-white/5 ${
                    sortBy === 'rating'
                      ? 'bg-red-600 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Highest Rated
                </button>
                <button
                  onClick={() => {
                    setSortBy('title');
                    setShowSortDropdown(false);
                  }}
                  className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                    sortBy === 'title'
                      ? 'bg-red-600 text-white'
                      : 'text-white/60 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  Title (A-Z)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-4">
        {/* Movies Grid */}
        <div className="grid grid-cols-2 gap-4">
          {sortedMovies.map((movie) => (
            <button
              key={movie.id}
              onClick={() => navigate(`/movie/${movie.id}`)}
              className="group relative"
            >
              <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2.5 bg-white/5">
                <img
                  src={movie.poster}
                  alt={movie.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                {/* Watched Badge */}
                <div className="absolute top-2.5 left-2.5">
                  <div className="w-8 h-8 rounded-full bg-green-600/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>

                {/* Rating */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-bold text-white">{movie.rating}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-white/70" />
                    <span className="text-xs text-white/70 font-medium">
                      {new Date(movie.watchedDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
              </div>
              <h3 className="font-semibold text-white text-sm line-clamp-2 text-left group-hover:text-red-500 transition-colors">
                {movie.title}
              </h3>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
