import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { motion } from 'motion/react';
import { Search, Bell, Play, Info, Star, Calendar, Clock } from 'lucide-react';
import { movies, ottPlatforms } from '../data/movies';
import { Button } from '../components/ui/button';

export function Home() {
  const navigate = useNavigate();
  const [featuredIndex, setFeaturedIndex] = useState(0);

  const featuredMovies = movies
    .filter((m) => m.releaseType === 'theatrical' || m.releaseType === 'ott')
    .slice(0, 3);
  const upcomingMovies = movies.filter((m) => m.releaseType === 'upcoming');
  const upcomingTheatrical = upcomingMovies.filter(
    (m) => !m.ottPlatforms || m.ottPlatforms.length === 0,
  );
  const upcomingOTT = upcomingMovies.filter((m) => m.ottPlatforms && m.ottPlatforms.length > 0);
  const recentReleases = movies.filter((m) => m.releaseType === 'theatrical');
  const streamingNow = movies.filter((m) => m.releaseType === 'ott');

  useEffect(() => {
    const interval = setInterval(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredMovies.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [featuredMovies.length]);

  const featured = featuredMovies[featuredIndex];

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black via-black/80 to-transparent">
        <div className="max-w-md mx-auto px-4 pt-4 pb-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Faniverz</h1>
            <div className="flex gap-2">
              <button
                onClick={() => navigate('/discover')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Search className="w-5 h-5 text-white" />
              </button>
              <button
                onClick={() => navigate('/notifications')}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <Bell className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Movie Hero */}
      <div className="relative h-[600px] mt-16">
        <motion.div
          key={featuredIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="absolute inset-0"
        >
          {/* Background Image */}
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url(${featured.backdrop})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/40" />

          {/* Content */}
          <div className="absolute inset-0 flex flex-col justify-end pb-8 px-4 max-w-md mx-auto">
            <div className="space-y-4">
              {/* Movie Info */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  {featured.releaseType === 'theatrical' && (
                    <span className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded-full uppercase">
                      In Theaters
                    </span>
                  )}
                  {featured.releaseType === 'ott' && (
                    <span className="px-3 py-1 bg-purple-600 text-white text-xs font-bold rounded-full uppercase">
                      Streaming Now
                    </span>
                  )}
                  <div className="flex items-center gap-1 text-white/80">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm font-semibold">{featured.rating}</span>
                  </div>
                </div>
                <h2 className="text-4xl font-bold text-white mb-1">{featured.title}</h2>
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(featured.releaseDate).getFullYear()}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {featured.runtime}m
                  </span>
                  <span>•</span>
                  <span className="px-2 py-0.5 border border-white/30 rounded text-xs">
                    {featured.certification}
                  </span>
                </div>
              </div>

              {/* OTT Platforms if streaming */}
              {featured.ottPlatforms && featured.ottPlatforms.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white/60">Watch on:</span>
                  {featured.ottPlatforms.map((platformId) => {
                    const platform = ottPlatforms.find((p) => p.id === platformId);
                    return (
                      <div
                        key={platformId}
                        className="px-3 py-1.5 rounded-lg font-semibold text-sm text-white"
                        style={{ backgroundColor: platform?.color }}
                      >
                        {platform?.logo}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => navigate(`/movie/${featured.id}`)}
                  className="flex-1 h-12 bg-white text-black hover:bg-white/90 font-semibold rounded-full"
                >
                  <Play className="w-5 h-5 mr-2" />
                  Watch Now
                </Button>
                <Button
                  onClick={() => navigate(`/movie/${featured.id}`)}
                  variant="outline"
                  className="h-12 px-4 border-white/30 text-white hover:bg-white/10 rounded-full"
                >
                  <Info className="w-5 h-5" />
                </Button>
              </div>
            </div>

            {/* Pagination Dots */}
            <div className="flex justify-center gap-2 mt-6">
              {featuredMovies.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setFeaturedIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${
                    index === featuredIndex ? 'w-8 bg-white' : 'w-1.5 bg-white/30'
                  }`}
                />
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Content Sections */}
      <div className="px-4 pb-8 max-w-md mx-auto space-y-8">
        {/* In Theaters */}
        {recentReleases.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">In Theaters</h3>
              <button
                onClick={() => navigate('/discover?filter=theatrical')}
                className="text-sm text-red-500 hover:text-red-400"
              >
                See All
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {recentReleases.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  className="flex-shrink-0 w-32 group"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-2 left-2">
                      <span className="px-2 py-1 bg-red-600 text-white text-xs font-bold rounded">
                        In Theaters
                      </span>
                    </div>
                  </div>
                  <p className="text-sm font-medium text-white line-clamp-2">{movie.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-white/60">{movie.rating}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Streaming Now */}
        {streamingNow.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Streaming Now</h3>
              <button
                onClick={() => navigate('/discover?filter=ott')}
                className="text-sm text-red-500 hover:text-red-400"
              >
                See All
              </button>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {streamingNow.map((movie) => (
                <button
                  key={movie.id}
                  onClick={() => navigate(`/movie/${movie.id}`)}
                  className="flex-shrink-0 w-32 group"
                >
                  <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2">
                    <img
                      src={movie.poster}
                      alt={movie.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    {movie.ottPlatforms && movie.ottPlatforms.length > 0 && (
                      <div className="absolute top-2 right-2 flex gap-1">
                        {movie.ottPlatforms.slice(0, 2).map((platformId) => {
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
                  </div>
                  <p className="text-sm font-medium text-white line-clamp-2">{movie.title}</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-white/60">{movie.rating}</span>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        {/* Coming Soon */}
        {(upcomingTheatrical.length > 0 || upcomingOTT.length > 0) && (
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-bold text-white">Coming Soon</h3>
              <button
                onClick={() => navigate('/discover?filter=upcoming')}
                className="text-sm text-red-500 hover:text-red-400"
              >
                See All
              </button>
            </div>

            {/* Coming to Theaters */}
            {upcomingTheatrical.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white/90 mb-4">To Theaters</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {upcomingTheatrical.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => navigate(`/movie/${movie.id}`)}
                      className="flex-shrink-0 w-32 group"
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2">
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Release Date Badge */}
                        <div className="absolute top-2 left-2">
                          <div className="px-2 py-1 bg-red-600 rounded shadow-lg">
                            <div className="text-[10px] font-bold text-white leading-none">
                              {new Date(movie.releaseDate)
                                .toLocaleDateString('en-US', { month: 'short' })
                                .toUpperCase()}
                            </div>
                            <div className="text-sm font-bold text-white leading-none mt-0.5">
                              {new Date(movie.releaseDate).getDate()}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-sm font-medium text-white line-clamp-2">{movie.title}</p>
                      <p className="text-xs text-white/50 mt-1">
                        {new Date(movie.releaseDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Coming to Streaming */}
            {upcomingOTT.length > 0 && (
              <div>
                <h4 className="text-lg font-semibold text-white/90 mb-4">To Streaming</h4>
                <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                  {upcomingOTT.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => navigate(`/movie/${movie.id}`)}
                      className="flex-shrink-0 w-32 group"
                    >
                      <div className="relative aspect-[2/3] rounded-xl overflow-hidden mb-2">
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

                        {/* Release Date Badge */}
                        <div className="absolute top-2 left-2">
                          <div className="px-2 py-1 bg-purple-600 rounded shadow-lg">
                            <div className="text-[10px] font-bold text-white leading-none">
                              {new Date(movie.releaseDate)
                                .toLocaleDateString('en-US', { month: 'short' })
                                .toUpperCase()}
                            </div>
                            <div className="text-sm font-bold text-white leading-none mt-0.5">
                              {new Date(movie.releaseDate).getDate()}
                            </div>
                          </div>
                        </div>

                        {/* OTT Platforms */}
                        {movie.ottPlatforms && movie.ottPlatforms.length > 0 && (
                          <div className="absolute top-2 right-2 flex gap-1">
                            {movie.ottPlatforms.slice(0, 2).map((platformId) => {
                              const platform = ottPlatforms.find((p) => p.id === platformId);
                              return (
                                <div
                                  key={platformId}
                                  className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold text-white shadow-lg"
                                  style={{ backgroundColor: platform?.color }}
                                >
                                  {platform?.logo}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-medium text-white line-clamp-2">{movie.title}</p>
                      <p className="text-xs text-white/50 mt-1">
                        {new Date(movie.releaseDate).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>
        )}

        {/* Browse by OTT Platform */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Browse by Platform</h3>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {ottPlatforms.slice(0, 8).map((platform) => (
              <button
                key={platform.id}
                onClick={() => navigate(`/discover?platform=${platform.id}`)}
                className="aspect-square rounded-xl flex items-center justify-center text-2xl font-bold text-white hover:scale-105 transition-transform"
                style={{ backgroundColor: platform.color }}
              >
                {platform.logo}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
