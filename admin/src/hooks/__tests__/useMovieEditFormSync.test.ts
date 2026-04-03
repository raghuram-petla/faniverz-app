import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovieEditFormSync } from '../useMovieEditFormSync';

const makeMovie = (overrides?: Record<string, unknown>) => ({
  title: 'Test Movie',
  poster_url: 'https://img.example.com/poster.jpg',
  backdrop_url: 'https://img.example.com/backdrop.jpg',
  release_date: '2026-01-01',
  runtime: 120,
  genres: ['Action', 'Drama'],
  certification: 'UA',
  synopsis: 'A test movie.',
  in_theaters: false,
  premiere_date: null,
  original_language: 'te',
  is_featured: false,
  tmdb_id: 12345,
  tagline: 'Test tagline',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  ...overrides,
});

describe('useMovieEditFormSync', () => {
  it('initializes with empty form when movie is null', () => {
    const { result } = renderHook(() => useMovieEditFormSync('id-1', null));
    expect(result.current.form.title).toBe('');
    expect(result.current.initialForm).toBeNull();
  });

  it('hydrates form from movie on first load', () => {
    const movie = makeMovie();
    const { result } = renderHook(() => useMovieEditFormSync('id-1', movie));
    expect(result.current.form.title).toBe('Test Movie');
    expect(result.current.form.runtime).toBe('120');
    expect(result.current.form.genres).toEqual(['Action', 'Drama']);
    expect(result.current.initialForm?.title).toBe('Test Movie');
  });

  it('converts null fields to fallback values', () => {
    const movie = makeMovie({ runtime: null, genres: null, certification: null, tmdb_id: null });
    const { result } = renderHook(() => useMovieEditFormSync('id-1', movie));
    expect(result.current.form.runtime).toBe('');
    expect(result.current.form.genres).toEqual([]);
    expect(result.current.form.certification).toBe('');
    expect(result.current.form.tmdb_id).toBe('');
  });

  it('does not overwrite form on background refetch (only initialForm updates)', () => {
    const movie = makeMovie();
    const { result, rerender } = renderHook(({ id, m }) => useMovieEditFormSync(id, m), {
      initialProps: { id: 'id-1', m: movie },
    });

    // Simulate user edit
    act(() => {
      result.current.setForm((f) => ({ ...f, title: 'User Edit' }));
    });
    expect(result.current.form.title).toBe('User Edit');

    // Background refetch with updated title
    const updated = makeMovie({ title: 'Server Update' });
    rerender({ id: 'id-1', m: updated });

    // Form should NOT be overwritten (isFirstLoadRef is false)
    expect(result.current.form.title).toBe('User Edit');
    // But initialForm SHOULD update
    expect(result.current.initialForm?.title).toBe('Server Update');
  });

  it('resets first-load flag when id changes', () => {
    const movie = makeMovie();
    const { result, rerender } = renderHook(({ id, m }) => useMovieEditFormSync(id, m), {
      initialProps: { id: 'id-1', m: movie },
    });

    // Edit form
    act(() => {
      result.current.setForm((f) => ({ ...f, title: 'Edited' }));
    });

    // Change to new movie
    const movie2 = makeMovie({ title: 'Second Movie' });
    rerender({ id: 'id-2', m: movie2 });

    // Form should be hydrated with new movie (first load for new id)
    expect(result.current.form.title).toBe('Second Movie');
  });

  it('patchFormFields updates both form and initialForm', () => {
    const movie = makeMovie();
    const { result } = renderHook(() => useMovieEditFormSync('id-1', movie));

    act(() => {
      result.current.patchFormFields({ poster_url: 'https://new-poster.jpg' });
    });

    expect(result.current.form.poster_url).toBe('https://new-poster.jpg');
    expect(result.current.initialForm?.poster_url).toBe('https://new-poster.jpg');
  });
});
