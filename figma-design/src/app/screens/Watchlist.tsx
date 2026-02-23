import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Bookmark, Star, Calendar, Trash2, PlayCircle, Check, Eye, RotateCcw } from 'lucide-react';
import { movies, ottPlatforms } from '../data/movies';

export function Watchlist() {
  const navigate = useNavigate();
  // For demo, we'll use some movies as watchlisted
  const [watchlistedIds, setWatchlistedIds] = useState<string[]>(['1', '4', '5', '8']);
  const [watchedIds, setWatchedIds] = useState<string[]>([]);

  const watchlistedMovies = movies.filter((m) => watchlistedIds.includes(m.id));
  const watchedMovies = movies.filter((m) => watchedIds.includes(m.id));

  const removeFromWatchlist = (id: string) => {
    setWatchlistedIds(watchlistedIds.filter((wid) => wid !== id));
  };

  const markAsWatched = (id: string) => {
    setWatchlistedIds(watchlistedIds.filter((wid) => wid !== id));
    setWatchedIds([...watchedIds, id]);
  };

  const moveBackToWatchlist = (id: string) => {
    setWatchedIds(watchedIds.filter((wid) => wid !== id));
    setWatchlistedIds([...watchlistedIds, id]);
  };

  const removeFromWatched = (id: string) => {
    setWatchedIds(watchedIds.filter((wid) => wid !== id));
  };

  const upcomingMovies = watchlistedMovies.filter((m) => m.releaseType === 'upcoming');
  const availableMovies = watchlistedMovies.filter((m) => m.releaseType !== 'upcoming');

  return (
    <div className="min-h-screen bg-black pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-black/95 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-md mx-auto px-4 pt-4 pb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">My Watchlist</h1>
              <p className="text-sm text-white/60 mt-1">
                {watchlistedMovies.length} {watchlistedMovies.length === 1 ? 'movie' : 'movies'}{' '}
                saved
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <div className="w-12 h-12 rounded-full bg-red-600/20 flex items-center justify-center">
                <Bookmark className="w-6 h-6 text-red-500" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {watchlistedMovies.length === 0 ? (
        // Empty State
        <div className="flex flex-col items-center justify-center px-4 mt-32">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-4">
            <Bookmark className="w-10 h-10 text-white/20" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Your watchlist is empty</h2>
          <p className="text-white/60 text-center mb-6 max-w-sm">
            Start adding movies to your watchlist to keep track of what you want to watch
          </p>
          <button
            onClick={() => navigate('/discover')}
            className="px-6 py-3 bg-red-600 active:bg-red-700 text-white font-semibold rounded-full transition-colors"
          >
            Discover Movies
          </button>
        </div>
      ) : (
        <div className="max-w-md mx-auto px-4 mt-6 space-y-8">
          {/* Available to Watch */}
          {availableMovies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <PlayCircle className="w-5 h-5 text-green-500" />
                <h2 className="text-lg font-bold text-white">Available to Watch</h2>
              </div>
              <div className="space-y-3">
                {availableMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex gap-3 p-3 bg-white/5 rounded-xl active:bg-white/10 transition-colors group"
                  >
                    <button
                      onClick={() => navigate(`/movie/${movie.id}`)}
                      className="relative w-24 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0"
                    >
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                      {movie.ottPlatforms && movie.ottPlatforms.length > 0 && (
                        <div className="absolute bottom-1 right-1">
                          {movie.ottPlatforms.slice(0, 1).map((platformId) => {
                            const platform = ottPlatforms.find((p) => p.id === platformId);
                            return (
                              <div
                                key={platformId}
                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: platform?.color }}
                              >
                                {platform?.logo}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/movie/${movie.id}`)}
                        className="text-left w-full"
                      >
                        <h3 className="font-semibold text-white transition-colors line-clamp-1">
                          {movie.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          {movie.releaseType === 'theatrical' && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                              In Theaters
                            </span>
                          )}
                          {movie.releaseType === 'ott' && (
                            <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">
                              Streaming
                            </span>
                          )}
                          {movie.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-white/60">{movie.rating}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {movie.genres.slice(0, 2).map((genre) => (
                            <span key={genre} className="text-xs text-white/50">
                              {genre}
                            </span>
                          ))}
                        </div>
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromWatchlist(movie.id)}
                      className="p-2 h-fit rounded-lg active:bg-red-600/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => markAsWatched(movie.id)}
                      className="p-2 h-fit rounded-lg active:bg-green-600/20 transition-colors"
                    >
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Upcoming Releases */}
          {upcomingMovies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-bold text-white">Upcoming Releases</h2>
              </div>
              <div className="space-y-3">
                {upcomingMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex gap-3 p-3 bg-white/5 rounded-xl active:bg-white/10 transition-colors group"
                  >
                    <button
                      onClick={() => navigate(`/movie/${movie.id}`)}
                      className="relative w-24 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0"
                    >
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1">
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">
                          Soon
                        </span>
                      </div>
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/movie/${movie.id}`)}
                        className="text-left w-full"
                      >
                        <h3 className="font-semibold text-white transition-colors line-clamp-1">
                          {movie.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Calendar className="w-3 h-3 text-blue-400" />
                          <span className="text-xs text-blue-400 font-semibold">
                            {new Date(movie.releaseDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {movie.genres.slice(0, 2).map((genre) => (
                            <span key={genre} className="text-xs text-white/50">
                              {genre}
                            </span>
                          ))}
                        </div>
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromWatchlist(movie.id)}
                      className="p-2 h-fit rounded-lg active:bg-red-600/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                    <button
                      onClick={() => markAsWatched(movie.id)}
                      className="p-2 h-fit rounded-lg active:bg-green-600/20 transition-colors"
                    >
                      <Check className="w-4 h-4 text-green-500" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Watched Movies */}
          {watchedMovies.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <Eye className="w-5 h-5 text-gray-500" />
                <h2 className="text-lg font-bold text-white">Watched Movies</h2>
              </div>
              <div className="space-y-3">
                {watchedMovies.map((movie) => (
                  <div
                    key={movie.id}
                    className="flex gap-3 p-3 bg-white/5 rounded-xl active:bg-white/10 transition-colors group"
                  >
                    <button
                      onClick={() => navigate(`/movie/${movie.id}`)}
                      className="relative w-24 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0"
                    >
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover"
                      />
                      {movie.ottPlatforms && movie.ottPlatforms.length > 0 && (
                        <div className="absolute bottom-1 right-1">
                          {movie.ottPlatforms.slice(0, 1).map((platformId) => {
                            const platform = ottPlatforms.find((p) => p.id === platformId);
                            return (
                              <div
                                key={platformId}
                                className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white"
                                style={{ backgroundColor: platform?.color }}
                              >
                                {platform?.logo}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => navigate(`/movie/${movie.id}`)}
                        className="text-left w-full"
                      >
                        <h3 className="font-semibold text-white transition-colors line-clamp-1">
                          {movie.title}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          {movie.releaseType === 'theatrical' && (
                            <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                              In Theaters
                            </span>
                          )}
                          {movie.releaseType === 'ott' && (
                            <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">
                              Streaming
                            </span>
                          )}
                          {movie.rating > 0 && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                              <span className="text-xs text-white/60">{movie.rating}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-wrap">
                          {movie.genres.slice(0, 2).map((genre) => (
                            <span key={genre} className="text-xs text-white/50">
                              {genre}
                            </span>
                          ))}
                        </div>
                      </button>
                    </div>
                    <button
                      onClick={() => moveBackToWatchlist(movie.id)}
                      className="p-2 h-fit rounded-lg active:bg-blue-600/20 transition-colors"
                    >
                      <RotateCcw className="w-4 h-4 text-blue-500" />
                    </button>
                    <button
                      onClick={() => removeFromWatched(movie.id)}
                      className="p-2 h-fit rounded-lg active:bg-red-600/20 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
