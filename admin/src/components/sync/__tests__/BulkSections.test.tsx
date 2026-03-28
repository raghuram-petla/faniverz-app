import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@/components/sync/syncHelpers', () => ({
  formatRelativeTime: (d: string) => `relative(${d})`,
  CURRENT_YEAR: 2026,
}));

import {
  StaleMoviesSection,
  MissingBiosSection,
  BulkProgressPanel,
} from '@/components/sync/BulkSections';
import type {
  StaleMoviesSectionProps,
  MissingBiosSectionProps,
  // BulkProgressPanelProps,
} from '@/components/sync/BulkSections';

function makeStaleProps(overrides: Partial<StaleMoviesSectionProps> = {}): StaleMoviesSectionProps {
  return {
    staleDays: 30,
    onStaleDaysChange: vi.fn(),
    sinceYear: 2026,
    onSinceYearChange: vi.fn(),
    staleMovies: { data: { items: [] }, isLoading: false },
    showList: false,
    onToggleList: vi.fn(),
    onRefreshAll: vi.fn(),
    isBulkRunning: false,
    ...overrides,
  };
}

function makeBioProps(overrides: Partial<MissingBiosSectionProps> = {}): MissingBiosSectionProps {
  return {
    missingBios: { data: { items: [] }, isLoading: false },
    showList: false,
    onToggleList: vi.fn(),
    onFetchAll: vi.fn(),
    isBulkRunning: false,
    ...overrides,
  };
}

describe('StaleMoviesSection', () => {
  it('renders heading', () => {
    render(<StaleMoviesSection {...makeStaleProps()} />);
    expect(screen.getByText('Stale Movies')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<StaleMoviesSection {...makeStaleProps({ staleMovies: { isLoading: true } })} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows movie count when loaded', () => {
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          staleMovies: {
            data: { items: [{ id: '1' }, { id: '2' }] },
            isLoading: false,
          },
        })}
      />,
    );
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/movies/)).toBeInTheDocument();
  });

  it('shows 0 when data is undefined', () => {
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          staleMovies: { data: undefined, isLoading: false },
        })}
      />,
    );
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('disables Preview button when no items', () => {
    render(<StaleMoviesSection {...makeStaleProps()} />);
    const previewBtn = screen.getByText('Preview');
    expect(previewBtn.closest('button')).toBeDisabled();
  });

  it('disables Refresh All when bulk is running', () => {
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          isBulkRunning: true,
          staleMovies: { data: { items: [{ id: '1' }] }, isLoading: false },
        })}
      />,
    );
    expect(screen.getByText('Refresh All').closest('button')).toBeDisabled();
  });

  it('disables Refresh All when no items', () => {
    render(<StaleMoviesSection {...makeStaleProps()} />);
    expect(screen.getByText('Refresh All').closest('button')).toBeDisabled();
  });

  it('calls onRefreshAll when clicked', () => {
    const onRefreshAll = vi.fn();
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          onRefreshAll,
          staleMovies: { data: { items: [{ id: '1' }] }, isLoading: false },
        })}
      />,
    );
    fireEvent.click(screen.getByText('Refresh All'));
    expect(onRefreshAll).toHaveBeenCalledTimes(1);
  });

  it('calls onToggleList when Preview clicked', () => {
    const onToggleList = vi.fn();
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          onToggleList,
          staleMovies: { data: { items: [{ id: '1' }] }, isLoading: false },
        })}
      />,
    );
    fireEvent.click(screen.getByText('Preview'));
    expect(onToggleList).toHaveBeenCalledTimes(1);
  });

  it('shows Hide text when showList=true', () => {
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          showList: true,
          staleMovies: { data: { items: [{ id: '1', title: 'M1' }] }, isLoading: false },
        })}
      />,
    );
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });

  it('renders stale items list when showList=true', () => {
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          showList: true,
          staleMovies: {
            data: {
              items: [
                { id: '1', title: 'Movie A', tmdb_last_synced_at: '2025-01-01' },
                { id: '2', title: 'Movie B', tmdb_last_synced_at: null },
              ],
            },
            isLoading: false,
          },
        })}
      />,
    );
    expect(screen.getByText('Movie A')).toBeInTheDocument();
    expect(screen.getByText('relative(2025-01-01)')).toBeInTheDocument();
    expect(screen.getByText('Movie B')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('does not render list when showList=false', () => {
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          showList: false,
          staleMovies: {
            data: { items: [{ id: '1', title: 'Movie A' }] },
            isLoading: false,
          },
        })}
      />,
    );
    expect(screen.queryByText('Movie A')).not.toBeInTheDocument();
  });

  it('calls onStaleDaysChange on select change', () => {
    const onStaleDaysChange = vi.fn();
    render(<StaleMoviesSection {...makeStaleProps({ onStaleDaysChange, staleDays: 7 })} />);
    const selects = screen.getAllByRole('combobox');
    // Second select is staleDays
    fireEvent.change(selects[1], { target: { value: '60' } });
    expect(onStaleDaysChange).toHaveBeenCalledWith(60);
  });

  it('calls onSinceYearChange on year select change', () => {
    const onSinceYearChange = vi.fn();
    render(<StaleMoviesSection {...makeStaleProps({ onSinceYearChange })} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '2020' } });
    expect(onSinceYearChange).toHaveBeenCalledWith(2020);
  });

  it('hides Refresh All button when isReadOnly is true', () => {
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          isReadOnly: true,
          staleMovies: { data: { items: [{ id: '1' }] }, isLoading: false },
        })}
      />,
    );
    expect(screen.queryByText('Refresh All')).not.toBeInTheDocument();
  });

  it('shows Refresh All button when isReadOnly is false', () => {
    render(
      <StaleMoviesSection
        {...makeStaleProps({
          isReadOnly: false,
          staleMovies: { data: { items: [{ id: '1' }] }, isLoading: false },
        })}
      />,
    );
    expect(screen.getByText('Refresh All')).toBeInTheDocument();
  });
});

describe('MissingBiosSection', () => {
  it('renders heading', () => {
    render(<MissingBiosSection {...makeBioProps()} />);
    expect(screen.getByText('Missing Actor Bios')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<MissingBiosSection {...makeBioProps({ missingBios: { isLoading: true } })} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows actor count', () => {
    render(
      <MissingBiosSection
        {...makeBioProps({
          missingBios: {
            data: { items: [{ id: '1', name: 'Actor 1' }] },
            isLoading: false,
          },
        })}
      />,
    );
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows 0 when data is undefined', () => {
    render(
      <MissingBiosSection
        {...makeBioProps({ missingBios: { data: undefined, isLoading: false } })}
      />,
    );
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('disables Preview when no items', () => {
    render(<MissingBiosSection {...makeBioProps()} />);
    expect(screen.getByText('Preview').closest('button')).toBeDisabled();
  });

  it('disables Fetch All Bios when bulk running', () => {
    render(
      <MissingBiosSection
        {...makeBioProps({
          isBulkRunning: true,
          missingBios: { data: { items: [{ id: '1' }] }, isLoading: false },
        })}
      />,
    );
    expect(screen.getByText('Fetch All Bios').closest('button')).toBeDisabled();
  });

  it('disables Fetch All Bios when no items', () => {
    render(<MissingBiosSection {...makeBioProps()} />);
    expect(screen.getByText('Fetch All Bios').closest('button')).toBeDisabled();
  });

  it('calls onFetchAll when clicked', () => {
    const onFetchAll = vi.fn();
    render(
      <MissingBiosSection
        {...makeBioProps({
          onFetchAll,
          missingBios: { data: { items: [{ id: '1' }] }, isLoading: false },
        })}
      />,
    );
    fireEvent.click(screen.getByText('Fetch All Bios'));
    expect(onFetchAll).toHaveBeenCalledTimes(1);
  });

  it('renders actor names when showList=true', () => {
    render(
      <MissingBiosSection
        {...makeBioProps({
          showList: true,
          missingBios: {
            data: { items: [{ id: '1', name: 'Actor X' }] },
            isLoading: false,
          },
        })}
      />,
    );
    expect(screen.getByText('Actor X')).toBeInTheDocument();
  });

  it('does not render list when showList=false', () => {
    render(
      <MissingBiosSection
        {...makeBioProps({
          showList: false,
          missingBios: {
            data: { items: [{ id: '1', name: 'Actor X' }] },
            isLoading: false,
          },
        })}
      />,
    );
    expect(screen.queryByText('Actor X')).not.toBeInTheDocument();
  });

  it('shows Hide text when showList=true', () => {
    render(
      <MissingBiosSection
        {...makeBioProps({
          showList: true,
          missingBios: {
            data: { items: [{ id: '1', name: 'A' }] },
            isLoading: false,
          },
        })}
      />,
    );
    expect(screen.getByText('Hide')).toBeInTheDocument();
  });

  it('hides Fetch All Bios button when isReadOnly is true', () => {
    render(
      <MissingBiosSection
        {...makeBioProps({
          isReadOnly: true,
          missingBios: { data: { items: [{ id: '1' }] }, isLoading: false },
        })}
      />,
    );
    expect(screen.queryByText('Fetch All Bios')).not.toBeInTheDocument();
  });

  it('shows Fetch All Bios button when isReadOnly is false', () => {
    render(
      <MissingBiosSection
        {...makeBioProps({
          isReadOnly: false,
          missingBios: { data: { items: [{ id: '1' }] }, isLoading: false },
        })}
      />,
    );
    expect(screen.getByText('Fetch All Bios')).toBeInTheDocument();
  });
});

describe('BulkProgressPanel', () => {
  it('shows "Refreshing Movies" for type=movies', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 10, completed: 3, current: 'Movie A', errors: [] }}
      />,
    );
    expect(screen.getByText('Refreshing Movies')).toBeInTheDocument();
  });

  it('shows "Fetching Actor Bios" for type=actors', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'actors', total: 5, completed: 2, current: 'Actor B', errors: [] }}
      />,
    );
    expect(screen.getByText('Fetching Actor Bios')).toBeInTheDocument();
  });

  it('renders progress counter', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 10, completed: 7, current: 'X', errors: [] }}
      />,
    );
    expect(screen.getByText('7/10')).toBeInTheDocument();
  });

  it('shows current item when in progress', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 10, completed: 3, current: 'Processing...', errors: [] }}
      />,
    );
    expect(screen.getByText('Processing...')).toBeInTheDocument();
  });

  it('hides current item when completed', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 5, completed: 5, current: 'Done', errors: [] }}
      />,
    );
    // "Done" as current is not shown since completed === total
    expect(screen.queryByText('Done')).not.toBeInTheDocument();
  });

  it('hides current item when current is empty string', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 5, completed: 2, current: '', errors: [] }}
      />,
    );
    // Empty current should not render the paragraph
    const _progressItems = screen.queryAllByText('');
    // Just verify no crash
    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  it('shows "Complete!" when all done with no errors', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 3, completed: 3, current: '', errors: [] }}
      />,
    );
    expect(screen.getByText('Complete!')).toBeInTheDocument();
  });

  it('shows "Complete!" with error count when done with errors', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 3, completed: 3, current: '', errors: ['err1', 'err2'] }}
      />,
    );
    expect(screen.getByText(/Complete!.*2 errors/)).toBeInTheDocument();
  });

  it('renders error messages', () => {
    render(
      <BulkProgressPanel
        progress={{
          type: 'actors',
          total: 2,
          completed: 2,
          current: '',
          errors: ['Failed: Actor A', 'Failed: Actor B'],
        }}
      />,
    );
    expect(screen.getByText('Failed: Actor A')).toBeInTheDocument();
    expect(screen.getByText('Failed: Actor B')).toBeInTheDocument();
  });

  it('renders errors even during progress', () => {
    render(
      <BulkProgressPanel
        progress={{
          type: 'movies',
          total: 5,
          completed: 2,
          current: 'Movie C',
          errors: ['Fail X'],
        }}
      />,
    );
    expect(screen.getByText('Fail X')).toBeInTheDocument();
  });
});
