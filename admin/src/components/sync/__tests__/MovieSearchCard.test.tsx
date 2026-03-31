import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { MovieSearchCard } from '@/components/sync/MovieSearchCard';

const baseMovie = {
  id: 101,
  title: 'Test Movie',
  poster_path: '/test.jpg',
  release_date: '2025-06-15',
  original_language: 'te',
};

const defaultProps = {
  movie: baseMovie,
  exists: false,
  isSelected: false,
  isImporting: false,
  languageBlocked: false,
  suspect: undefined,
  linkingTmdbId: null,
  langName: (code: string | null | undefined): string | null =>
    code ? ({ te: 'Telugu', en: 'English' }[code] ?? code) : null,
  onToggleSelect: vi.fn(),
  onLinkDuplicate: vi.fn(),
};

describe('MovieSearchCard', () => {
  it('renders movie title and release date', () => {
    render(<MovieSearchCard {...defaultProps} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText(/2025-06-15/)).toBeInTheDocument();
  });

  it('renders poster image when poster_path exists', () => {
    render(<MovieSearchCard {...defaultProps} />);
    const img = screen.getByAltText('Test Movie');
    expect(img).toHaveAttribute('src', 'https://image.tmdb.org/t/p/w200/test.jpg');
  });

  it('renders placeholder when no poster_path', () => {
    render(<MovieSearchCard {...defaultProps} movie={{ ...baseMovie, poster_path: null }} />);
    expect(screen.queryByAltText('Test Movie')).not.toBeInTheDocument();
  });

  it('shows "In DB" badge when exists is true', () => {
    render(<MovieSearchCard {...defaultProps} exists={true} />);
    expect(screen.getByText('In DB')).toBeInTheDocument();
  });

  it('shows "Review gaps" link when exists with localMovieId', () => {
    render(<MovieSearchCard {...defaultProps} exists={true} localMovieId="movie-uuid" />);
    const link = screen.getByText('Review gaps');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/movies/movie-uuid?tab=tmdb-sync');
  });

  it('does not show "Review gaps" link when exists without localMovieId', () => {
    render(<MovieSearchCard {...defaultProps} exists={true} />);
    expect(screen.queryByText('Review gaps')).not.toBeInTheDocument();
  });

  it('shows "Selected" badge when isSelected is true', () => {
    render(<MovieSearchCard {...defaultProps} isSelected={true} />);
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('shows "Not your language" badge when languageBlocked', () => {
    render(<MovieSearchCard {...defaultProps} languageBlocked={true} />);
    expect(screen.getByText('Not your language')).toBeInTheDocument();
  });

  it('shows "Duplicate?" badge when suspect exists', () => {
    const suspect = { id: 'db-1', title: 'Test Film' };
    render(<MovieSearchCard {...defaultProps} suspect={suspect} />);
    expect(screen.getByText('Duplicate?')).toBeInTheDocument();
    expect(screen.getByText(/Matches/)).toBeInTheDocument();
  });

  it('calls onToggleSelect when clicked', () => {
    const onToggleSelect = vi.fn();
    render(<MovieSearchCard {...defaultProps} onToggleSelect={onToggleSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Test Movie/ }));
    expect(onToggleSelect).toHaveBeenCalledWith(101);
  });

  it('does not call onToggleSelect when exists', () => {
    const onToggleSelect = vi.fn();
    render(<MovieSearchCard {...defaultProps} exists={true} onToggleSelect={onToggleSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /Test Movie/ }));
    expect(onToggleSelect).not.toHaveBeenCalled();
  });

  it('calls onLinkDuplicate when link button clicked', () => {
    const onLinkDuplicate = vi.fn();
    const suspect = { id: 'db-1', title: 'Test Film' };
    render(
      <MovieSearchCard {...defaultProps} suspect={suspect} onLinkDuplicate={onLinkDuplicate} />,
    );
    fireEvent.click(screen.getByText('Link to TMDB'));
    expect(onLinkDuplicate).toHaveBeenCalledWith(101, suspect);
  });

  it('displays language name from langName function', () => {
    render(<MovieSearchCard {...defaultProps} />);
    expect(screen.getByText(/Telugu/)).toBeInTheDocument();
  });

  it('shows "No date" when release_date is empty', () => {
    render(<MovieSearchCard {...defaultProps} movie={{ ...baseMovie, release_date: '' }} />);
    expect(screen.getByText(/No date/)).toBeInTheDocument();
  });

  it('falls back to raw language code when langName returns null', () => {
    render(
      <MovieSearchCard
        {...defaultProps}
        movie={{ ...baseMovie, original_language: 'unknown_lang' }}
      />,
    );
    expect(screen.getByText(/unknown_lang/)).toBeInTheDocument();
  });

  it('shows spinner when linkingTmdbId matches movie id', () => {
    const suspect = { id: 'db-1', title: 'Test Film' };
    render(
      <MovieSearchCard
        {...defaultProps}
        suspect={suspect}
        linkingTmdbId={101}
        onLinkDuplicate={vi.fn()}
      />,
    );
    const linkBtn = screen.getByText('Link to TMDB').closest('button');
    expect(linkBtn).toBeDisabled();
  });

  describe('isReadOnly', () => {
    it('disables card selection when isReadOnly', () => {
      const onToggleSelect = vi.fn();
      render(
        <MovieSearchCard {...defaultProps} isReadOnly={true} onToggleSelect={onToggleSelect} />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Test Movie/ }));
      expect(onToggleSelect).not.toHaveBeenCalled();
    });

    it('hides Link to TMDB button when isReadOnly', () => {
      const suspect = { id: 'db-1', title: 'Test Film' };
      render(<MovieSearchCard {...defaultProps} suspect={suspect} isReadOnly={true} />);
      expect(screen.queryByText('Link to TMDB')).not.toBeInTheDocument();
    });

    it('still shows Edit instead link when isReadOnly', () => {
      const suspect = { id: 'db-1', title: 'Test Film' };
      render(<MovieSearchCard {...defaultProps} suspect={suspect} isReadOnly={true} />);
      expect(screen.getByText('Edit instead')).toBeInTheDocument();
    });
  });
});
