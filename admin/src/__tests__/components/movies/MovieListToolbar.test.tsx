import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import { MovieListToolbar } from '@/components/movies/MovieListToolbar';
import type { MovieFilters } from '@/hooks/useMovieFilters';

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({ data: [], isLoading: false }),
}));

const defaultFilters: MovieFilters = {
  genres: [],
  releaseYear: '',
  releaseMonth: '',
  certification: '',
  language: '',
  platformId: '',
  isFeatured: false,
  minRating: '',
  actorSearch: '',
  directorSearch: '',
};

function renderToolbar(overrides: Partial<React.ComponentProps<typeof MovieListToolbar>> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const props = {
    search: '',
    setSearch: vi.fn(),
    statusFilter: '',
    setStatusFilter: vi.fn(),
    filters: defaultFilters,
    setFilter: vi.fn(),
    toggleGenre: vi.fn(),
    clearAll: vi.fn(),
    activeFilterCount: 0,
    hasActiveFilters: false,
    isFetching: false,
    isReadOnly: false,
    movieCount: 0,
    debouncedSearch: '',
    ...overrides,
  };
  return {
    ...render(
      <QueryClientProvider client={qc}>
        <MovieListToolbar {...props} />
      </QueryClientProvider>,
    ),
    props,
  };
}

describe('MovieListToolbar', () => {
  it('renders search input and status dropdown', () => {
    renderToolbar();
    expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
    expect(screen.getByText('All Status')).toBeInTheDocument();
  });

  it('renders Filters button', () => {
    renderToolbar();
    expect(screen.getByText('Filters')).toBeInTheDocument();
  });

  it('renders Add Movie link when not read-only', () => {
    renderToolbar({ isReadOnly: false });
    expect(screen.getByText('Add Movie')).toBeInTheDocument();
  });

  it('hides Add Movie link when read-only', () => {
    renderToolbar({ isReadOnly: true });
    expect(screen.queryByText('Add Movie')).not.toBeInTheDocument();
  });

  it('toggles advanced filters panel on button click', () => {
    renderToolbar();
    expect(screen.queryByText('Actor / Cast')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.getByText('Actor / Cast')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Filters'));
    expect(screen.queryByText('Actor / Cast')).not.toBeInTheDocument();
  });

  it('shows active filter count badge', () => {
    renderToolbar({ activeFilterCount: 3, hasActiveFilters: true });
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  it('does not show badge when no filters active', () => {
    renderToolbar({ activeFilterCount: 0 });
    expect(screen.queryByText('0')).not.toBeInTheDocument();
  });

  it('shows movie count text', () => {
    renderToolbar({ movieCount: 25, debouncedSearch: 'test' });
    expect(screen.getByText(/Showing 25 movies matching "test"/)).toBeInTheDocument();
  });

  it('shows filter count in status text', () => {
    renderToolbar({ movieCount: 10, activeFilterCount: 2, hasActiveFilters: true });
    expect(screen.getByText(/with 2 filters/)).toBeInTheDocument();
  });

  it('shows min chars hint when search is 1 char', () => {
    renderToolbar({ search: 'a' });
    expect(screen.getByText('Type at least 2 characters to search')).toBeInTheDocument();
  });

  it('calls setSearch on input change', () => {
    const setSearch = vi.fn();
    renderToolbar({ setSearch });
    fireEvent.change(screen.getByPlaceholderText('Search movies...'), {
      target: { value: 'hello' },
    });
    expect(setSearch).toHaveBeenCalledWith('hello');
  });

  it('calls setStatusFilter on status change', () => {
    const setStatusFilter = vi.fn();
    renderToolbar({ setStatusFilter });
    fireEvent.change(screen.getByDisplayValue('All Status'), {
      target: { value: 'upcoming' },
    });
    expect(setStatusFilter).toHaveBeenCalledWith('upcoming');
  });
});
