import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AdvancedFiltersPanel,
  type AdvancedFiltersPanelProps,
} from '@/components/movies/AdvancedFiltersPanel';
import type { MovieFilters } from '@/hooks/useMovieFilters';

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({
    data: [
      {
        id: 'netflix',
        name: 'Netflix',
        logo: '',
        logo_url: null,
        color: '#E50914',
        display_order: 0,
      },
      {
        id: 'prime',
        name: 'Prime Video',
        logo: '',
        logo_url: null,
        color: '#00A8E1',
        display_order: 1,
      },
    ],
    isLoading: false,
  }),
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

function renderPanel(overrides: Partial<AdvancedFiltersPanelProps> = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const props: AdvancedFiltersPanelProps = {
    filters: overrides.filters ?? defaultFilters,
    setFilter:
      overrides.setFilter ?? (vi.fn() as unknown as AdvancedFiltersPanelProps['setFilter']),
    toggleGenre:
      overrides.toggleGenre ?? (vi.fn() as unknown as AdvancedFiltersPanelProps['toggleGenre']),
    clearAll: overrides.clearAll ?? vi.fn(),
    hasActiveFilters: overrides.hasActiveFilters ?? false,
  };
  return {
    ...render(
      <QueryClientProvider client={qc}>
        <AdvancedFiltersPanel {...props} />
      </QueryClientProvider>,
    ),
    props,
  };
}

describe('AdvancedFiltersPanel', () => {
  it('renders all filter controls', () => {
    renderPanel();
    expect(screen.getByPlaceholderText('Search by actor name...')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search by director name...')).toBeInTheDocument();
    expect(screen.getByText('Release Year')).toBeInTheDocument();
    expect(screen.getByText('Release Month')).toBeInTheDocument();
    expect(screen.getByText('Certification')).toBeInTheDocument();
    expect(screen.getByText('Language')).toBeInTheDocument();
    expect(screen.getByText('OTT Platform')).toBeInTheDocument();
    expect(screen.getByText('Min Rating')).toBeInTheDocument();
    expect(screen.getByText('Featured only')).toBeInTheDocument();
    expect(screen.getByText('Genres')).toBeInTheDocument();
  });

  it('renders genre pill buttons', () => {
    renderPanel();
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
    expect(screen.getByText('Comedy')).toBeInTheDocument();
    expect(screen.getByText('Historical')).toBeInTheDocument();
  });

  it('calls toggleGenre when a genre pill is clicked', () => {
    const toggleGenre = vi.fn();
    renderPanel({ toggleGenre });
    fireEvent.click(screen.getByText('Action'));
    expect(toggleGenre).toHaveBeenCalledWith('Action');
  });

  it('calls setFilter when actor search changes', () => {
    const setFilter = vi.fn();
    renderPanel({ setFilter });
    fireEvent.change(screen.getByPlaceholderText('Search by actor name...'), {
      target: { value: 'Mahesh' },
    });
    expect(setFilter).toHaveBeenCalledWith('actorSearch', 'Mahesh');
  });

  it('calls setFilter when director search changes', () => {
    const setFilter = vi.fn();
    renderPanel({ setFilter });
    fireEvent.change(screen.getByPlaceholderText('Search by director name...'), {
      target: { value: 'Rajamouli' },
    });
    expect(setFilter).toHaveBeenCalledWith('directorSearch', 'Rajamouli');
  });

  it('renders platform options from hook data', () => {
    renderPanel();
    expect(screen.getByText('Netflix')).toBeInTheDocument();
    expect(screen.getByText('Prime Video')).toBeInTheDocument();
  });

  it('disables month dropdown when no year is selected', () => {
    renderPanel();
    const monthSelect = screen.getByLabelText('Release Month') as HTMLSelectElement;
    expect(monthSelect).toBeDisabled();
  });

  it('enables month dropdown when year is selected', () => {
    renderPanel({ filters: { ...defaultFilters, releaseYear: '2025' } });
    const monthSelect = screen.getByLabelText('Release Month') as HTMLSelectElement;
    expect(monthSelect).not.toBeDisabled();
  });

  it('does not show Clear All when no filters are active', () => {
    renderPanel({ hasActiveFilters: false });
    expect(screen.queryByText('Clear All Filters')).not.toBeInTheDocument();
  });

  it('shows and calls Clear All when filters are active', () => {
    const clearAll = vi.fn();
    renderPanel({ hasActiveFilters: true, clearAll });
    const clearBtn = screen.getByText('Clear All Filters');
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(clearAll).toHaveBeenCalled();
  });

  it('calls setFilter for featured checkbox', () => {
    const setFilter = vi.fn();
    renderPanel({ setFilter });
    fireEvent.click(screen.getByText('Featured only'));
    expect(setFilter).toHaveBeenCalledWith('isFeatured', true);
  });
});
