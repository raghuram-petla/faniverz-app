import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@/components/sync/ActorSearchResults', () => ({
  ActorSearchResults: ({ actors, isReadOnly }: { actors: unknown[]; isReadOnly?: boolean }) => (
    <div data-testid="actor-results">
      <span data-testid="actor-count">{actors.length}</span>
      <span data-testid="actor-readonly">{isReadOnly ? 'true' : 'false'}</span>
    </div>
  ),
}));

vi.mock('@/components/sync/MovieSearchResults', () => ({
  MovieSearchResults: ({ movies }: { movies: unknown[] }) => (
    <div data-testid="movie-results">
      <span data-testid="movie-count">{movies.length}</span>
    </div>
  ),
}));

import { SearchResultsPanel } from '@/components/sync/SearchResultsPanel';
import type { TmdbSearchAllResult } from '@/hooks/useSync';

function makeData(
  overrides: Partial<{
    movies: Partial<TmdbSearchAllResult['movies']>;
    actors: Partial<TmdbSearchAllResult['actors']>;
  }> = {},
): TmdbSearchAllResult {
  return {
    movies: {
      results: [],
      existingTmdbIds: [],
      duplicateSuspects: {},
      ...overrides.movies,
    },
    actors: {
      results: [],
      existingTmdbPersonIds: [],
      ...overrides.actors,
    },
  };
}

describe('SearchResultsPanel', () => {
  it('renders actor results when actors are present', () => {
    const data = makeData({
      actors: {
        results: [{ id: 1, name: 'Alice', profile_path: null, known_for_department: 'Acting' }],
      },
    });
    render(<SearchResultsPanel data={data} />);
    expect(screen.getByTestId('actor-results')).toBeInTheDocument();
    expect(screen.getByTestId('actor-count').textContent).toBe('1');
  });

  it('renders movie results when movies are present', () => {
    const data = makeData({
      movies: {
        results: [
          { id: 1, title: 'Movie', poster_path: null, release_date: '2024-01-01', original_language: 'te' },
        ],
      },
    });
    render(<SearchResultsPanel data={data} />);
    expect(screen.getByTestId('movie-results')).toBeInTheDocument();
  });

  it('shows "No results found" when both are empty', () => {
    const data = makeData();
    render(<SearchResultsPanel data={data} />);
    expect(screen.getByText('No results found.')).toBeInTheDocument();
  });

  it('passes isReadOnly to ActorSearchResults', () => {
    const data = makeData({
      actors: {
        results: [{ id: 1, name: 'Alice', profile_path: null, known_for_department: 'Acting' }],
      },
    });
    render(<SearchResultsPanel data={data} isReadOnly={true} />);
    expect(screen.getByTestId('actor-readonly').textContent).toBe('true');
  });

  it('passes isReadOnly=false by default', () => {
    const data = makeData({
      actors: {
        results: [{ id: 1, name: 'Alice', profile_path: null, known_for_department: 'Acting' }],
      },
    });
    render(<SearchResultsPanel data={data} />);
    expect(screen.getByTestId('actor-readonly').textContent).toBe('false');
  });
});
