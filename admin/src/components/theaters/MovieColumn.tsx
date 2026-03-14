'use client';
import { Loader2 } from 'lucide-react';
import { MovieListItem } from '@/components/theaters/MovieListItem';
import type { Movie } from '@/lib/types';

// @contract Renders a single column (In Theaters or Upcoming) with loading/empty/list states
export interface MovieColumnProps {
  title: string;
  movies: Movie[];
  isLoading: boolean;
  emptyText: string;
  isEffectivelyOn: (movieId: string) => boolean;
  getPendingDate: (movieId: string) => string | undefined;
  onToggle: (movie: Movie, defaultDate: string) => void;
  onRevert: (movieId: string) => void;
  onDateChange: (movieId: string, date: string) => void;
  dateLabel: string;
  maxDate?: string;
  minDate?: string;
  getSubtitle?: (movie: Movie) => string | undefined;
}

export function MovieColumn({
  title,
  movies,
  isLoading,
  emptyText,
  isEffectivelyOn,
  getPendingDate,
  onToggle,
  onRevert,
  onDateChange,
  dateLabel,
  maxDate,
  minDate,
  getSubtitle,
}: MovieColumnProps) {
  return (
    <section>
      <h2 className="text-lg font-semibold text-on-surface mb-3">
        {title}
        {!isLoading && (
          <span className="ml-2 text-sm font-normal text-on-surface-muted">({movies.length})</span>
        )}
      </h2>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
        </div>
      ) : movies.length === 0 ? (
        <div className="bg-surface-card border border-outline rounded-xl p-8 text-center text-on-surface-subtle text-sm">
          {emptyText}
        </div>
      ) : (
        <div className="bg-surface-card border border-outline rounded-xl p-1.5 space-y-0.5 ">
          {movies.map((movie) => (
            <MovieListItem
              key={movie.id}
              id={movie.id}
              title={movie.title}
              posterUrl={movie.poster_url}
              releaseDate={movie.release_date}
              isOn={isEffectivelyOn(movie.id)}
              pendingDate={getPendingDate(movie.id)}
              onToggle={(d) => onToggle(movie, d)}
              onRevert={() => onRevert(movie.id)}
              onDateChange={(d) => onDateChange(movie.id, d)}
              dateLabel={dateLabel}
              maxDate={maxDate}
              minDate={minDate}
              subtitle={getSubtitle?.(movie)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
