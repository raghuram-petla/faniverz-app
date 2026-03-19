import { render, screen, fireEvent } from '@testing-library/react';
import { VideosSection } from '@/components/movie-edit/VideosSection';
import type { MovieVideo } from '@/lib/types';

// @contract mock extractYouTubeId to control parsing behavior in tests
vi.mock('@/lib/youtube', () => ({
  extractYouTubeId: (input: string) => {
    if (input === 'invalid') return null;
    if (input.length === 11) return input;
    const match = input.match(/[?&]v=([^&]+)/);
    return match ? match[1] : input.replace('https://youtu.be/', '');
  },
}));

const mockVideo: MovieVideo = {
  id: 'vid-1',
  movie_id: 'movie-1',
  youtube_id: 'abc12345678',
  title: 'Official Trailer',
  description: null,
  video_type: 'trailer',
  video_date: '2026-01-15',
  display_order: 0,
  created_at: '2026-01-01T00:00:00Z',
};

const defaultProps = {
  visibleVideos: [] as MovieVideo[],
  trailerUrl: '',
  movieTitle: 'Test Movie',
  onAdd: vi.fn(),
  onRemove: vi.fn(),
  onClearTrailerUrl: vi.fn(),
  showAddForm: false,
  onCloseAddForm: vi.fn(),
};

describe('VideosSection', () => {
  afterEach(() => vi.clearAllMocks());

  it('renders empty state when no videos', () => {
    const { container } = render(<VideosSection {...defaultProps} />);
    expect(container.querySelector('.grid')).toBeNull();
  });

  it('renders video cards with title and type badge', () => {
    render(<VideosSection {...defaultProps} visibleVideos={[mockVideo]} />);
    expect(screen.getByText('Official Trailer')).toBeInTheDocument();
    expect(screen.getByText('Trailer')).toBeInTheDocument();
  });

  it('shows video date when present', () => {
    render(<VideosSection {...defaultProps} visibleVideos={[mockVideo]} />);
    expect(screen.getByText('2026-01-15')).toBeInTheDocument();
  });

  it('renders remove button for regular videos', () => {
    render(<VideosSection {...defaultProps} visibleVideos={[mockVideo]} />);
    expect(screen.getByLabelText('Remove Official Trailer')).toBeInTheDocument();
  });

  it('calls onRemove when remove button clicked for regular video', () => {
    const onRemove = vi.fn();
    render(<VideosSection {...defaultProps} visibleVideos={[mockVideo]} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove Official Trailer'));
    expect(onRemove).toHaveBeenCalledWith('vid-1', false);
  });

  it('calls onRemove with isPending=true for pending videos', () => {
    const onRemove = vi.fn();
    const pendingVideo = {
      ...mockVideo,
      id: 'pending-video-0',
      title: 'Pending Teaser',
    };
    render(<VideosSection {...defaultProps} visibleVideos={[pendingVideo]} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove Pending Teaser'));
    expect(onRemove).toHaveBeenCalledWith('pending-video-0', true);
  });

  // @contract legacy trailer from trailer_url field must also have a remove button
  it('renders remove button for legacy trailer', () => {
    render(<VideosSection {...defaultProps} trailerUrl="https://youtu.be/legacyYTid1" />);
    expect(screen.getByLabelText('Remove Test Movie - Official Trailer')).toBeInTheDocument();
  });

  it('calls onClearTrailerUrl when legacy trailer remove button clicked', () => {
    const onClearTrailerUrl = vi.fn();
    render(
      <VideosSection
        {...defaultProps}
        trailerUrl="https://youtu.be/legacyYTid1"
        onClearTrailerUrl={onClearTrailerUrl}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove Test Movie - Official Trailer'));
    expect(onClearTrailerUrl).toHaveBeenCalled();
  });

  it('does not duplicate legacy trailer if already in gallery', () => {
    const videoMatchingLegacy = { ...mockVideo, youtube_id: 'legacyYTid1' };
    render(
      <VideosSection
        {...defaultProps}
        visibleVideos={[videoMatchingLegacy]}
        trailerUrl="https://youtu.be/legacyYTid1"
      />,
    );
    // Should only show one video card, not two
    const removeButtons = screen.getAllByLabelText(/^Remove /);
    expect(removeButtons).toHaveLength(1);
  });

  it('hides add form when showAddForm is false', () => {
    render(<VideosSection {...defaultProps} showAddForm={false} />);
    expect(screen.queryByText('Add Video')).not.toBeInTheDocument();
  });

  it('shows add form when showAddForm is true', () => {
    render(<VideosSection {...defaultProps} showAddForm={true} />);
    expect(screen.getByText('Add Video')).toBeInTheDocument();
  });

  it('calls onCloseAddForm when Cancel is clicked', () => {
    const onCloseAddForm = vi.fn();
    render(<VideosSection {...defaultProps} showAddForm={true} onCloseAddForm={onCloseAddForm} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCloseAddForm).toHaveBeenCalled();
  });

  it('disables Add Video button when fields are empty', () => {
    render(<VideosSection {...defaultProps} showAddForm={true} />);
    expect(screen.getByText('Add Video')).toBeDisabled();
  });

  it('renders YouTube iframe for each video', () => {
    const { container } = render(<VideosSection {...defaultProps} visibleVideos={[mockVideo]} />);
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toContain('abc12345678');
  });
});
