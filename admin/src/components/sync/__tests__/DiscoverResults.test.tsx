import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@/components/sync/ExistingMovieSync', () => ({
  ExistingMovieSync: () => <div data-testid="existing-movie-sync" />,
}));

vi.mock('@/hooks/useLanguageOptions', () => ({
  useLanguageName: () => (code: string | null | undefined) =>
    code ? ({ te: 'Telugu' }[code] ?? code) : null,
}));

import { DiscoverResults } from '@/components/sync/DiscoverResults';
import type { DiscoverResultsProps } from '@/components/sync/DiscoverResults';

const baseMovie = {
  id: 1,
  title: 'Test Movie',
  poster_path: null,
  release_date: '2024-01-01',
  original_language: 'te',
};

function makeProps(overrides: Partial<DiscoverResultsProps> = {}): DiscoverResultsProps {
  return {
    results: [baseMovie],
    existingMovies: [],
    existingSet: new Set<number>(),
    newMovies: [baseMovie],
    selected: new Set<number>(),
    isImporting: false,
    gapCount: null,
    onToggleSelect: vi.fn(),
    onSelectAllNew: vi.fn(),
    onDeselectAll: vi.fn(),
    onImport: vi.fn(),
    onImportAllNew: vi.fn(),
    ...overrides,
  };
}

describe('DiscoverResults', () => {
  it('renders summary with counts', () => {
    render(<DiscoverResults {...makeProps()} />);
    expect(screen.getByText('1 new')).toBeInTheDocument();
  });

  it('shows select all button when new movies exist', () => {
    render(<DiscoverResults {...makeProps()} />);
    expect(screen.getByText(/Select all new/)).toBeInTheDocument();
  });

  it('shows import all new button', () => {
    render(<DiscoverResults {...makeProps()} />);
    expect(screen.getByText(/Import all new/)).toBeInTheDocument();
  });

  it('shows import selected button when movies are selected', () => {
    render(<DiscoverResults {...makeProps({ selected: new Set([1]) })} />);
    expect(screen.getByText('Import 1 selected')).toBeInTheDocument();
  });

  it('calls onImport when import button clicked', () => {
    const onImport = vi.fn();
    render(<DiscoverResults {...makeProps({ selected: new Set([1]), onImport })} />);
    fireEvent.click(screen.getByText('Import 1 selected'));
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  describe('isReadOnly', () => {
    it('hides select all button when isReadOnly', () => {
      render(<DiscoverResults {...makeProps({ isReadOnly: true })} />);
      expect(screen.queryByText(/Select all new/)).not.toBeInTheDocument();
    });

    it('hides import all new button when isReadOnly', () => {
      render(<DiscoverResults {...makeProps({ isReadOnly: true })} />);
      expect(screen.queryByText(/Import all new/)).not.toBeInTheDocument();
    });

    it('hides import selected button when isReadOnly', () => {
      render(<DiscoverResults {...makeProps({ isReadOnly: true, selected: new Set([1]) })} />);
      expect(screen.queryByText(/Import \d+ selected/)).not.toBeInTheDocument();
    });

    it('hides cancel import button when isReadOnly', () => {
      const onCancelImport = vi.fn();
      render(
        <DiscoverResults
          {...makeProps({ isReadOnly: true, isImporting: true, onCancelImport })}
        />,
      );
      expect(screen.queryByText('Cancel import')).not.toBeInTheDocument();
    });

    it('disables card selection when isReadOnly', () => {
      const onToggleSelect = vi.fn();
      render(<DiscoverResults {...makeProps({ isReadOnly: true, onToggleSelect })} />);
      const card = screen.getByText('Test Movie').closest('button')!;
      expect(card).toBeDisabled();
      fireEvent.click(card);
      expect(onToggleSelect).not.toHaveBeenCalled();
    });

    it('hides Link to TMDB button for duplicates when isReadOnly', () => {
      const onLinkDuplicate = vi.fn();
      const suspect = { id: 'db-1', title: 'Existing Film' };
      render(
        <DiscoverResults
          {...makeProps({
            isReadOnly: true,
            duplicateSuspects: { 1: suspect },
            newMovies: [],
            onLinkDuplicate,
          })}
        />,
      );
      expect(screen.queryByText('Link to TMDB')).not.toBeInTheDocument();
    });

    it('still shows summary counts when isReadOnly', () => {
      render(<DiscoverResults {...makeProps({ isReadOnly: true })} />);
      expect(screen.getByText('1 new')).toBeInTheDocument();
    });
  });
});
