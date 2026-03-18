'use client';
import { Search, X } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';
import { GENRES, LANGUAGE_OPTIONS, CERTIFICATION_OPTIONS } from '@/lib/movie-constants';
import type { MovieFilters } from '@/hooks/useMovieFilters';

// @contract Props for the advanced filters panel — state owned by useMovieFilters in parent
export interface AdvancedFiltersPanelProps {
  filters: MovieFilters;
  setFilter: <K extends keyof MovieFilters>(key: K, value: MovieFilters[K]) => void;
  toggleGenre: (genre: string) => void;
  clearAll: () => void;
  hasActiveFilters: boolean;
}

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const RATING_OPTIONS = [
  { value: '1', label: '1+ ★' },
  { value: '2', label: '2+ ★' },
  { value: '3', label: '3+ ★' },
  { value: '4', label: '4+ ★' },
  { value: '5', label: '5+ ★' },
];

// @edge Year range: 2020 to current year + 2 (for announced movies with future dates)
function getYearOptions() {
  const currentYear = new Date().getFullYear();
  const years: { value: string; label: string }[] = [];
  for (let y = currentYear + 2; y >= 2020; y--) {
    years.push({ value: String(y), label: String(y) });
  }
  return years;
}

const selectClasses =
  'bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600 w-full';
const inputClasses =
  'w-full bg-input rounded-lg pl-9 pr-3 py-2 text-sm text-on-surface placeholder:text-on-surface-subtle outline-none focus:ring-2 focus:ring-red-600';

// @contract Collapsible panel with filter grid — mounted only when filters are open
export function AdvancedFiltersPanel({
  filters,
  setFilter,
  toggleGenre,
  clearAll,
  hasActiveFilters,
}: AdvancedFiltersPanelProps) {
  const { data: platforms } = useAdminPlatforms();
  const yearOptions = getYearOptions();

  return (
    <div className="bg-surface-card border border-outline rounded-xl p-4 space-y-4">
      {/* Text search filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">Actor / Cast</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
            <input
              type="text"
              placeholder="Search by actor name..."
              value={filters.actorSearch}
              onChange={(e) => setFilter('actorSearch', e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">Director</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-subtle" />
            <input
              type="text"
              placeholder="Search by director name..."
              value={filters.directorSearch}
              onChange={(e) => setFilter('directorSearch', e.target.value)}
              className={inputClasses}
            />
          </div>
        </div>
      </div>

      {/* Dropdown filters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">Release Year</label>
          <select
            value={filters.releaseYear}
            onChange={(e) => setFilter('releaseYear', e.target.value)}
            className={selectClasses}
          >
            <option value="">All Years</option>
            {yearOptions.map((y) => (
              <option key={y.value} value={y.value}>
                {y.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="filter-release-month"
            className="block text-xs text-on-surface-muted mb-1"
          >
            Release Month
          </label>
          <select
            id="filter-release-month"
            value={filters.releaseMonth}
            onChange={(e) => setFilter('releaseMonth', e.target.value)}
            disabled={!filters.releaseYear}
            className={`${selectClasses}${!filters.releaseYear ? ' opacity-50 cursor-not-allowed' : ''}`}
          >
            <option value="">All Months</option>
            {MONTHS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">Certification</label>
          <select
            value={filters.certification}
            onChange={(e) => setFilter('certification', e.target.value)}
            className={selectClasses}
          >
            {CERTIFICATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value ? o.label : 'All Certifications'}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">Language</label>
          <select
            value={filters.language}
            onChange={(e) => setFilter('language', e.target.value)}
            className={selectClasses}
          >
            {LANGUAGE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.value ? o.label : 'All Languages'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Platform + Rating + Featured */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">OTT Platform</label>
          <select
            value={filters.platformId}
            onChange={(e) => setFilter('platformId', e.target.value)}
            className={selectClasses}
          >
            <option value="">All Platforms</option>
            {(platforms ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-on-surface-muted mb-1">Min Rating</label>
          <select
            value={filters.minRating}
            onChange={(e) => setFilter('minRating', e.target.value)}
            className={selectClasses}
          >
            <option value="">Any Rating</option>
            {RATING_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 bg-input rounded-lg px-3 py-2 cursor-pointer w-full">
            <input
              type="checkbox"
              checked={filters.isFeatured}
              onChange={(e) => setFilter('isFeatured', e.target.checked)}
              className="w-4 h-4 rounded accent-red-600"
            />
            <span className="text-sm text-on-surface">Featured only</span>
          </label>
        </div>
      </div>

      {/* Genre pills */}
      <div>
        <label className="block text-xs text-on-surface-muted mb-1">Genres</label>
        <div className="flex flex-wrap gap-1.5">
          {GENRES.map((genre) => (
            <Button
              key={genre}
              type="button"
              variant={filters.genres.includes(genre) ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => toggleGenre(genre)}
              className={filters.genres.includes(genre) ? '' : 'hover:bg-input-active'}
            >
              {genre}
            </Button>
          ))}
        </div>
      </div>

      {/* Clear all */}
      {hasActiveFilters && (
        <div className="flex justify-end">
          <button
            onClick={clearAll}
            className="flex items-center gap-1 text-xs text-on-surface-subtle hover:text-status-red transition-colors"
          >
            <X className="w-3 h-3" />
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
}
