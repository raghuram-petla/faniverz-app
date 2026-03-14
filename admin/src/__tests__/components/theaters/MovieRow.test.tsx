import { render, screen } from '@testing-library/react';
import { MovieRow } from '@/components/theaters/MovieRow';
import type { Movie } from '@/lib/types';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockMovie: Movie = {
  id: '1',
  tmdb_id: null,
  title: 'Test Movie',
  poster_url: null,
  backdrop_url: null,
  release_date: '2026-03-20',
  runtime: 120,
  genres: [],
  certification: null,
  synopsis: null,
  director: null,
  in_theaters: true,
  premiere_date: null,
  original_language: 'te',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
  rating: 0,
  review_count: 0,
  is_featured: false,
  tmdb_last_synced_at: null,
  trailer_url: null,
  created_at: '',
  updated_at: '',
};

function renderInTable(ui: React.ReactElement) {
  return render(
    <table>
      <tbody>{ui}</tbody>
    </table>,
  );
}

describe('MovieRow', () => {
  it('renders movie title', () => {
    renderInTable(<MovieRow movie={mockMovie} isOn={true} onToggle={vi.fn()} />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
  });

  it('renders toggle switch', () => {
    renderInTable(<MovieRow movie={mockMovie} isOn={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('renders edit link pointing to movie page', () => {
    renderInTable(<MovieRow movie={mockMovie} isOn={true} onToggle={vi.fn()} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/movies/1');
  });

  it('renders formatted release date', () => {
    renderInTable(<MovieRow movie={mockMovie} isOn={true} onToggle={vi.fn()} />);
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders placeholder when no poster', () => {
    renderInTable(<MovieRow movie={mockMovie} isOn={false} onToggle={vi.fn()} />);
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('renders poster image when poster_url exists', () => {
    renderInTable(
      <MovieRow
        movie={{ ...mockMovie, poster_url: 'poster.jpg' }}
        isOn={true}
        onToggle={vi.fn()}
      />,
    );
    expect(screen.getByAltText('')).toBeInTheDocument();
  });
});
