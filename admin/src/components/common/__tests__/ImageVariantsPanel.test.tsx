import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUseImageVariants = vi.fn();
const mockClipboard = { writeText: vi.fn() };

vi.mock('@/hooks/useImageVariants', () => ({
  useImageVariants: (...args: unknown[]) => mockUseImageVariants(...args),
}));

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: mockClipboard,
  writable: true,
  configurable: true,
});

import { ImageVariantsPanel } from '../ImageVariantsPanel';

const makeVariants = (statusOverride = 'ok') => [
  {
    label: 'Original',
    url: 'https://cdn.example.com/original.jpg',
    width: null,
    quality: null,
    status: statusOverride,
  },
  {
    label: 'SM',
    url: 'https://cdn.example.com/sm.jpg',
    width: 300,
    quality: 80,
    status: statusOverride,
  },
  {
    label: 'MD',
    url: 'https://cdn.example.com/md.jpg',
    width: 600,
    quality: 80,
    status: statusOverride,
  },
  {
    label: 'LG',
    url: 'https://cdn.example.com/lg.jpg',
    width: 1200,
    quality: 80,
    status: statusOverride,
  },
];

describe('ImageVariantsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseImageVariants.mockReturnValue({
      variants: makeVariants(),
      isChecking: false,
      readyCount: 4,
      totalCount: 4,
      recheck: vi.fn(),
    });
  });

  it('renders nothing when originalUrl is null', () => {
    const { container } = render(
      <ImageVariantsPanel originalUrl={null} variantType="poster" bucket="POSTERS" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders collapsed panel button when originalUrl is provided', () => {
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    expect(screen.getByText(/Image Pipeline/i)).toBeTruthy();
  });

  it('shows checking state summary text', () => {
    mockUseImageVariants.mockReturnValue({
      variants: makeVariants('checking'),
      isChecking: true,
      readyCount: 0,
      totalCount: 4,
      recheck: vi.fn(),
    });
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    expect(screen.getByText(/Checking variants/i)).toBeTruthy();
  });

  it('shows ready count summary when not checking', () => {
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    expect(screen.getByText(/4\/4 variants ready/i)).toBeTruthy();
  });

  it('expands to show variant rows when button clicked', () => {
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    fireEvent.click(screen.getByText(/Image Pipeline/i).closest('button')!);
    expect(screen.getByText('SM')).toBeTruthy();
    expect(screen.getByText('MD')).toBeTruthy();
    expect(screen.getByText('LG')).toBeTruthy();
    expect(screen.getByText('Original')).toBeTruthy();
  });

  it('shows "Full size" for original variant', () => {
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    fireEvent.click(screen.getByText(/Image Pipeline/i).closest('button')!);
    expect(screen.getByText('Full size')).toBeTruthy();
  });

  it('shows specs for sized variants', () => {
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    fireEvent.click(screen.getByText(/Image Pipeline/i).closest('button')!);
    expect(screen.getByText('300px @ q80')).toBeTruthy();
  });

  it('shows Recheck button when expanded', () => {
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    fireEvent.click(screen.getByText(/Image Pipeline/i).closest('button')!);
    expect(screen.getByText('Recheck')).toBeTruthy();
  });

  it('calls recheck when Recheck button clicked', () => {
    const recheck = vi.fn();
    mockUseImageVariants.mockReturnValue({
      variants: makeVariants(),
      isChecking: false,
      readyCount: 4,
      totalCount: 4,
      recheck,
    });
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    fireEvent.click(screen.getByText(/Image Pipeline/i).closest('button')!);
    fireEvent.click(screen.getByText('Recheck'));
    expect(recheck).toHaveBeenCalled();
  });

  it('copies URL to clipboard when copy button clicked', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined);
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    fireEvent.click(screen.getByText(/Image Pipeline/i).closest('button')!);
    const copyButtons = screen.getAllByTitle('Copy URL');
    fireEvent.click(copyButtons[0]);
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalled();
    });
  });

  it('shows green dot when all variants ready', () => {
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    // Green dot from SummaryDot rendered in toggle button
    const greenDots = document.querySelectorAll('.bg-green-500.rounded-full');
    expect(greenDots.length).toBeGreaterThan(0);
  });

  it('shows yellow dot when some variants ready', () => {
    mockUseImageVariants.mockReturnValue({
      variants: makeVariants('ok'),
      isChecking: false,
      readyCount: 2,
      totalCount: 4,
      recheck: vi.fn(),
    });
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    const yellowDots = document.querySelectorAll('.bg-yellow-500.rounded-full');
    expect(yellowDots.length).toBeGreaterThan(0);
  });

  it('shows red dot when no variants ready', () => {
    mockUseImageVariants.mockReturnValue({
      variants: makeVariants('missing'),
      isChecking: false,
      readyCount: 0,
      totalCount: 4,
      recheck: vi.fn(),
    });
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    const redDots = document.querySelectorAll('.bg-red-500.rounded-full');
    expect(redDots.length).toBeGreaterThan(0);
  });

  it('shows status dots for missing variant rows', () => {
    const variants = makeVariants('ok');
    variants[1].status = 'missing';
    mockUseImageVariants.mockReturnValue({
      variants,
      isChecking: false,
      readyCount: 3,
      totalCount: 4,
      recheck: vi.fn(),
    });
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    fireEvent.click(screen.getByText(/Image Pipeline/i).closest('button')!);
    // red dot for missing status
    const redDots = document.querySelectorAll('.bg-red-500.rounded-full');
    expect(redDots.length).toBeGreaterThan(0);
  });

  it('collapses panel when button clicked again', () => {
    render(<ImageVariantsPanel originalUrl="/poster.jpg" variantType="poster" bucket="POSTERS" />);
    const btn = screen.getByText(/Image Pipeline/i).closest('button')!;
    fireEvent.click(btn); // open
    expect(screen.getByText('Recheck')).toBeTruthy();
    fireEvent.click(btn); // close
    expect(screen.queryByText('Recheck')).toBeNull();
  });

  it('passes originalUrl, variantType, and bucket to useImageVariants', () => {
    render(
      <ImageVariantsPanel originalUrl="/my-image.jpg" variantType="backdrop" bucket="BACKDROPS" />,
    );
    expect(mockUseImageVariants).toHaveBeenCalledWith('/my-image.jpg', 'backdrop', 'BACKDROPS');
  });
});
