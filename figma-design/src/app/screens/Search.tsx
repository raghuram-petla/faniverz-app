import { useState } from 'react';
import { useNavigate } from 'react-router';
import { X, Search as SearchIcon, TrendingUp, Clock, Star } from 'lucide-react';
import { movies, ottPlatforms } from '../data/movies';
import { Input } from '../components/ui/input';

export function Search() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentSearches] = useState(['Pushpa', 'Prabhas', 'Nani']);

  const filteredMovies =
    searchQuery.trim() === ''
      ? []
      : movies.filter(
          (movie) =>
            movie.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            movie.director.toLowerCase().includes(searchQuery.toLowerCase()) ||
            movie.cast.some((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase())),
        );

  const trendingMovies = movies.filter((m) => m.rating > 4.4).slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Header with Search */}
      <div className="sticky top-0 bg-black border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
              <Input
                type="text"
                placeholder="Search movies, actors, directors..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="pl-12 pr-4 h-12 bg-white/10 border-white/20 text-white placeholder:text-white/40 rounded-xl focus:bg-white/15 focus:border-white/40"
              />
            </div>
            <button
              onClick={() => navigate(-1)}
              className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-6 overflow-y-auto h-[calc(100vh-80px)]">
        {!searchQuery.trim() ? (
          // No Search Query - Show Recent & Trending
          <div className="space-y-8">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <Clock className="w-5 h-5 text-white/60" />
                  <h2 className="font-semibold text-white">Recent Searches</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((term, index) => (
                    <button
                      key={index}
                      onClick={() => setSearchQuery(term)}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
                    >
                      {term}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Trending */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-5 h-5 text-red-500" />
                <h2 className="font-semibold text-white">Trending Now</h2>
              </div>
              <div className="space-y-3">
                {trendingMovies.map((movie, index) => (
                  <button
                    key={movie.id}
                    onClick={() => navigate(`/movie/${movie.id}`)}
                    className="flex gap-3 w-full group"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-600/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-red-500">{index + 1}</span>
                    </div>
                    <div className="relative w-16 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={movie.poster}
                        alt={movie.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="flex-1 text-left">
                      <h3 className="font-semibold text-white group-hover:text-red-500 transition-colors line-clamp-1">
                        {movie.title}
                      </h3>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-white/60">{movie.rating}</span>
                        </div>
                        <span className="text-xs text-white/40">•</span>
                        <span className="text-xs text-white/60">
                          {movie.reviewCount.toLocaleString()} reviews
                        </span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </div>
        ) : filteredMovies.length > 0 ? (
          // Search Results
          <div>
            <p className="text-white/60 text-sm mb-4">
              {filteredMovies.length} result{filteredMovies.length !== 1 ? 's' : ''} found
            </p>
            <div className="space-y-3">
              {filteredMovies.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  className="flex gap-3 w-full p-3 bg-white/5 rounded-xl hover:bg-white/10 transition-colors group"
                >
                  <div className="relative w-20 aspect-[2/3] rounded-lg overflow-hidden flex-shrink-0">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    {movie.ottPlatforms && movie.ottPlatforms.length > 0 && (
                      <div className="absolute bottom-1 right-1">
                        {movie.ottPlatforms.slice(0, 1).map((platformId) => {
                          const platform = ottPlatforms.find((p) => p.id === platformId);
                          return (
                            <div
                              key={platformId}
                              className="w-5 h-5 rounded flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: platform?.color }}
                            >
                              {platform?.logo}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <h3 className="font-semibold text-white group-hover:text-red-500 transition-colors line-clamp-1">
                      {movie.title}
                    </h3>
                    <div className="flex items-center gap-2 mb-2">
                      {movie.releaseType === 'theatrical' && (
                        <span className="px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded">
                          Theaters
                        </span>
                      )}
                      {movie.releaseType === 'ott' && (
                        <span className="px-2 py-0.5 bg-purple-600 text-white text-xs font-bold rounded">
                          Streaming
                        </span>
                      )}
                      {movie.releaseType === 'upcoming' && (
                        <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-bold rounded">
                          Soon
                        </span>
                      )}
                      {movie.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          <span className="text-xs text-white/60">{movie.rating}</span>
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-white/50 line-clamp-1">
                      {movie.director} • {movie.genres.join(', ')}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          // No Results
          <div className="text-center py-16">
            <SearchIcon className="w-12 h-12 text-white/20 mx-auto mb-3" />
            <p className="text-white/60">No results found</p>
            <p className="text-sm text-white/40 mt-1">Try searching with different keywords</p>
          </div>
        )}
      </div>
    </div>
  );
}
