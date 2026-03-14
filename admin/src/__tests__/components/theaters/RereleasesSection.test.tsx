import { render, screen } from '@testing-library/react';
import { RereleasesSection } from '@/components/theaters/RereleasesSection';

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

const mockRereleases = [
  {
    id: 'run-1',
    movie_id: 'movie-1',
    release_date: '2026-04-20',
    label: 'IMAX Re-release',
    created_at: '',
    movies: {
      id: 'movie-1',
      title: 'Classic Film',
      poster_url: null,
      in_theaters: false,
    },
  },
];

const daysUntil = vi.fn().mockReturnValue('In 37 days');

describe('RereleasesSection', () => {
  it('returns null when rereleases is empty', () => {
    const { container } = render(<RereleasesSection rereleases={[]} daysUntil={daysUntil} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders heading with count', () => {
    render(<RereleasesSection rereleases={mockRereleases} daysUntil={daysUntil} />);
    expect(screen.getByText('Upcoming Re-releases')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });

  it('renders movie title', () => {
    render(<RereleasesSection rereleases={mockRereleases} daysUntil={daysUntil} />);
    expect(screen.getByText('Classic Film')).toBeInTheDocument();
  });

  it('renders label badge', () => {
    render(<RereleasesSection rereleases={mockRereleases} daysUntil={daysUntil} />);
    expect(screen.getByText('IMAX Re-release')).toBeInTheDocument();
  });

  it('renders countdown from daysUntil helper', () => {
    render(<RereleasesSection rereleases={mockRereleases} daysUntil={daysUntil} />);
    expect(screen.getByText('In 37 days')).toBeInTheDocument();
    expect(daysUntil).toHaveBeenCalledWith('2026-04-20');
  });

  it('renders edit link', () => {
    render(<RereleasesSection rereleases={mockRereleases} daysUntil={daysUntil} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/movies/movie-1');
  });

  it('shows "Re-release" as default label when label is null', () => {
    const noLabel = [{ ...mockRereleases[0], label: null }];
    render(<RereleasesSection rereleases={noLabel} daysUntil={daysUntil} />);
    expect(screen.getByText('Re-release')).toBeInTheDocument();
  });
});
