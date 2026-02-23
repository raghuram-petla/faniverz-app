import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { ChevronDown, Filter, X } from 'lucide-react';
import { movies, ottPlatforms } from '../data/movies';

export function Calendar() {
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [showYearPicker, setShowYearPicker] = useState(false);

  // Get all movies sorted by release date
  const allMovies = [...movies].sort(
    (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Filter movies based on selected filters
  const filteredMovies = allMovies.filter((movie) => {
    const movieDate = new Date(movie.releaseDate);

    if (selectedYear && movieDate.getFullYear() !== selectedYear) return false;
    if (selectedMonth !== null && movieDate.getMonth() !== selectedMonth) return false;
    if (selectedDay !== null && movieDate.getDate() !== selectedDay) return false;

    return true;
  });

  // Find the index of the first upcoming movie
  const upcomingIndex = filteredMovies.findIndex((movie) => new Date(movie.releaseDate) >= today);

  // Scroll to upcoming movies on mount
  useEffect(() => {
    if (
      scrollRef.current &&
      upcomingIndex !== -1 &&
      !selectedYear &&
      !selectedMonth &&
      selectedDay === null
    ) {
      const upcomingElement = scrollRef.current.querySelector(`[data-index="${upcomingIndex}"]`);
      if (upcomingElement) {
        upcomingElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  }, [upcomingIndex, selectedYear, selectedMonth, selectedDay]);

  // Get unique years from all movies
  const years = Array.from(
    new Set(allMovies.map((m) => new Date(m.releaseDate).getFullYear())),
  ).sort((a, b) => b - a);

  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  const clearFilters = () => {
    setSelectedYear(null);
    setSelectedMonth(null);
    setSelectedDay(null);
  };

  const hasActiveFilters = selectedYear !== null || selectedMonth !== null || selectedDay !== null;

  // Group movies by date
  const groupedMovies = filteredMovies.reduce(
    (acc, movie) => {
      const date = new Date(movie.releaseDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(movie);
      return acc;
    },
    {} as Record<string, typeof movies>,
  );

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-black to-black/95 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-white">Release Calendar</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors relative"
              >
                <Filter className="w-5 h-5 text-white" />
                {hasActiveFilters && (
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full" />
                )}
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {selectedYear && (
                <span className="px-3 py-1 bg-red-600/20 text-red-400 text-sm rounded-full flex items-center gap-1">
                  {selectedYear}
                  <button onClick={() => setSelectedYear(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedMonth !== null && (
                <span className="px-3 py-1 bg-red-600/20 text-red-400 text-sm rounded-full flex items-center gap-1">
                  {months[selectedMonth]}
                  <button onClick={() => setSelectedMonth(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedDay !== null && (
                <span className="px-3 py-1 bg-red-600/20 text-red-400 text-sm rounded-full flex items-center gap-1">
                  Day {selectedDay}
                  <button onClick={() => setSelectedDay(null)}>
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearFilters}
                className="text-xs text-red-500 hover:text-red-400 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="bg-zinc-900/95 border-t border-white/5">
            <div className="max-w-md mx-auto px-4 py-4 space-y-4">
              {/* Year Filter */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Year</label>
                <button
                  onClick={() => setShowYearPicker(!showYearPicker)}
                  className={`w-full px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between transition-colors ${
                    selectedYear !== null
                      ? 'bg-red-600 text-white'
                      : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span>{selectedYear || 'All Years'}</span>
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${showYearPicker ? 'rotate-180' : ''}`}
                  />
                </button>

                {/* Year Picker Dropdown */}
                {showYearPicker && (
                  <div className="mt-2 bg-zinc-800 rounded-lg border border-white/10 max-h-64 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedYear(null);
                        setShowYearPicker(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors border-b border-white/5 ${
                        selectedYear === null
                          ? 'bg-red-600 text-white'
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      All Years
                    </button>
                    {years.map((year) => (
                      <button
                        key={year}
                        onClick={() => {
                          setSelectedYear(year);
                          setShowYearPicker(false);
                        }}
                        className={`w-full px-4 py-3 text-left text-sm font-medium transition-colors border-b border-white/5 last:border-b-0 ${
                          selectedYear === year
                            ? 'bg-red-600 text-white'
                            : 'text-white/60 hover:bg-white/5 hover:text-white'
                        }`}
                      >
                        {year}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Month Filter */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Month</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setSelectedMonth(null)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      selectedMonth === null
                        ? 'bg-red-600 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    All Months
                  </button>
                  {months.map((month, index) => (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(index)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        selectedMonth === index
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {month.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Day Filter */}
              <div>
                <label className="text-sm text-white/60 mb-2 block">Day</label>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <button
                    onClick={() => setSelectedDay(null)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                      selectedDay === null
                        ? 'bg-red-600 text-white'
                        : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    All Days
                  </button>
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(day)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                        selectedDay === day
                          ? 'bg-red-600 text-white'
                          : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {day}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Calendar List */}
      <div ref={scrollRef} className="max-w-md mx-auto px-4 py-6 pb-32 space-y-6">
        {Object.entries(groupedMovies).length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/60">No releases found for the selected filters.</p>
            <button
              onClick={clearFilters}
              className="mt-4 text-red-500 hover:text-red-400 underline"
            >
              Clear filters
            </button>
          </div>
        ) : (
          Object.entries(groupedMovies).map(([date, dateMovies], groupIndex) => {
            const movieDate = new Date(dateMovies[0].releaseDate);
            const isPast = movieDate < today;
            const isToday = movieDate.toDateString() === today.toDateString();

            return (
              <div
                key={date}
                data-index={filteredMovies.indexOf(dateMovies[0])}
                className="space-y-3"
              >
                {/* Date Header */}
                <div className="sticky top-[72px] z-30 bg-black/95 backdrop-blur-lg py-2 -mx-4 px-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex-shrink-0 w-16 h-16 rounded-xl flex flex-col items-center justify-center ${
                        isToday
                          ? 'bg-red-600'
                          : isPast
                            ? 'bg-white/5'
                            : 'bg-purple-600/20 border border-purple-600/30'
                      }`}
                    >
                      <div
                        className={`text-xs font-bold ${
                          isToday ? 'text-white' : isPast ? 'text-white/40' : 'text-purple-400'
                        }`}
                      >
                        {movieDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase()}
                      </div>
                      <div
                        className={`text-2xl font-bold ${
                          isToday ? 'text-white' : isPast ? 'text-white/40' : 'text-white'
                        }`}
                      >
                        {movieDate.getDate()}
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3
                        className={`text-lg font-bold ${
                          isToday ? 'text-red-500' : isPast ? 'text-white/40' : 'text-white'
                        }`}
                      >
                        {movieDate.toLocaleDateString('en-US', { weekday: 'long' })}
                      </h3>
                      <p className={`text-sm ${isPast ? 'text-white/30' : 'text-white/60'}`}>
                        {movieDate.toLocaleDateString('en-US', {
                          month: 'long',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </p>
                      {isToday && (
                        <span className="inline-block mt-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                          TODAY
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-sm font-semibold ${
                        isPast ? 'text-white/30' : 'text-white/50'
                      }`}
                    >
                      {dateMovies.length} {dateMovies.length === 1 ? 'release' : 'releases'}
                    </div>
                  </div>
                </div>

                {/* Movies for this date */}
                <div className="space-y-3">
                  {dateMovies.map((movie) => (
                    <button
                      key={movie.id}
                      onClick={() => navigate(`/movie/${movie.id}`)}
                      className={`w-full flex gap-3 p-4 rounded-xl border transition-all group ${
                        isPast
                          ? 'bg-zinc-900/50 border-white/5 hover:bg-zinc-900/70 hover:border-white/10'
                          : 'bg-zinc-900 border-white/10 hover:bg-zinc-800 hover:border-white/20 shadow-lg shadow-black/20'
                      }`}
                    >
                      {/* Poster */}
                      <div className="relative flex-shrink-0 w-24 aspect-[2/3] rounded-lg overflow-hidden shadow-lg">
                        <img
                          src={movie.poster}
                          alt={movie.title}
                          className={`w-full h-full object-cover transition-transform group-hover:scale-105 ${
                            isPast ? 'opacity-70' : ''
                          }`}
                        />
                        {movie.releaseType === 'theatrical' && (
                          <div className="absolute top-1.5 left-1.5">
                            <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded shadow-lg">
                              Theater
                            </span>
                          </div>
                        )}
                        {movie.releaseType === 'ott' &&
                          movie.ottPlatforms &&
                          movie.ottPlatforms.length > 0 && (
                            <div className="absolute top-1.5 right-1.5">
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white shadow-lg"
                                style={{
                                  backgroundColor: ottPlatforms.find(
                                    (p) => p.id === movie.ottPlatforms![0],
                                  )?.color,
                                }}
                              >
                                {ottPlatforms.find((p) => p.id === movie.ottPlatforms![0])?.logo}
                              </div>
                            </div>
                          )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 text-left">
                        <h4
                          className={`font-bold text-base line-clamp-2 mb-2 group-hover:text-red-500 transition-colors ${
                            isPast ? 'text-white/70' : 'text-white'
                          }`}
                        >
                          {movie.title}
                        </h4>

                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {movie.genres.slice(0, 2).map((genre) => (
                            <span
                              key={genre}
                              className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                                isPast ? 'bg-white/10 text-white/50' : 'bg-white/15 text-white/70'
                              }`}
                            >
                              {genre}
                            </span>
                          ))}
                        </div>

                        {/* OTT Platforms */}
                        {movie.ottPlatforms && movie.ottPlatforms.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {movie.ottPlatforms.map((platformId) => {
                              const platform = ottPlatforms.find((p) => p.id === platformId);
                              return (
                                <div
                                  key={platformId}
                                  className={`px-2.5 py-1 rounded-md text-xs font-bold text-white shadow-sm ${
                                    isPast ? 'opacity-60' : ''
                                  }`}
                                  style={{ backgroundColor: platform?.color }}
                                >
                                  {platform?.name}
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Rating - only for past/released movies */}
                        {(movie.releaseType === 'theatrical' || movie.releaseType === 'ott') &&
                          movie.rating > 0 && (
                            <div
                              className={`flex items-center gap-1.5 mt-2 ${
                                isPast ? 'opacity-60' : ''
                              }`}
                            >
                              <span className="text-yellow-400 text-sm">★</span>
                              <span className="text-sm font-semibold text-white/80">
                                {movie.rating}
                              </span>
                              <span className="text-xs text-white/50">/ 5</span>
                            </div>
                          )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
