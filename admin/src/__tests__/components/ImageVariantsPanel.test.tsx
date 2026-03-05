import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ImageVariantsPanel } from '@/components/common/ImageVariantsPanel';

const mockUseImageVariants = vi.fn();

vi.mock('@/hooks/useImageVariants', () => ({
  useImageVariants: (...args: unknown[]) => mockUseImageVariants(...args),
}));

vi.mock('lucide-react', () => ({
  ChevronDown: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="chevron-down" {...props} />
  ),
  ChevronRight: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="chevron-right" {...props} />
  ),
  Copy: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="copy-icon" {...props} />,
  Check: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="check-icon" {...props} />,
  RefreshCw: (props: React.SVGProps<SVGSVGElement>) => (
    <svg data-testid="refresh-icon" {...props} />
  ),
  Loader2: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="loader-icon" {...props} />,
}));

const mockVariants = [
  {
    label: 'Original',
    url: 'https://r2.dev/abc.jpg',
    width: null,
    quality: null,
    status: 'ok' as const,
  },
  { label: 'SM', url: 'https://r2.dev/abc_sm.jpg', width: 200, quality: 80, status: 'ok' as const },
  {
    label: 'MD',
    url: 'https://r2.dev/abc_md.jpg',
    width: 400,
    quality: 85,
    status: 'missing' as const,
  },
  { label: 'LG', url: 'https://r2.dev/abc_lg.jpg', width: 800, quality: 90, status: 'ok' as const },
];

const mockRecheck = vi.fn();

describe('ImageVariantsPanel', () => {
  beforeEach(() => {
    mockRecheck.mockClear();
    mockUseImageVariants.mockReturnValue({
      variants: mockVariants,
      isChecking: false,
      readyCount: 3,
      totalCount: 4,
      recheck: mockRecheck,
    });
  });

  it('renders nothing when originalUrl is null', () => {
    const { container } = render(<ImageVariantsPanel originalUrl={null} variantType="poster" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when originalUrl is empty string', () => {
    mockUseImageVariants.mockReturnValue({
      variants: [],
      isChecking: false,
      readyCount: 0,
      totalCount: 0,
      recheck: mockRecheck,
    });
    const { container } = render(<ImageVariantsPanel originalUrl="" variantType="poster" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders summary with correct counts', () => {
    render(<ImageVariantsPanel originalUrl="https://r2.dev/abc.jpg" variantType="poster" />);
    expect(screen.getByText(/3\/4 variants ready/)).toBeInTheDocument();
  });

  it('shows checking text while loading', () => {
    mockUseImageVariants.mockReturnValue({
      variants: mockVariants.map((v) => ({ ...v, status: 'checking' as const })),
      isChecking: true,
      readyCount: 0,
      totalCount: 4,
      recheck: mockRecheck,
    });
    render(<ImageVariantsPanel originalUrl="https://r2.dev/abc.jpg" variantType="poster" />);
    expect(screen.getByText(/Checking variants\.\.\./)).toBeInTheDocument();
  });

  it('expands to show variant rows when clicked', () => {
    render(<ImageVariantsPanel originalUrl="https://r2.dev/abc.jpg" variantType="poster" />);

    expect(screen.queryByText('Full size')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText(/3\/4 variants ready/));

    expect(screen.getByText('Full size')).toBeInTheDocument();
    expect(screen.getByText('Original')).toBeInTheDocument();
    expect(screen.getByText('SM')).toBeInTheDocument();
    expect(screen.getByText('MD')).toBeInTheDocument();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });

  it('shows specs for each variant when expanded', () => {
    render(<ImageVariantsPanel originalUrl="https://r2.dev/abc.jpg" variantType="poster" />);
    fireEvent.click(screen.getByText(/3\/4 variants ready/));

    expect(screen.getByText('Full size')).toBeInTheDocument();
    expect(screen.getByText('200px @ q80')).toBeInTheDocument();
    expect(screen.getByText('400px @ q85')).toBeInTheDocument();
    expect(screen.getByText('800px @ q90')).toBeInTheDocument();
  });

  it('shows copy buttons for each variant when expanded', () => {
    render(<ImageVariantsPanel originalUrl="https://r2.dev/abc.jpg" variantType="poster" />);
    fireEvent.click(screen.getByText(/3\/4 variants ready/));

    const copyButtons = screen.getAllByTitle('Copy URL');
    expect(copyButtons).toHaveLength(4);
  });

  it('copies URL to clipboard when copy button clicked', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<ImageVariantsPanel originalUrl="https://r2.dev/abc.jpg" variantType="poster" />);
    fireEvent.click(screen.getByText(/3\/4 variants ready/));

    const copyButtons = screen.getAllByTitle('Copy URL');
    fireEvent.click(copyButtons[0]);

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith('https://r2.dev/abc.jpg');
    });
  });

  it('calls recheck when Recheck button is clicked', () => {
    render(<ImageVariantsPanel originalUrl="https://r2.dev/abc.jpg" variantType="poster" />);
    fireEvent.click(screen.getByText(/3\/4 variants ready/));

    fireEvent.click(screen.getByText('Recheck'));
    expect(mockRecheck).toHaveBeenCalledTimes(1);
  });

  it('passes correct variantType to the hook', () => {
    render(<ImageVariantsPanel originalUrl="https://r2.dev/abc.jpg" variantType="backdrop" />);
    expect(mockUseImageVariants).toHaveBeenCalledWith('https://r2.dev/abc.jpg', 'backdrop');
  });

  it('renders thumbnails with correct src when expanded', () => {
    render(<ImageVariantsPanel originalUrl="https://r2.dev/abc.jpg" variantType="poster" />);
    fireEvent.click(screen.getByText(/3\/4 variants ready/));

    const images = screen.getAllByRole('img');
    expect(images[0]).toHaveAttribute('src', 'https://r2.dev/abc.jpg');
    expect(images[1]).toHaveAttribute('src', 'https://r2.dev/abc_sm.jpg');
    expect(images[2]).toHaveAttribute('src', 'https://r2.dev/abc_md.jpg');
    expect(images[3]).toHaveAttribute('src', 'https://r2.dev/abc_lg.jpg');
  });
});
