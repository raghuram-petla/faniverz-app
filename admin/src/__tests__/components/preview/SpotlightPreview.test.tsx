import { render, screen, fireEvent } from '@testing-library/react';
import { SpotlightPreview } from '@/components/preview/SpotlightPreview';

const defaultProps = {
  title: 'Pushpa 2',
  backdropUrl: 'https://example.com/backdrop.jpg',
  releaseType: 'theatrical' as const,
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

  it('shows Get Tickets for theatrical release', () => {
    render(<SpotlightPreview {...defaultProps} releaseType="theatrical" />);
    expect(screen.getByText(/Get Tickets/)).toBeInTheDocument();
  });

  it('shows Watch Now for OTT release', () => {
    render(<SpotlightPreview {...defaultProps} releaseType="ott" />);
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

  it('calls onFocusClick when backdrop is clicked', () => {
    const onFocusClick = vi.fn();
    const { container } = render(
      <SpotlightPreview {...defaultProps} onFocusClick={onFocusClick} />,
    );
    const heroDiv = container.firstChild as HTMLElement;
    // Mock getBoundingClientRect
    heroDiv.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 400,
      height: 600,
      right: 400,
      bottom: 600,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    }));
    fireEvent.click(heroDiv, { clientX: 200, clientY: 300 });
    expect(onFocusClick).toHaveBeenCalledWith(0.5, 0.5);
  });

  it('shows focus indicator when focal point is set', () => {
    const { container } = render(<SpotlightPreview {...defaultProps} focusX={0.5} focusY={0.5} />);
    const indicator = container.querySelector('[style*="border: 2px solid white"]');
    expect(indicator).toBeTruthy();
  });
});
