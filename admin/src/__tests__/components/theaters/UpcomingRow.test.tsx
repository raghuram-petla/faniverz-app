import { render, screen } from '@testing-library/react';
import { UpcomingRow } from '@/components/theaters/UpcomingRow';
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
  id: '2',
  tmdb_id: null,
  title: 'Upcoming Film',
  poster_url: null,
  backdrop_url: null,
  release_date: '2026-04-15',
  runtime: 150,
  genres: [],
  certification: null,
  synopsis: null,
  director: null,
  in_theaters: false,
  premiere_date: '2026-04-12',
  original_language: 'te',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
  poster_image_type: 'poster',
  backdrop_image_type: 'backdrop',
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
  rating: 0,
  review_count: 0,
  is_featured: false,
  imdb_id: null,
  title_te: null,
  synopsis_te: null,
  tagline: null,
  tmdb_status: null,
  tmdb_vote_average: null,
  tmdb_vote_count: null,
  budget: null,
  revenue: null,
  tmdb_popularity: null,
  spoken_languages: null,
  collection_id: null,
  collection_name: null,
  language_id: null,
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

describe('UpcomingRow', () => {
  it('renders movie title', () => {
    renderInTable(<UpcomingRow movie={mockMovie} countdown="In 32 days" />);
    expect(screen.getByText('Upcoming Film')).toBeInTheDocument();
  });

  it('renders countdown text', () => {
    renderInTable(<UpcomingRow movie={mockMovie} countdown="In 32 days" />);
    expect(screen.getByText('In 32 days')).toBeInTheDocument();
  });

  it('renders premiere date when present', () => {
    renderInTable(<UpcomingRow movie={mockMovie} countdown="In 32 days" />);
    expect(screen.getByText(/Premiere/)).toBeInTheDocument();
  });

  it('does not render premiere line when premiere_date is null', () => {
    renderInTable(
      <UpcomingRow movie={{ ...mockMovie, premiere_date: null }} countdown="In 32 days" />,
    );
    expect(screen.queryByText(/Premiere/)).not.toBeInTheDocument();
  });

  it('renders edit link', () => {
    renderInTable(<UpcomingRow movie={mockMovie} countdown="In 32 days" />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/movies/2');
  });

  it('renders formatted release date', () => {
    renderInTable(<UpcomingRow movie={mockMovie} countdown="In 32 days" />);
    expect(screen.getAllByText(/2026/).length).toBeGreaterThanOrEqual(1);
  });

  it('does not render a toggle switch', () => {
    renderInTable(<UpcomingRow movie={mockMovie} countdown="Tomorrow" />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
  });
});
