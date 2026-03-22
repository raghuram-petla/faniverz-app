import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@/lib/utils', () => ({
  formatDate: (d: string) => `Formatted: ${d}`,
}));

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (_url: string, _size: string, _bucket: string) => 'https://cdn/poster.jpg',
}));

vi.mock('@/components/theaters/ToggleSwitch', () => ({
  ToggleSwitch: ({ on, onChange }: { on: boolean; onChange: () => void }) => (
    <button role="switch" aria-checked={on} onClick={onChange} data-testid="toggle-switch">
      {on ? 'ON' : 'OFF'}
    </button>
  ),
}));

import { MovieRow } from '@/components/theaters/MovieRow';
import type { Movie } from '@/lib/types';

function makeMovie(overrides: Partial<Movie> = {}): Movie {
  return {
    id: 'movie-1',
    title: 'Pushpa 2',
    poster_url: 'https://cdn/poster.jpg',
    backdrop_url: null,
    release_date: '2025-01-01',
    runtime: 180,
    synopsis: null,
    trailer_url: null,
    in_theaters: true,
    original_language: 'te',
    genres: [],
    is_featured: false,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('MovieRow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders movie title', () => {
    render(
      <table>
        <tbody>
          <MovieRow movie={makeMovie()} isOn={true} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
  });

  it('renders formatted release date', () => {
    render(
      <table>
        <tbody>
          <MovieRow
            movie={makeMovie({ release_date: '2025-01-15' })}
            isOn={true}
            onToggle={vi.fn()}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText('Formatted: 2025-01-15')).toBeInTheDocument();
  });

  it('shows em-dash when release_date is null', () => {
    render(
      <table>
        <tbody>
          <MovieRow
            movie={makeMovie({ release_date: null as unknown as string })}
            isOn={true}
            onToggle={vi.fn()}
          />
        </tbody>
      </table>,
    );
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders poster image when poster_url is set', () => {
    const { container } = render(
      <table>
        <tbody>
          <MovieRow movie={makeMovie()} isOn={true} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );
    const img = container.querySelector('img');
    expect(img).toBeInTheDocument();
  });

  it('renders Film icon placeholder when poster_url is null', () => {
    const { container } = render(
      <table>
        <tbody>
          <MovieRow
            movie={makeMovie({ poster_url: null as unknown as string })}
            isOn={true}
            onToggle={vi.fn()}
          />
        </tbody>
      </table>,
    );
    expect(container.querySelector('img')).not.toBeInTheDocument();
    // Film icon SVG should be present
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders ToggleSwitch with isOn value', () => {
    render(
      <table>
        <tbody>
          <MovieRow movie={makeMovie()} isOn={true} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );
    const toggle = screen.getByTestId('toggle-switch');
    expect(toggle).toHaveAttribute('aria-checked', 'true');
  });

  it('calls onToggle when ToggleSwitch is clicked', () => {
    const onToggle = vi.fn();
    render(
      <table>
        <tbody>
          <MovieRow movie={makeMovie()} isOn={false} onToggle={onToggle} />
        </tbody>
      </table>,
    );
    fireEvent.click(screen.getByTestId('toggle-switch'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('renders edit link to movie edit page', () => {
    render(
      <table>
        <tbody>
          <MovieRow movie={makeMovie({ id: 'movie-123' })} isOn={true} onToggle={vi.fn()} />
        </tbody>
      </table>,
    );
    const editLink = screen.getByRole('link');
    expect(editLink).toHaveAttribute('href', '/movies/movie-123');
  });
});
