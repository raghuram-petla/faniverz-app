'use client';
import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

/**
 * @contract Manages form state hydration from server data and dirty-tracking.
 * On first load, both form and initialForm are set from the movie.
 * On background refetches, only initialForm updates — unsaved edits are preserved.
 * @coupling useMovieEditState — orchestrator calls this to bridge server → form state.
 */

interface MovieFormSource {
  title: string;
  poster_url: string | null;
  backdrop_url: string | null;
  release_date: string | null;
  runtime: number | null;
  genres: string[] | null;
  certification: string | null;
  synopsis: string | null;
  in_theaters: boolean;
  premiere_date: string | null;
  original_language: string | null;
  is_featured: boolean;
  tmdb_id: number | null;
  tagline: string | null;
  backdrop_focus_x: number | null;
  backdrop_focus_y: number | null;
  poster_focus_x: number | null;
  poster_focus_y: number | null;
}

// @contract Converts nullable server fields to form-safe string/array/boolean values
function toFormState(movie: MovieFormSource): MovieForm {
  return {
    title: movie.title,
    poster_url: movie.poster_url ?? '',
    backdrop_url: movie.backdrop_url ?? '',
    release_date: movie.release_date ?? '',
    runtime: movie.runtime?.toString() ?? '',
    genres: movie.genres ?? [],
    certification: movie.certification ?? '',
    synopsis: movie.synopsis ?? '',
    in_theaters: movie.in_theaters,
    premiere_date: movie.premiere_date ?? '',
    original_language: movie.original_language ?? '',
    is_featured: movie.is_featured,
    tmdb_id: movie.tmdb_id?.toString() ?? '',
    tagline: movie.tagline ?? '',
    backdrop_focus_x: movie.backdrop_focus_x ?? null,
    backdrop_focus_y: movie.backdrop_focus_y ?? null,
    poster_focus_x: movie.poster_focus_x ?? null,
    poster_focus_y: movie.poster_focus_y ?? null,
  };
}

export interface UseMovieEditFormSyncResult {
  form: MovieForm;
  setForm: Dispatch<SetStateAction<MovieForm>>;
  initialForm: MovieForm | null;
  setInitialForm: Dispatch<SetStateAction<MovieForm | null>>;
  /** @contract Patches form + initialForm immediately AND resets isFirstLoadRef so
   * the next cache-invalidation refetch also overwrites both. */
  patchFormFields: (patch: Partial<MovieForm>) => void;
  isFirstLoadRef: React.RefObject<boolean>;
}

export function useMovieEditFormSync(
  id: string,
  movie: MovieFormSource | undefined | null,
): UseMovieEditFormSyncResult {
  const [form, setForm] = useState<MovieForm>({
    title: '',
    poster_url: '',
    backdrop_url: '',
    release_date: '',
    runtime: '',
    genres: [] as string[],
    certification: '' as string,
    synopsis: '',
    in_theaters: false,
    premiere_date: '',
    original_language: '',
    is_featured: false,
    tmdb_id: '',
    tagline: '',
    backdrop_focus_x: null,
    backdrop_focus_y: null,
    poster_focus_x: null,
    poster_focus_y: null,
  });
  const [initialForm, setInitialForm] = useState<MovieForm | null>(null);
  const isFirstLoadRef = useRef(true);

  // @edge Reset first-load flag when navigating between movies
  useEffect(() => {
    isFirstLoadRef.current = true;
  }, [id]);

  // @sideeffect Hydrates form from server data on first load
  useEffect(() => {
    if (movie) {
      const loaded = toFormState(movie);
      // Only overwrite form on first load; background refetches update initialForm only
      /* v8 ignore start */
      if (isFirstLoadRef.current) {
        /* v8 ignore stop */
        setForm(loaded);
        isFirstLoadRef.current = false;
      }
      setInitialForm(loaded);
    }
  }, [movie]);

  // @contract: patches BOTH form and initialForm so the dock shows no changes for patched fields.
  // Resets isFirstLoadRef so the next server refetch (triggered by cache invalidation after
  // fill-fields) also overwrites the form — without this, the stale form values from before
  // the fill would persist until a full page reload.
  const patchFormFields = (patch: Partial<MovieForm>) => {
    setForm((f) => ({ ...f, ...patch }));
    setInitialForm((f) => (f ? { ...f, ...patch } : f));
    isFirstLoadRef.current = true;
  };

  return { form, setForm, initialForm, setInitialForm, patchFormFields, isFirstLoadRef };
}
