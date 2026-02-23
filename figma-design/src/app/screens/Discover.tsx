import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { Filter, Star, Calendar, X, SlidersHorizontal, ChevronDown, Search } from 'lucide-react';
import { movies, ottPlatforms } from '../data/movies';

type SortOption = 'popular' | 'latest' | 'rating' | 'upcoming';

export function Discover() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const filterFromUrl = searchParams.get('filter') as
    | 'all'
    | 'theatrical'
    | 'ott'
    | 'upcoming'
    | null;
  const platformFromUrl = searchParams.get('platform');

  const [selectedFilter, setSelectedFilter] = useState<'all' | 'theatrical' | 'ott' | 'upcoming'>(
    filterFromUrl || 'all',
  );
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(platformFromUrl || null);
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showSortDropdown, setShowSortDropdown] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Update filter when URL changes
  useEffect(() => {
    if (filterFromUrl && filterFromUrl !== selectedFilter) {
      setSelectedFilter(filterFromUrl);
    }
    if (platformFromUrl && platformFromUrl !== selectedPlatform) {
      setSelectedPlatform(platformFromUrl);
      if (!filterFromUrl) {
        setSelectedFilter('ott');
      }
    }
  }, [filterFromUrl, platformFromUrl]);

  const genres = Array.from(new Set(movies.flatMap((m) => m.genres)));

  let filteredMovies = movies;

  if (selectedFilter !== 'all') {
    filteredMovies = filteredMovies.filter((m) => m.releaseType === selectedFilter);
  }

  if (selectedGenre) {
    filteredMovies = filteredMovies.filter((m) => m.genres.includes(selectedGenre));
  }

  if (selectedPlatform) {
    filteredMovies = filteredMovies.filter((m) => m.ottPlatforms?.includes(selectedPlatform));
  }

  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredMovies = filteredMovies.filter(
      (m) =>
        m.title.toLowerCase().includes(query) ||
        m.genres.some((g) => g && typeof g === 'string' && g.toLowerCase().includes(query)) ||
        (m.director && m.director.toLowerCase().includes(query)) ||
        m.cast.some((c) => c && typeof c === 'string' && c.toLowerCase().includes(query)),
    );
  }

  // Sort movies
  const sortedMovies = [...filteredMovies].sort((a, b) => {
    switch (sortBy) {
      case 'rating':
        return b.rating - a.rating;
      case 'latest':
        return new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime();
      case 'upcoming':
        return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
      case 'popular':
      default:
        return b.rating - a.rating;
    }
  });

  const activeFilterCount = [selectedGenre, selectedPlatform].filter(Boolean).length;

  const clearAllFilters = () => {
    setSelectedGenre(null);
    setSelectedPlatform(null);
  };

  return (
    <div className="min-h-screen bg-black pb-20">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black via-black to-black/95 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3">
          <h1 className="text-3xl font-bold text-white mb-4">Discover</h1>

          {/* Search Input */}
          <div className="relative mb-3">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search movies, genres, actors..."
              autoFocus
              className="w-full pl-12 pr-10 py-3 bg-white/10 text-white placeholder-white/40 rounded-full border border-white/10 focus:border-white/30 focus:bg-white/15 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-white/60" />
              </button>
            )}
          </div>

          {/* Release Type Tabs */}
          <div className="grid grid-cols-4 gap-2 mb-3">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedFilter === 'all'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setSelectedFilter('theatrical')}
              className={`py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedFilter === 'theatrical'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              Theaters
            </button>
            <button
              onClick={() => setSelectedFilter('ott')}
              className={`py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedFilter === 'ott'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              Streaming
            </button>
            <button
              onClick={() => setSelectedFilter('upcoming')}
              className={`py-2.5 rounded-xl font-semibold text-sm transition-all ${
                selectedFilter === 'upcoming'
                  ? 'bg-red-600 text-white shadow-lg shadow-red-600/50'
                  : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/70'
              }`}
            >
              Soon
            </button>
          </div>

          {/* Filter & Sort Bar */}
          <div className="flex gap-2">
            <button
              onClick={() => setShowFilterModal(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 text-white/90 hover:bg-white/15 transition-colors"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </span>
            </button>
            <div className="relative">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center gap-2 py-2.5 px-4 rounded-xl bg-white/10 text-white/90 hover:bg-white/15 transition-colors"
              >
                <span className="text-sm font-medium capitalize">{sortBy}</span>
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${showSortDropdown ? 'rotate-180' : ''}`}
                />
              </button>

              {/* Sort Dropdown */}
              {showSortDropdown && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-zinc-900 rounded-lg border border-white/10 shadow-xl z-50">
                  <button
                    onClick={() => {
                      setSortBy('popular');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors border-b border-white/5 ${
                      sortBy === 'popular'
                        ? 'bg-red-600 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    🔥 Popular
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
                    ⭐ Top Rated
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('latest');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors border-b border-white/5 ${
                      sortBy === 'latest'
                        ? 'bg-red-600 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    🆕 Latest
                  </button>
                  <button
                    onClick={() => {
                      setSortBy('upcoming');
                      setShowSortDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors ${
                      sortBy === 'upcoming'
                        ? 'bg-red-600 text-white'
                        : 'text-white/60 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    📅 Upcoming
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4">
        {/* Active Filters Pills */}
        {(selectedGenre || selectedPlatform) && (
          <div className="flex items-center gap-2 py-4 overflow-x-auto scrollbar-hide">
            {selectedGenre && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-white text-sm">
                <span>{selectedGenre}</span>
                <button
                  onClick={() => setSelectedGenre(null)}
                  className="hover:text-red-500 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            {selectedPlatform && (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-white text-sm font-medium"
                style={{
                  backgroundColor: ottPlatforms.find((p) => p.id === selectedPlatform)?.color,
                }}
              >
                <span className="font-bold">
                  {ottPlatforms.find((p) => p.id === selectedPlatform)?.logo}
                </span>
                <span>{ottPlatforms.find((p) => p.id === selectedPlatform)?.name}</span>
                <button
                  onClick={() => setSelectedPlatform(null)}
                  className="hover:opacity-70 transition-opacity"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              onClick={clearAllFilters}
              className="text-sm text-red-500 hover:text-red-400 whitespace-nowrap"
            >
              Clear All
            </button>
          </div>
        )}

        {/* Results Count */}
        <div className="py-3">
          <p className="text-white/40 text-sm">
            {sortedMovies.length} {sortedMovies.length === 1 ? 'movie' : 'movies'}
          </p>
        </div>

        {/* Movie Grid */}
        {sortedMovies.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 pb-4">
            {sortedMovies.map((movie) => (
              <button
                key={movie.id}
                onClick={() => navigate(`/movie/${movie.id}`)}
                className="group"
              >
                <div className="relative aspect-[2/3] rounded-2xl overflow-hidden mb-2.5 bg-white/5">
                  <img
                    src={movie.poster}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                  {/* Status Badge */}
                  <div className="absolute top-2.5 left-2.5">
                    {movie.releaseType === 'theatrical' && (
                      <span className="px-2.5 py-1 bg-red-600 text-white text-xs font-bold rounded-lg shadow-lg">
                        In Theaters
                      </span>
                    )}
                    {movie.releaseType === 'ott' && (
                      <span className="px-2.5 py-1 bg-purple-600 text-white text-xs font-bold rounded-lg shadow-lg">
                        Streaming
                      </span>
                    )}
                    {movie.releaseType === 'upcoming' && (
                      <span className="px-2.5 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg shadow-lg">
                        Coming Soon
                      </span>
                    )}
                  </div>

                  {/* OTT Platforms */}
                  {movie.ottPlatforms && movie.ottPlatforms.length > 0 && (
                    <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                      {movie.ottPlatforms.slice(0, 2).map((platformId) => {
                        const platform = ottPlatforms.find((p) => p.id === platformId);
                        return (
                          <div
                            key={platformId}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white shadow-lg"
                            style={{ backgroundColor: platform?.color }}
                          >
                            {platform?.logo}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Bottom Info */}
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    {movie.rating > 0 && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="text-sm font-bold text-white">{movie.rating}</span>
                      </div>
                    )}
                    {movie.releaseType === 'upcoming' && (
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-white/70" />
                        <span className="text-xs text-white/70 font-medium">
                          {new Date(movie.releaseDate).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                <h3 className="font-semibold text-white text-sm line-clamp-2 text-left group-hover:text-red-500 transition-colors">
                  {movie.title}
                </h3>
              </button>
            ))}
          </div>
        ) : (
          <div className="text-center py-24">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Filter className="w-10 h-10 text-white/20" />
            </div>
            <p className="text-white/60 text-lg font-medium mb-1">No movies found</p>
            <p className="text-sm text-white/40">Try adjusting your filters</p>
          </div>
        )}
      </div>

      {/* Full-Screen Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 bg-black animate-in fade-in duration-200">
          <div className="h-full overflow-y-auto">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-gradient-to-b from-black to-black/95 backdrop-blur-xl border-b border-white/10">
              <div className="max-w-md mx-auto px-4 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-white">Filters</h2>
                  <button
                    onClick={() => setShowFilterModal(false)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>
            </div>

            <div className="max-w-md mx-auto px-4 py-6 space-y-8">
              {/* Platforms Section */}
              {(selectedFilter === 'all' || selectedFilter === 'ott') && (
                <section>
                  <h3 className="text-xs font-bold text-white/50 tracking-wider mb-4">
                    STREAMING PLATFORMS
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {ottPlatforms.map((platform) => (
                      <button
                        key={platform.id}
                        onClick={() =>
                          setSelectedPlatform(selectedPlatform === platform.id ? null : platform.id)
                        }
                        className={`relative p-6 rounded-2xl transition-all overflow-hidden ${
                          selectedPlatform === platform.id
                            ? 'ring-4 ring-white/30 shadow-2xl'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: platform.color,
                        }}
                      >
                        <div className="relative z-10">
                          <div className="text-4xl mb-2">{platform.logo}</div>
                          <div className="font-bold text-white text-sm">{platform.name}</div>
                        </div>
                        {selectedPlatform === platform.id && (
                          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white flex items-center justify-center">
                            <div className="w-3 h-3 rounded-full bg-green-500"></div>
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </section>
              )}

              {/* Genres Section */}
              <section>
                <h3 className="text-xs font-bold text-white/50 tracking-wider mb-4">GENRES</h3>
                <div className="flex flex-wrap gap-2.5">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                      className={`px-5 py-2.5 rounded-full font-medium text-sm transition-all ${
                        selectedGenre === genre
                          ? 'bg-white text-black shadow-lg shadow-white/20'
                          : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </section>
            </div>

            {/* Bottom Actions */}
            <div className="sticky bottom-0 bg-gradient-to-t from-black via-black to-black/95 backdrop-blur-xl border-t border-white/10">
              <div className="max-w-md mx-auto px-4 py-4 flex gap-3">
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="flex-1 py-3.5 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/15 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
                <button
                  onClick={() => setShowFilterModal(false)}
                  className={`py-3.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors shadow-lg shadow-red-600/30 ${
                    activeFilterCount > 0 ? 'flex-1' : 'w-full'
                  }`}
                >
                  Show {sortedMovies.length} {sortedMovies.length === 1 ? 'Movie' : 'Movies'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
