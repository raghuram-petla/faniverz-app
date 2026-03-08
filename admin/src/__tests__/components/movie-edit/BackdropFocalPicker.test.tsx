import { render, screen, fireEvent } from '@testing-library/react';
import { BackdropFocalPicker } from '@/components/movie-edit/BackdropFocalPicker';

const defaultProps = {
  backdropUrl: 'https://example.com/backdrop.jpg',
  focusX: null as number | null,
  focusY: null as number | null,
  onChange: vi.fn(),
  onClear: vi.fn(),
};

describe('BackdropFocalPicker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when no backdropUrl', () => {
    const { container } = render(<BackdropFocalPicker {...defaultProps} backdropUrl="" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders backdrop image and label when url is provided', () => {
    const { container } = render(<BackdropFocalPicker {...defaultProps} />);
    expect(screen.getByText(/Backdrop Focal Point/)).toBeInTheDocument();
    expect(screen.getByText(/drag the frame/)).toBeInTheDocument();
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.src).toContain('backdrop.jpg');
  });

  it('shows default focus coordinates (50%, 50%) when focus is null', () => {
    render(<BackdropFocalPicker {...defaultProps} />);
    expect(screen.getByText(/50%, 50%/)).toBeInTheDocument();
  });

  it('shows actual focus coordinates when set', () => {
    render(<BackdropFocalPicker {...defaultProps} focusX={0.3} focusY={0.7} />);
    expect(screen.getByText(/30%, 70%/)).toBeInTheDocument();
  });

  it('shows Reset button only when focus is set', () => {
    const { rerender } = render(<BackdropFocalPicker {...defaultProps} />);
    expect(screen.queryByText('Reset to Center')).not.toBeInTheDocument();

    rerender(<BackdropFocalPicker {...defaultProps} focusX={0.3} focusY={0.7} />);
    expect(screen.getByText('Reset to Center')).toBeInTheDocument();
  });

  it('calls onClear when Reset button clicked', () => {
    const onClear = vi.fn();
    render(<BackdropFocalPicker {...defaultProps} focusX={0.3} focusY={0.7} onClear={onClear} />);
    fireEvent.click(screen.getByText('Reset to Center'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('calls onChange on pointer down', () => {
    const onChange = vi.fn();
    const { container } = render(<BackdropFocalPicker {...defaultProps} onChange={onChange} />);
    const picker = container.querySelector('[style*="aspect-ratio"]') as HTMLElement;
    picker.getBoundingClientRect = vi.fn(() => ({
      left: 0,
      top: 0,
      width: 600,
      height: 337.5,
      right: 600,
      bottom: 337.5,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    }));
    // jsdom doesn't support setPointerCapture
    picker.setPointerCapture = vi.fn();
    fireEvent.pointerDown(picker, { clientX: 300, clientY: 168 });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('renders dark overlays for viewport frame', () => {
    const { container } = render(
      <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} />,
    );
    // Should have dark overlay divs (left and right)
    const overlays = container.querySelectorAll('.bg-black\\/60');
    expect(overlays.length).toBe(2);
  });

  it('renders viewport frame border', () => {
    const { container } = render(
      <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} />,
    );
    const frame = container.querySelector('.border-white\\/80');
    expect(frame).toBeTruthy();
  });
});
