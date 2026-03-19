import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationsSummary } from '@/components/validations/ValidationsSummary';
import type { SummaryEntry } from '@/hooks/useValidationTypes';

const mockSummary: SummaryEntry[] = [
  { entity: 'movies', field: 'poster_url', total: 50, external: 10, local: 35, nullCount: 5 },
  { entity: 'movies', field: 'backdrop_url', total: 50, external: 5, local: 40, nullCount: 5 },
  { entity: 'actors', field: 'photo_url', total: 100, external: 20, local: 75, nullCount: 5 },
];

describe('ValidationsSummary', () => {
  it('renders loading spinner when isLoading is true', () => {
    const { container } = render(
      <ValidationsSummary
        summary={undefined}
        isLoading={true}
        onScan={vi.fn()}
        onScanAll={vi.fn()}
        isScanning={false}
        activeScanEntity={null}
      />,
    );
    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('renders nothing when summary is undefined and not loading', () => {
    const { container } = render(
      <ValidationsSummary
        summary={undefined}
        isLoading={false}
        onScan={vi.fn()}
        onScanAll={vi.fn()}
        isScanning={false}
        activeScanEntity={null}
      />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders summary cards with correct counts', () => {
    render(
      <ValidationsSummary
        summary={mockSummary}
        isLoading={false}
        onScan={vi.fn()}
        onScanAll={vi.fn()}
        isScanning={false}
        activeScanEntity={null}
      />,
    );
    expect(screen.getByText('Movie Posters')).toBeInTheDocument();
    expect(screen.getByText('Actor Photos')).toBeInTheDocument();
    // "50" appears in multiple cards — use getAllByText
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders Scan All button', () => {
    render(
      <ValidationsSummary
        summary={mockSummary}
        isLoading={false}
        onScan={vi.fn()}
        onScanAll={vi.fn()}
        isScanning={false}
        activeScanEntity={null}
      />,
    );
    expect(screen.getByText('Scan All')).toBeInTheDocument();
  });

  it('calls onScanAll when Scan All clicked', () => {
    const onScanAll = vi.fn();
    render(
      <ValidationsSummary
        summary={mockSummary}
        isLoading={false}
        onScan={vi.fn()}
        onScanAll={onScanAll}
        isScanning={false}
        activeScanEntity={null}
      />,
    );
    fireEvent.click(screen.getByText('Scan All'));
    expect(onScanAll).toHaveBeenCalledTimes(1);
  });

  it('calls onScan with correct entity when Scan clicked', () => {
    const onScan = vi.fn();
    render(
      <ValidationsSummary
        summary={mockSummary}
        isLoading={false}
        onScan={onScan}
        onScanAll={vi.fn()}
        isScanning={false}
        activeScanEntity={null}
      />,
    );
    // Click the first Scan button (movies)
    const scanButtons = screen.getAllByText('Scan');
    fireEvent.click(scanButtons[0]);
    expect(onScan).toHaveBeenCalledWith('movies');
  });

  it('disables Scan buttons when scanning', () => {
    render(
      <ValidationsSummary
        summary={mockSummary}
        isLoading={false}
        onScan={vi.fn()}
        onScanAll={vi.fn()}
        isScanning={true}
        activeScanEntity="movies"
      />,
    );
    const scanAllBtn = screen.getByText('Scan All').closest('button');
    expect(scanAllBtn?.disabled).toBe(true);
  });

  it('shows stat badges only for non-zero counts', () => {
    const summary: SummaryEntry[] = [
      { entity: 'platforms', field: 'logo_url', total: 10, external: 0, local: 10, nullCount: 0 },
    ];
    render(
      <ValidationsSummary
        summary={summary}
        isLoading={false}
        onScan={vi.fn()}
        onScanAll={vi.fn()}
        isScanning={false}
        activeScanEntity={null}
      />,
    );
    expect(screen.getByText('10 Local')).toBeInTheDocument();
    expect(screen.queryByText(/External/)).toBeNull();
    expect(screen.queryByText(/Null/)).toBeNull();
  });
});
