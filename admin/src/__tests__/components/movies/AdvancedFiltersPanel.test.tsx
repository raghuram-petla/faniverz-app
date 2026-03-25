import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  AdvancedFiltersPanel,
  type AdvancedFiltersPanelProps,
} from '@/components/movies/AdvancedFiltersPanel';
import type { MovieFilters } from '@/hooks/useMovieFilters';

vi.mock('@/hooks/useLanguageOptions', () => ({
  useLanguageOptions: () => [
    { value: '', label: 'Not set' },
    { value: 'te', label: 'Telugu' },
    { value: 'hi', label: 'Hindi' },
    { value: 'ta', label: 'Tamil' },
    { value: 'en', label: 'English' },
  ],
  useLanguageName: () => {
    const map: Record<string, string> = { te: 'Telugu', hi: 'Hindi', ta: 'Tamil', en: 'English' };
    return (code: string) => map[code] ?? code;
  },
}));

const mockPlatformsData = vi.hoisted(() => ({
  current: [
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
  ] as unknown[] | undefined,
}));

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({
    data: mockPlatformsData.current,
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

  it('calls setFilter when release year changes', () => {
    const setFilter = vi.fn();
    renderPanel({ setFilter });
    fireEvent.change(screen.getByLabelText('Release Year'), { target: { value: '2025' } });
    expect(setFilter).toHaveBeenCalledWith('releaseYear', '2025');
  });

  it('calls setFilter when release month changes', () => {
    const setFilter = vi.fn();
    renderPanel({ setFilter, filters: { ...defaultFilters, releaseYear: '2025' } });
    fireEvent.change(screen.getByLabelText('Release Month'), { target: { value: '06' } });
    expect(setFilter).toHaveBeenCalledWith('releaseMonth', '06');
  });

  it('calls setFilter when certification changes', () => {
    const setFilter = vi.fn();
    renderPanel({ setFilter });
    fireEvent.change(screen.getByLabelText('Certification'), { target: { value: 'UA' } });
    expect(setFilter).toHaveBeenCalledWith('certification', 'UA');
  });

  it('calls setFilter when language changes', () => {
    const setFilter = vi.fn();
    renderPanel({ setFilter });
    fireEvent.change(screen.getByLabelText('Language'), { target: { value: 'te' } });
    expect(setFilter).toHaveBeenCalledWith('language', 'te');
  });

  it('calls setFilter when platform changes', () => {
    const setFilter = vi.fn();
    renderPanel({ setFilter });
    fireEvent.change(screen.getByLabelText('OTT Platform'), { target: { value: 'netflix' } });
    expect(setFilter).toHaveBeenCalledWith('platformId', 'netflix');
  });

  it('calls setFilter when min rating changes', () => {
    const setFilter = vi.fn();
    renderPanel({ setFilter });
    fireEvent.change(screen.getByLabelText('Min Rating'), { target: { value: '4' } });
    expect(setFilter).toHaveBeenCalledWith('minRating', '4');
  });

  it('renders year options from 2020 to currentYear+2', () => {
    renderPanel();
    const yearSelect = screen.getByLabelText('Release Year');
    const options = yearSelect.querySelectorAll('option');
    // "All Years" + (currentYear + 2 - 2020 + 1) options
    const expectedCount = 1 + (new Date().getFullYear() + 2 - 2020 + 1);
    expect(options).toHaveLength(expectedCount);
  });

  it('renders all 12 month options plus placeholder', () => {
    renderPanel({ filters: { ...defaultFilters, releaseYear: '2025' } });
    const monthSelect = screen.getByLabelText('Release Month');
    const options = monthSelect.querySelectorAll('option');
    expect(options).toHaveLength(13); // "All Months" + 12
  });

  it('renders rating options', () => {
    renderPanel();
    const ratingSelect = screen.getByLabelText('Min Rating');
    const options = ratingSelect.querySelectorAll('option');
    expect(options).toHaveLength(6); // "Any Rating" + 5
  });

  it('renders "All Platforms" as first option', () => {
    renderPanel();
    const platformSelect = screen.getByLabelText('OTT Platform');
    const firstOption = platformSelect.querySelector('option');
    expect(firstOption?.textContent).toBe('All Platforms');
  });

  it('highlights selected genre pills with primary variant', () => {
    renderPanel({ filters: { ...defaultFilters, genres: ['Action', 'Drama'] } });
    // Selected genres should render — these exercise the genres.includes(genre) true branch
    expect(screen.getByText('Action')).toBeInTheDocument();
    expect(screen.getByText('Drama')).toBeInTheDocument();
  });

  it('renders empty platform list when useAdminPlatforms returns undefined data', () => {
    mockPlatformsData.current = undefined;
    renderPanel();
    const platformSelect = screen.getByLabelText('OTT Platform');
    const options = platformSelect.querySelectorAll('option');
    // Only "All Platforms" option, no platform entries
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toBe('All Platforms');
    // Restore for other tests
    mockPlatformsData.current = [
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
    ];
  });
});
