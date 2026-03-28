'use client';

import { Film, CheckCircle, AlertTriangle, Ban, Loader2, Link2 } from 'lucide-react';
import type { DuplicateSuspect } from '@/hooks/useSync';

/** @contract Props for a single TMDB movie card in search results */
export interface MovieSearchCardProps {
  movie: {
    id: number;
    title: string;
    poster_path: string | null;
    release_date: string;
    original_language?: string;
  };
  exists: boolean;
  isSelected: boolean;
  isImporting: boolean;
  languageBlocked: boolean;
  suspect?: DuplicateSuspect;
  linkingTmdbId: number | null;
  langName: (code: string | null | undefined) => string | null;
  onToggleSelect: (id: number) => void;
  onLinkDuplicate: (tmdbId: number, suspect: DuplicateSuspect) => void;
  /** @contract: when true, selection and link buttons are disabled — viewer role */
  isReadOnly?: boolean;
}

/** @contract Single movie card with import/duplicate/language badges */
export function MovieSearchCard({
  movie,
  exists,
  isSelected,
  isImporting,
  languageBlocked,
  suspect,
  linkingTmdbId,
  langName,
  onToggleSelect,
  onLinkDuplicate,
  isReadOnly,
}: MovieSearchCardProps) {
  return (
    <div>
      <button
        disabled={exists || isImporting || languageBlocked || (!!suspect && !exists) || isReadOnly}
        onClick={() => !suspect && !languageBlocked && !isReadOnly && onToggleSelect(movie.id)}
        className={`relative w-full bg-black rounded-xl overflow-hidden text-left transition-all ${
          languageBlocked && !exists
            ? 'opacity-50 cursor-default ring-1 ring-outline'
            : suspect && !exists
              ? 'ring-2 ring-yellow-500'
              : exists
                ? 'opacity-60 cursor-default'
                : isSelected
                  ? 'ring-2 ring-red-600'
                  : 'ring-1 ring-outline hover:ring-on-surface-subtle'
        } disabled:cursor-default`}
      >
        {movie.poster_path ? (
          <img
            src={`https://image.tmdb.org/t/p/w200${movie.poster_path}`}
            alt={movie.title}
            className="block w-full aspect-[2/3] object-cover rounded-t-xl"
            loading="lazy"
          />
        ) : (
          <div className="aspect-[2/3] bg-surface-muted flex items-center justify-center rounded-t-xl">
            <Film className="w-8 h-8 text-on-surface-disabled" />
          </div>
        )}
        <div className="p-1.5">
          <p className="text-xs font-medium text-on-surface truncate">{movie.title}</p>
          <p className="text-[10px] text-on-surface-subtle mt-0.5">
            {movie.release_date || 'No date'}
            {movie.original_language && (
              <span className="ml-1.5 text-on-surface-muted">
                · {/* v8 ignore start */}
                {langName(movie.original_language) ?? movie.original_language}
                {/* v8 ignore stop */}
              </span>
            )}
          </p>
        </div>
        {exists && (
          <div className="absolute top-2 right-2 bg-green-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <CheckCircle className="w-3 h-3" /> In DB
          </div>
        )}
        {suspect && !exists && (
          <div className="absolute top-2 right-2 bg-yellow-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <AlertTriangle className="w-3 h-3" /> Duplicate?
          </div>
        )}
        {isSelected && (
          <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full">
            Selected
          </div>
        )}
        {languageBlocked && !exists && (
          <div className="absolute top-2 right-2 bg-zinc-600 text-white text-[10px] font-medium px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
            <Ban className="w-3 h-3" /> Not your language
          </div>
        )}
      </button>
      {suspect && !exists && (
        <div className="mt-1 px-1 space-y-1">
          <p className="text-[10px] text-status-yellow">
            Matches &ldquo;{suspect.title}&rdquo; (no TMDB ID)
          </p>
          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <button
                onClick={() => onLinkDuplicate(movie.id, suspect)}
                disabled={linkingTmdbId === movie.id}
                className="text-[10px] bg-yellow-600 hover:bg-yellow-700 text-white px-2 py-0.5 rounded-full font-medium transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                {linkingTmdbId === movie.id ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Link2 className="w-3 h-3" />
                )}
                Link to TMDB
              </button>
            )}
            <a
              href={`/movies/${suspect.id}`}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] text-on-surface-subtle underline hover:text-yellow-300"
            >
              Edit instead
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
