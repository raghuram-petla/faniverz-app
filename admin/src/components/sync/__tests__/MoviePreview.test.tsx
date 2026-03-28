import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { MoviePreview } from '@/components/sync/MoviePreview';
import type { MoviePreviewProps } from '@/components/sync/MoviePreview';
import type { LookupResult } from '@/hooks/useSync';

const baseResult = {
  type: 'movie' as const,
  existsInDb: false,
  existingId: null,
  data: {
    tmdbId: 123,
    title: 'Test Movie',
    posterUrl: 'https://image.tmdb.org/t/p/w500/poster.jpg',
    releaseDate: '2025-06-15',
    runtime: 120,
    director: 'Director Name',
    castCount: 10,
    genres: ['Action', 'Drama'],
    overview: 'A test movie overview.',
    originalLanguage: 'te',
  },
} as LookupResult & { type: 'movie' };

function makeProps(overrides: Partial<MoviePreviewProps> = {}): MoviePreviewProps {
  return {
    result: baseResult,
    isPending: false,
    onImport: vi.fn(),
    ...overrides,
  };
}

describe('MoviePreview', () => {
  it('renders movie title', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('renders poster image', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByAltText('Test Movie')).toBeInTheDocument();
  });

  it('renders placeholder when posterUrl is null', () => {
    const result = {
      ...baseResult,
      data: { ...baseResult.data, posterUrl: null },
    } as typeof baseResult;
    render(<MoviePreview {...makeProps({ result })} />);
    expect(screen.queryByAltText('Test Movie')).not.toBeInTheDocument();
  });

  it('renders release date', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByText('2025-06-15')).toBeInTheDocument();
  });

  it('renders runtime', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByText('120 min')).toBeInTheDocument();
  });

  it('renders "—" when runtime is null', () => {
    const result = {
      ...baseResult,
      data: { ...baseResult.data, runtime: null },
    } as typeof baseResult;
    render(<MoviePreview {...makeProps({ result })} />);
    // Multiple "—" dashes for missing fields
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('renders director', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByText('Director Name')).toBeInTheDocument();
  });

  it('renders cast count', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByText('10 members')).toBeInTheDocument();
  });

  it('renders genres', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByText('Action, Drama')).toBeInTheDocument();
  });

  it('renders overview', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByText('A test movie overview.')).toBeInTheDocument();
  });

  it('shows "Not in database" when existsInDb is false', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByText('Not in database')).toBeInTheDocument();
  });

  it('shows "Already in database" when existsInDb is true', () => {
    const result = { ...baseResult, existsInDb: true } as typeof baseResult;
    render(<MoviePreview {...makeProps({ result })} />);
    expect(screen.getByText('Already in database')).toBeInTheDocument();
  });

  it('shows "Import Movie" button when not in DB', () => {
    render(<MoviePreview {...makeProps()} />);
    expect(screen.getByText('Import Movie')).toBeInTheDocument();
  });

  it('shows "Re-sync from TMDB" button when already in DB', () => {
    const result = { ...baseResult, existsInDb: true } as typeof baseResult;
    render(<MoviePreview {...makeProps({ result })} />);
    expect(screen.getByText('Re-sync from TMDB')).toBeInTheDocument();
  });

  it('calls onImport when import button clicked', () => {
    const onImport = vi.fn();
    render(<MoviePreview {...makeProps({ onImport })} />);
    fireEvent.click(screen.getByText('Import Movie'));
    expect(onImport).toHaveBeenCalledTimes(1);
  });

  it('disables import button when isPending', () => {
    render(<MoviePreview {...makeProps({ isPending: true })} />);
    const btn = screen.getByText('Import Movie').closest('button')!;
    expect(btn).toBeDisabled();
  });

  it('hides import button when isReadOnly', () => {
    render(<MoviePreview {...makeProps({ isReadOnly: true })} />);
    expect(screen.queryByText('Import Movie')).not.toBeInTheDocument();
    expect(screen.queryByText('Re-sync from TMDB')).not.toBeInTheDocument();
  });

  it('shows import button when isReadOnly is false', () => {
    render(<MoviePreview {...makeProps({ isReadOnly: false })} />);
    expect(screen.getByText('Import Movie')).toBeInTheDocument();
  });
});
