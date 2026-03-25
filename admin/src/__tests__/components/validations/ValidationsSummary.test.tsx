import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidationsSummary } from '@/components/validations/ValidationsSummary';
import type { SummaryEntry } from '@/hooks/useValidationTypes';

const mockSummary: SummaryEntry[] = [
  { entity: 'movies', field: 'poster_url', total: 50, external: 10, local: 35, nullCount: 5 },
  { entity: 'movies', field: 'backdrop_url', total: 50, external: 5, local: 40, nullCount: 5 },
  { entity: 'actors', field: 'photo_url', total: 100, external: 20, local: 75, nullCount: 5 },
];

const defaultProps = {
  summary: mockSummary,
  isLoading: false,
  onScan: vi.fn(),
  onDeepScan: vi.fn(),
  onScanAll: vi.fn(),
  isScanning: false,
  activeScanEntity: null,
};

describe('ValidationsSummary', () => {
  it('renders loading spinner when isLoading is true', () => {
    const { container } = render(
      <ValidationsSummary {...defaultProps} summary={undefined} isLoading={true} />,
    );
    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('renders nothing when summary is undefined and not loading', () => {
    const { container } = render(
      <ValidationsSummary {...defaultProps} summary={undefined} isLoading={false} />,
    );
    expect(container.innerHTML).toBe('');
  });

  it('renders summary cards with correct counts', () => {
    render(<ValidationsSummary {...defaultProps} />);
    expect(screen.getByText('Movie Posters')).toBeInTheDocument();
    expect(screen.getByText('Actor Photos')).toBeInTheDocument();
    // "50" appears in multiple cards — use getAllByText
    expect(screen.getAllByText('50').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('100')).toBeInTheDocument();
  });

  it('renders Scan All button', () => {
    render(<ValidationsSummary {...defaultProps} />);
    expect(screen.getByText('Scan All')).toBeInTheDocument();
  });

  it('calls onScanAll when Scan All clicked', () => {
    const onScanAll = vi.fn();
    render(<ValidationsSummary {...defaultProps} onScanAll={onScanAll} />);
    fireEvent.click(screen.getByText('Scan All'));
    expect(onScanAll).toHaveBeenCalledTimes(1);
  });

  it('calls onScan with correct entity when Scan clicked', () => {
    const onScan = vi.fn();
    render(<ValidationsSummary {...defaultProps} onScan={onScan} />);
    // Click the first Scan button (movies)
    const scanButtons = screen.getAllByText('Scan');
    fireEvent.click(scanButtons[0]);
    expect(onScan).toHaveBeenCalledWith('movies');
  });

  it('calls onDeepScan with correct entity when Deep clicked', () => {
    const onDeepScan = vi.fn();
    render(<ValidationsSummary {...defaultProps} onDeepScan={onDeepScan} />);
    const deepButtons = screen.getAllByText('Deep');
    fireEvent.click(deepButtons[0]);
    expect(onDeepScan).toHaveBeenCalledWith('movies');
  });

  it('disables Scan buttons when scanning', () => {
    render(<ValidationsSummary {...defaultProps} isScanning={true} activeScanEntity="movies" />);
    const scanAllBtn = screen.getByText('Scan All').closest('button');
    expect(scanAllBtn?.disabled).toBe(true);
  });

  it('shows stat badges only for non-zero counts', () => {
    const summary: SummaryEntry[] = [
      { entity: 'platforms', field: 'logo_url', total: 10, external: 0, local: 10, nullCount: 0 },
    ];
    render(<ValidationsSummary {...defaultProps} summary={summary} />);
    expect(screen.getByText('10 Local')).toBeInTheDocument();
    expect(screen.queryByText(/External/)).toBeNull();
    expect(screen.queryByText(/Null/)).toBeNull();
  });

  it('falls back to raw entity:field key when ENTITY_LABELS has no match', () => {
    const summary: SummaryEntry[] = [
      {
        entity: 'unknown_entity',
        field: 'unknown_field',
        total: 5,
        external: 0,
        local: 5,
        nullCount: 0,
      },
    ];
    render(<ValidationsSummary {...defaultProps} summary={summary} />);
    // Should show the raw key as label
    expect(screen.getByText('unknown_entity:unknown_field')).toBeInTheDocument();
  });

  it('does not show scan button when entity has no ENTITY_MAP entry', () => {
    const summary: SummaryEntry[] = [
      {
        entity: 'unknown_entity',
        field: 'unknown_field',
        total: 5,
        external: 0,
        local: 5,
        nullCount: 0,
      },
    ];
    render(<ValidationsSummary {...defaultProps} summary={summary} />);
    // No Scan button should be shown for unmapped entities
    expect(screen.queryByText('Scan')).not.toBeInTheDocument();
  });
});
