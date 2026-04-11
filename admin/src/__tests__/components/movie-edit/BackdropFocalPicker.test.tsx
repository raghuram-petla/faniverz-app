import { render, screen, fireEvent } from '@testing-library/react';
import { BackdropFocalPicker } from '@/components/movie-edit/BackdropFocalPicker';

const defaultProps = {
  backdropUrl: 'https://example.com/backdrop.jpg',
  focusX: null as number | null,
  focusY: null as number | null,
  onChange: vi.fn(),
  onClear: vi.fn(),
};

/** Simulate image load with given natural dimensions */
function simulateImageLoad(container: HTMLElement, width: number, height: number) {
  const img = container.querySelector('img')!;
  Object.defineProperty(img, 'naturalWidth', { value: width, configurable: true });
  Object.defineProperty(img, 'naturalHeight', { value: height, configurable: true });
  fireEvent.load(img);
}

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
    expect(screen.getByText(/Focal Point/)).toBeInTheDocument();
    const img = container.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.src).toContain('backdrop.jpg');
  });

  it('shows "loading…" hint before image loads', () => {
    render(<BackdropFocalPicker {...defaultProps} />);
    expect(screen.getByText(/loading…/)).toBeInTheDocument();
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

  describe('landscape image (horizontal panning)', () => {
    it('shows "drag left / right" hint after load', () => {
      const { container } = render(<BackdropFocalPicker {...defaultProps} />);
      simulateImageLoad(container, 1920, 1080);
      expect(screen.getByText(/drag left \/ right/)).toBeInTheDocument();
    });

    it('renders left/right dark overlays', () => {
      const { container } = render(
        <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} />,
      );
      simulateImageLoad(container, 1920, 1080);
      const overlays = container.querySelectorAll('.bg-black\\/60');
      expect(overlays.length).toBe(2);
      expect(overlays[0].className).toContain('left-0');
      expect(overlays[1].className).toContain('right-0');
    });

    it('renders viewport frame border', () => {
      const { container } = render(
        <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} />,
      );
      simulateImageLoad(container, 1920, 1080);
      const frame = container.querySelector('.border-white\\/80');
      expect(frame).toBeTruthy();
    });

    it('renders gradient overlay inside frame', () => {
      const { container } = render(
        <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} />,
      );
      simulateImageLoad(container, 1920, 1080);
      const gradientDiv = container.querySelector('[style*="linear-gradient"]');
      expect(gradientDiv).toBeTruthy();
    });

    it('calls onChange on pointer down (updates X)', () => {
      const onChange = vi.fn();
      const { container } = render(<BackdropFocalPicker {...defaultProps} onChange={onChange} />);
      simulateImageLoad(container, 1920, 1080);
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
      picker.setPointerCapture = vi.fn();
      fireEvent.pointerDown(picker, { clientX: 300, clientY: 168 });
      expect(onChange).toHaveBeenCalledTimes(1);
      // Y should remain at default 0.5
      expect(onChange.mock.calls[0][1]).toBe(0.5);
    });
  });

  describe('portrait image (vertical panning)', () => {
    it('shows "drag up / down" hint after load', () => {
      const { container } = render(<BackdropFocalPicker {...defaultProps} />);
      simulateImageLoad(container, 1080, 1920);
      expect(screen.getByText(/drag up \/ down/)).toBeInTheDocument();
    });

    it('renders top/bottom dark overlays', () => {
      const { container } = render(
        <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} />,
      );
      simulateImageLoad(container, 1080, 1920);
      const overlays = container.querySelectorAll('.bg-black\\/60');
      expect(overlays.length).toBe(2);
      expect(overlays[0].className).toContain('top-0');
      expect(overlays[1].className).toContain('bottom-0');
    });

    it('renders viewport frame border', () => {
      const { container } = render(
        <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} />,
      );
      simulateImageLoad(container, 1080, 1920);
      const frame = container.querySelector('.border-white\\/80');
      expect(frame).toBeTruthy();
    });

    it('renders gradient overlay inside frame', () => {
      const { container } = render(
        <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} />,
      );
      simulateImageLoad(container, 1080, 1920);
      const gradientDiv = container.querySelector('[style*="linear-gradient"]');
      expect(gradientDiv).toBeTruthy();
    });

    it('calls onChange on pointer down (updates Y)', () => {
      const onChange = vi.fn();
      const { container } = render(<BackdropFocalPicker {...defaultProps} onChange={onChange} />);
      simulateImageLoad(container, 1080, 1920);
      const picker = container.querySelector('[style*="aspect-ratio"]') as HTMLElement;
      picker.getBoundingClientRect = vi.fn(() => ({
        left: 0,
        top: 0,
        width: 400,
        height: 711,
        right: 400,
        bottom: 711,
        x: 0,
        y: 0,
        toJSON: vi.fn(),
      }));
      picker.setPointerCapture = vi.fn();
      fireEvent.pointerDown(picker, { clientX: 200, clientY: 355 });
      expect(onChange).toHaveBeenCalledTimes(1);
      // X should remain at default 0.5
      expect(onChange.mock.calls[0][0]).toBe(0.5);
    });
  });

  describe('pointer move and up events', () => {
    it('calls onChange on pointer move while dragging', () => {
      const onChange = vi.fn();
      const { container } = render(<BackdropFocalPicker {...defaultProps} onChange={onChange} />);
      simulateImageLoad(container, 1920, 1080);
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
      picker.setPointerCapture = vi.fn();
      // Start drag
      fireEvent.pointerDown(picker, { clientX: 300, clientY: 168 });
      expect(onChange).toHaveBeenCalledTimes(1);
      // Move while dragging
      fireEvent.pointerMove(picker, { clientX: 400, clientY: 168 });
      expect(onChange).toHaveBeenCalledTimes(2);
    });

    it('does not call onChange on pointer move when not dragging', () => {
      const onChange = vi.fn();
      const { container } = render(<BackdropFocalPicker {...defaultProps} onChange={onChange} />);
      simulateImageLoad(container, 1920, 1080);
      const picker = container.querySelector('[style*="aspect-ratio"]') as HTMLElement;
      // Move without prior pointerDown
      fireEvent.pointerMove(picker, { clientX: 300, clientY: 168 });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('stops dragging on pointer up', () => {
      const onChange = vi.fn();
      const { container } = render(<BackdropFocalPicker {...defaultProps} onChange={onChange} />);
      simulateImageLoad(container, 1920, 1080);
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
      picker.setPointerCapture = vi.fn();
      // Start drag
      fireEvent.pointerDown(picker, { clientX: 300, clientY: 168 });
      // End drag
      fireEvent.pointerUp(picker);
      // Move after pointer up — should NOT trigger onChange
      fireEvent.pointerMove(picker, { clientX: 400, clientY: 168 });
      // Only 1 call from pointerDown, not from pointerMove after up
      expect(onChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('hideGradient prop', () => {
    it('hides gradient overlay when hideGradient is true', () => {
      const { container } = render(
        <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} hideGradient />,
      );
      simulateImageLoad(container, 1920, 1080);
      // Frame border should still exist
      expect(container.querySelector('.border-white\\/80')).toBeTruthy();
      // Gradient should NOT exist
      expect(container.querySelector('[style*="linear-gradient"]')).toBeNull();
    });
  });

  describe('targetAspect prop', () => {
    it('uses custom targetAspect for frame calculations', () => {
      const onChange = vi.fn();
      const { container } = render(
        <BackdropFocalPicker {...defaultProps} onChange={onChange} targetAspect={2 / 3} />,
      );
      // 1080x1920 image with 2/3 target → portrait target on portrait image
      // imageAspect = 1080/1920 = 0.5625, targetAspect = 0.667 → vertical panning
      simulateImageLoad(container, 1080, 1920);
      expect(screen.getByText(/drag up \/ down/)).toBeInTheDocument();
    });
  });

  describe('image load with 0 dimensions', () => {
    it('does not set aspect ratio when naturalWidth is 0', () => {
      const { container } = render(<BackdropFocalPicker {...defaultProps} />);
      const img = container.querySelector('img')!;
      Object.defineProperty(img, 'naturalWidth', { value: 0, configurable: true });
      Object.defineProperty(img, 'naturalHeight', { value: 0, configurable: true });
      fireEvent.load(img);
      // Should still show loading hint since imageAspect wasn't set
      expect(screen.getByText(/loading…/)).toBeInTheDocument();
    });
  });

  describe('matching aspect ratio (no panning)', () => {
    it('shows "image fits perfectly" hint', () => {
      const { container } = render(<BackdropFocalPicker {...defaultProps} />);
      // heroAspect = 430/320 — use exact multiples
      simulateImageLoad(container, 430, 320);
      expect(screen.getByText(/image fits perfectly/)).toBeInTheDocument();
    });

    it('renders no overlays or frame', () => {
      const { container } = render(
        <BackdropFocalPicker {...defaultProps} focusX={0.5} focusY={0.5} />,
      );
      simulateImageLoad(container, 430, 320);
      expect(container.querySelectorAll('.bg-black\\/60').length).toBe(0);
      expect(container.querySelector('.border-white\\/80')).toBeNull();
      expect(container.querySelector('[style*="linear-gradient"]')).toBeNull();
    });
  });
});
