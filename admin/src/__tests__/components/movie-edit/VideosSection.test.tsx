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
  // @sync: empty Set for non-pending test cases — matches new pendingIds prop requirement
  pendingIds: new Set<string>(),
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

  it('calls onRemove with isPending=true for pending videos (UUID _id)', () => {
    const onRemove = vi.fn();
    const pendingUuid = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';
    const pendingVideo = {
      ...mockVideo,
      // @sync: after _id migration, pending items use plain UUIDs, not 'pending-video-N' strings
      id: pendingUuid,
      title: 'Pending Teaser',
    };
    render(
      <VideosSection
        {...defaultProps}
        visibleVideos={[pendingVideo]}
        onRemove={onRemove}
        pendingIds={new Set([pendingUuid])}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove Pending Teaser'));
    expect(onRemove).toHaveBeenCalledWith(pendingUuid, true);
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

  it('renders YouTube thumbnail for each video', () => {
    render(<VideosSection {...defaultProps} visibleVideos={[mockVideo]} />);
    const playBtn = screen.getByLabelText('Play Official Trailer');
    expect(playBtn).toBeInTheDocument();
    const img = playBtn.querySelector('img');
    expect(img?.getAttribute('src')).toContain('abc12345678');
  });

  it('loads iframe with autoplay when thumbnail is clicked', () => {
    const { container } = render(<VideosSection {...defaultProps} visibleVideos={[mockVideo]} />);
    fireEvent.click(screen.getByLabelText('Play Official Trailer'));
    const iframe = container.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect(iframe?.getAttribute('src')).toContain('abc12345678');
    expect(iframe?.getAttribute('src')).toContain('autoplay=1');
  });

  it('submits add form with valid YouTube URL and calls onAdd', () => {
    const onAdd = vi.fn();
    const onCloseAddForm = vi.fn();
    // Mock crypto.randomUUID
    const origRandomUUID = crypto.randomUUID;
    crypto.randomUUID = vi.fn().mockReturnValue('test-uuid-123');

    render(
      <VideosSection
        {...defaultProps}
        showAddForm={true}
        onAdd={onAdd}
        onCloseAddForm={onCloseAddForm}
      />,
    );

    // Fill in YouTube URL
    const urlInput = screen.getByPlaceholderText(/youtube\.com/);
    fireEvent.change(urlInput, { target: { value: 'https://youtube.com/watch?v=dQw4w9WgXcQ' } });

    // Fill in title
    const titleInput = screen.getByPlaceholderText(/Official Trailer/);
    fireEvent.change(titleInput, { target: { value: 'My Trailer' } });

    // Submit
    fireEvent.submit(screen.getByText('Add Video').closest('form')!);

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        youtube_id: 'dQw4w9WgXcQ',
        title: 'My Trailer',
        video_type: 'trailer',
      }),
    );
    expect(onCloseAddForm).toHaveBeenCalled();

    crypto.randomUUID = origRandomUUID;
  });

  it('shows alert for invalid YouTube URL on form submit', () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    render(<VideosSection {...defaultProps} showAddForm={true} />);

    // Fill in invalid URL
    const urlInput = screen.getByPlaceholderText(/youtube\.com/);
    fireEvent.change(urlInput, { target: { value: 'invalid' } });

    // Fill in title
    const titleInput = screen.getByPlaceholderText(/Official Trailer/);
    fireEvent.change(titleInput, { target: { value: 'Title' } });

    // Submit
    fireEvent.submit(screen.getByText('Add Video').closest('form')!);

    expect(alertSpy).toHaveBeenCalledWith(
      'Invalid YouTube URL or ID. Please enter a valid YouTube video link.',
    );
    alertSpy.mockRestore();
  });

  it('shows YouTube preview when valid URL is entered in form', () => {
    const { container } = render(<VideosSection {...defaultProps} showAddForm={true} />);

    const urlInput = screen.getByPlaceholderText(/youtube\.com/);
    fireEvent.change(urlInput, { target: { value: 'dQw4w9WgXcQ' } });

    // Preview thumbnail should appear
    const preview = screen.getByLabelText('Play YouTube preview');
    expect(preview).toBeInTheDocument();
  });

  it('does not show video_date when it is null', () => {
    const videoNoDate = { ...mockVideo, video_date: null };
    render(<VideosSection {...defaultProps} visibleVideos={[videoNoDate]} />);
    expect(screen.queryByText('2026-01-15')).not.toBeInTheDocument();
  });

  it('changes video type in the form', () => {
    render(<VideosSection {...defaultProps} showAddForm={true} />);
    // Find the select element for video type
    const selects = document.querySelectorAll('select');
    const typeSelect = Array.from(selects).find((s) =>
      Array.from(s.options).some((o) => o.value === 'teaser'),
    );
    if (typeSelect) {
      fireEvent.change(typeSelect, { target: { value: 'teaser' } });
    }
  });

  it('changes video date in the form', () => {
    render(<VideosSection {...defaultProps} showAddForm={true} />);
    // FormInput with type="date"
    const dateInputs = document.querySelectorAll('input[type="date"]');
    if (dateInputs.length > 0) {
      fireEvent.change(dateInputs[0], { target: { value: '2026-06-15' } });
    }
  });

  it('shows legacy trailer when trailerUrl is valid and not in gallery', () => {
    render(<VideosSection {...defaultProps} trailerUrl="https://youtu.be/legacyXYZab" />);
    expect(screen.getByText('Test Movie - Official Trailer')).toBeInTheDocument();
  });

  it('renders "Movie" fallback title for legacy trailer when movieTitle is empty', () => {
    render(
      <VideosSection {...defaultProps} trailerUrl="https://youtu.be/legacyXYZab" movieTitle="" />,
    );
    expect(screen.getByText('Movie - Official Trailer')).toBeInTheDocument();
  });

  it('shows video type fallback when type is not in VIDEO_TYPES', () => {
    const unknownTypeVideo = { ...mockVideo, video_type: 'custom_type' as never };
    render(<VideosSection {...defaultProps} visibleVideos={[unknownTypeVideo]} />);
    expect(screen.getByText('custom_type')).toBeInTheDocument();
  });
});
