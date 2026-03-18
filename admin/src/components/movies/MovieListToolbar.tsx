'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Plus, SlidersHorizontal } from 'lucide-react';
import { SearchInput } from '@/components/common/SearchInput';
import { AdvancedFiltersPanel } from '@/components/movies/AdvancedFiltersPanel';
import type { MovieFilters } from '@/hooks/useMovieFilters';

// @contract Toolbar above the movies table — search, status, filters toggle, add button
export interface MovieListToolbarProps {
  search: string;
  setSearch: (v: string) => void;
  statusFilter: string;
  setStatusFilter: (v: string) => void;
  filters: MovieFilters;
  setFilter: <K extends keyof MovieFilters>(key: K, value: MovieFilters[K]) => void;
  toggleGenre: (genre: string) => void;
  clearAll: () => void;
  activeFilterCount: number;
  hasActiveFilters: boolean;
  isFetching: boolean;
  isReadOnly: boolean;
  movieCount: number;
  debouncedSearch: string;
}

export function MovieListToolbar({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  filters,
  setFilter,
  toggleGenre,
  clearAll,
  activeFilterCount,
  hasActiveFilters,
  isFetching,
  isReadOnly,
  movieCount,
  debouncedSearch,
}: MovieListToolbarProps) {
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex gap-3 items-center">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search movies..."
          isLoading={isFetching}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-input rounded-lg px-3 py-2 text-sm text-on-surface outline-none focus:ring-2 focus:ring-red-600"
        >
          <option value="">All Status</option>
          <option value="announced">Announced</option>
          <option value="upcoming">Upcoming</option>
          <option value="in_theaters">In Theaters</option>
          <option value="streaming">Streaming</option>
          <option value="released">Released</option>
        </select>
        {/* @contract Filter toggle button with active count badge */}
        <button
          onClick={() => setIsFiltersOpen((prev) => !prev)}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isFiltersOpen || hasActiveFilters
              ? 'bg-red-600/20 text-status-red'
              : 'bg-input text-on-surface-muted hover:text-on-surface'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
        {!isReadOnly && (
          <Link
            href="/movies/new"
            className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 ml-auto shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Movie
          </Link>
        )}
      </div>

      {/* Advanced filters panel */}
      {isFiltersOpen && (
        <AdvancedFiltersPanel
          filters={filters}
          setFilter={setFilter}
          toggleGenre={toggleGenre}
          clearAll={clearAll}
          hasActiveFilters={hasActiveFilters}
        />
      )}

      {search.length === 1 && (
        <p className="text-xs text-on-surface-subtle">Type at least 2 characters to search</p>
      )}
      {movieCount > 0 && (
        <p className="text-xs text-on-surface-subtle">
          Showing {movieCount} movie{movieCount !== 1 ? 's' : ''}
          {debouncedSearch ? ` matching "${debouncedSearch}"` : ''}
          {statusFilter ? ` (${statusFilter})` : ''}
          {activeFilterCount > 0
            ? ` with ${activeFilterCount} filter${activeFilterCount !== 1 ? 's' : ''}`
            : ''}
        </p>
      )}
    </div>
  );
}
