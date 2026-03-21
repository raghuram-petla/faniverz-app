import { render, screen } from '@testing-library/react';
import {
  TmdbMetadataSection,
  type TmdbMetadataProps,
} from '@/components/movie-edit/TmdbMetadataSection';

const defaultProps: TmdbMetadataProps = {
  tmdbStatus: 'Released',
  tmdbVoteAverage: 7.5,
  tmdbVoteCount: 1234,
  budget: 50000000,
  revenue: 150000000,
  collectionName: 'Test Collection',
  spokenLanguages: ['en', 'te'],
  tmdbLastSyncedAt: '2026-03-15T10:30:00Z',
};

describe('TmdbMetadataSection', () => {
  it('renders all metadata fields when data is present', () => {
    render(<TmdbMetadataSection {...defaultProps} />);
    expect(screen.getByText('Released')).toBeInTheDocument();
    expect(screen.getByText('7.5')).toBeInTheDocument();
    expect(screen.getByText('(1,234 votes)')).toBeInTheDocument();
    expect(screen.getByText('$50,000,000')).toBeInTheDocument();
    expect(screen.getByText('$150,000,000')).toBeInTheDocument();
    expect(screen.getByText('Test Collection')).toBeInTheDocument();
    expect(screen.getByText('en')).toBeInTheDocument();
    expect(screen.getByText('te')).toBeInTheDocument();
  });

  it('shows empty state message when no data available', () => {
    render(
      <TmdbMetadataSection
        tmdbStatus={null}
        tmdbVoteAverage={null}
        tmdbVoteCount={null}
        budget={null}
        revenue={null}
        collectionName={null}
        spokenLanguages={null}
        tmdbLastSyncedAt={null}
      />,
    );
    expect(screen.getByText(/No TMDB metadata available/)).toBeInTheDocument();
  });

  it('shows dashes for null budget and revenue', () => {
    render(<TmdbMetadataSection {...defaultProps} budget={null} revenue={null} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('shows dashes for zero budget and revenue', () => {
    render(<TmdbMetadataSection {...defaultProps} budget={0} revenue={0} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(2);
  });

  it('shows dash when collection name is null', () => {
    render(<TmdbMetadataSection {...defaultProps} collectionName={null} />);
    // Collection row should show a dash
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('shows dash when spoken languages is empty', () => {
    render(<TmdbMetadataSection {...defaultProps} spokenLanguages={[]} />);
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });

  it('does not render last synced row when tmdbLastSyncedAt is null', () => {
    render(<TmdbMetadataSection {...defaultProps} tmdbLastSyncedAt={null} />);
    expect(screen.queryByText('Last Synced')).not.toBeInTheDocument();
  });

  it('renders last synced row when date is provided', () => {
    render(<TmdbMetadataSection {...defaultProps} />);
    expect(screen.getByText('Last Synced')).toBeInTheDocument();
  });

  it('renders status badge with correct styling class for Released', () => {
    render(<TmdbMetadataSection {...defaultProps} tmdbStatus="Released" />);
    const badge = screen.getByText('Released');
    expect(badge.className).toContain('bg-green-600/20');
  });

  it('renders status badge with correct styling class for Planned', () => {
    render(<TmdbMetadataSection {...defaultProps} tmdbStatus="Planned" />);
    const badge = screen.getByText('Planned');
    expect(badge.className).toContain('bg-purple-600/20');
  });

  it('renders fallback styling for unknown status', () => {
    render(<TmdbMetadataSection {...defaultProps} tmdbStatus="Unknown" />);
    const badge = screen.getByText('Unknown');
    expect(badge.className).toContain('bg-zinc-600/20');
  });

  it('shows dash for null vote average', () => {
    render(<TmdbMetadataSection {...defaultProps} tmdbVoteAverage={null} />);
    expect(screen.queryByText('/10')).not.toBeInTheDocument();
  });
});
