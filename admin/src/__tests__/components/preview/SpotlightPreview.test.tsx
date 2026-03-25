import { render, screen } from '@testing-library/react';
import { SpotlightPreview } from '@/components/preview/SpotlightPreview';

const defaultProps = {
  title: 'Pushpa 2',
  backdropUrl: 'https://example.com/backdrop.jpg',
  movieStatus: 'in_theaters' as const,
  rating: 8.5,
  runtime: 148,
  certification: 'UA',
  releaseDate: '2024-12-05',
  focusX: null,
  focusY: null,
};

describe('SpotlightPreview', () => {
  it('renders movie title', () => {
    render(<SpotlightPreview {...defaultProps} />);
    expect(screen.getByText('Pushpa 2')).toBeInTheDocument();
  });

  it('renders release type badge', () => {
    render(<SpotlightPreview {...defaultProps} />);
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
  });

  it('shows Get Tickets for in_theaters status', () => {
    render(<SpotlightPreview {...defaultProps} movieStatus="in_theaters" />);
    expect(screen.getByText(/Get Tickets/)).toBeInTheDocument();
  });

  it('shows Watch Now for streaming status', () => {
    render(<SpotlightPreview {...defaultProps} movieStatus="streaming" />);
    expect(screen.getByText(/Watch Now/)).toBeInTheDocument();
  });

  it('renders rating when > 0', () => {
    render(<SpotlightPreview {...defaultProps} rating={8.5} />);
    expect(screen.getByText(/8.5/)).toBeInTheDocument();
  });

  it('renders runtime', () => {
    render(<SpotlightPreview {...defaultProps} runtime={148} />);
    expect(screen.getByText('148m')).toBeInTheDocument();
  });

  it('renders certification', () => {
    render(<SpotlightPreview {...defaultProps} certification="UA" />);
    expect(screen.getByText('UA')).toBeInTheDocument();
  });

  it('applies object-position from focal point', () => {
    const { container } = render(<SpotlightPreview {...defaultProps} focusX={0.3} focusY={0.7} />);
    const img = container.querySelector('img');
    expect(img?.style.objectPosition).toBe('30% 70%');
  });

  it('does not render year when releaseDate is null', () => {
    render(<SpotlightPreview {...defaultProps} releaseDate={null as unknown as string} />);
    expect(screen.queryByText('2024')).not.toBeInTheDocument();
  });
});
