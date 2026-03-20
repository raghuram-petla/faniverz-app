import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}));

import { ValidationsScanPanel } from '@/components/validations/ValidationsScanPanel';
import type { ScanResult } from '@/hooks/useValidationTypes';

const localOk: ScanResult = {
  id: 'mov-1',
  entity: 'movies',
  field: 'poster_url',
  currentUrl: '12345.jpg',
  urlType: 'local',
  originalExists: true,
  variants: { sm: true, md: true, lg: true },
  entityLabel: 'Good Movie',
  tmdbId: 100,
};

const externalIssue: ScanResult = {
  id: 'mov-2',
  entity: 'movies',
  field: 'poster_url',
  currentUrl: 'https://image.tmdb.org/t/p/w500/abc.jpg',
  urlType: 'external',
  originalExists: null,
  variants: { sm: null, md: null, lg: null },
  entityLabel: 'External Movie',
  tmdbId: 200,
};

const missingVariant: ScanResult = {
  id: 'mov-3',
  entity: 'movies',
  field: 'poster_url',
  currentUrl: 'test.jpg',
  urlType: 'local',
  originalExists: true,
  variants: { sm: true, md: false, lg: false },
  entityLabel: 'Missing Variants Movie',
  tmdbId: 300,
};

const defaultProps = {
  results: [localOk, externalIssue, missingVariant],
  totalResultCount: 3,
  selectedItems: new Set<string>(),
  onToggle: vi.fn(),
  onSelectAllIssues: vi.fn(),
  onDeselectAll: vi.fn(),
  onFix: vi.fn(),
  onFixSingle: vi.fn(),
  fixProgress: null,
  scanProgress: null,
  isReadOnly: false,
  activeFilter: 'all' as const,
  onFilterChange: vi.fn(),
};

describe('ValidationsScanPanel', () => {
  it('renders empty state when no results and no scan', () => {
    render(<ValidationsScanPanel {...defaultProps} results={[]} totalResultCount={0} />);
    expect(screen.getByText(/Select an entity/)).toBeInTheDocument();
  });

  it('renders all results in table', () => {
    render(<ValidationsScanPanel {...defaultProps} />);
    expect(screen.getByText('Good Movie')).toBeInTheDocument();
    expect(screen.getByText('External Movie')).toBeInTheDocument();
    expect(screen.getByText('Missing Variants Movie')).toBeInTheDocument();
  });

  it('renders filter tabs', () => {
    render(<ValidationsScanPanel {...defaultProps} />);
    // Filter tabs are buttons with specific text
    const buttons = screen.getAllByRole('button');
    const filterLabels = buttons.map((b) => b.textContent).filter(Boolean);
    expect(filterLabels).toContain('All');
    expect(filterLabels).toContain('External');
    expect(filterLabels).toContain('Missing Variants');
    expect(filterLabels).toContain('OK');
  });

  it('calls onFilterChange when filter tab clicked', () => {
    const onFilterChange = vi.fn();
    render(<ValidationsScanPanel {...defaultProps} onFilterChange={onFilterChange} />);
    // Find the External filter button (not the badge in the table)
    const externalButtons = screen.getAllByText('External');
    // The filter tab is the button element
    const filterBtn = externalButtons.find((el) => el.tagName === 'BUTTON');
    fireEvent.click(filterBtn!);
    expect(onFilterChange).toHaveBeenCalledWith('external');
  });

  it('shows select all issues button with correct count', () => {
    render(<ValidationsScanPanel {...defaultProps} />);
    expect(screen.getByText('Select all issues (2)')).toBeInTheDocument();
  });

  it('shows deselect all when items are selected', () => {
    render(
      <ValidationsScanPanel {...defaultProps} selectedItems={new Set(['mov-2-poster_url'])} />,
    );
    expect(screen.getByText('Deselect all')).toBeInTheDocument();
  });

  it('shows Fix Selected button when items selected (non-readonly)', () => {
    render(
      <ValidationsScanPanel {...defaultProps} selectedItems={new Set(['mov-2-poster_url'])} />,
    );
    expect(screen.getByText('Fix Selected (1)')).toBeInTheDocument();
  });

  it('hides Fix Selected button for read-only users', () => {
    render(
      <ValidationsScanPanel
        {...defaultProps}
        selectedItems={new Set(['mov-2-poster_url'])}
        isReadOnly={true}
      />,
    );
    expect(screen.queryByText(/Fix Selected/)).toBeNull();
  });

  it('renders progress bar during scan', () => {
    render(
      <ValidationsScanPanel
        {...defaultProps}
        scanProgress={{ entity: 'movies', scanned: 10, total: 50, isScanning: true }}
      />,
    );
    expect(screen.getByText('Scanning...')).toBeInTheDocument();
    expect(screen.getByText('10 / 50 (20%)')).toBeInTheDocument();
  });

  it('renders progress bar during fix', () => {
    render(
      <ValidationsScanPanel
        {...defaultProps}
        fixProgress={{ fixed: 3, failed: 1, total: 10, isFixing: true }}
      />,
    );
    expect(screen.getByText('Fixing...')).toBeInTheDocument();
  });

  it('shows fix results after completion', () => {
    render(
      <ValidationsScanPanel
        {...defaultProps}
        fixProgress={{ fixed: 5, failed: 2, total: 7, isFixing: false }}
      />,
    );
    expect(screen.getByText('5 fixed')).toBeInTheDocument();
    expect(screen.getByText('2 failed')).toBeInTheDocument();
  });

  it('shows filter tabs even when current filter yields 0 results', () => {
    render(
      <ValidationsScanPanel
        {...defaultProps}
        results={[]}
        totalResultCount={3}
        activeFilter="missing"
      />,
    );
    // Filter tabs should still be visible
    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('External')).toBeInTheDocument();
    expect(screen.getByText('Missing Variants')).toBeInTheDocument();
    // Empty filter message shown
    expect(screen.getByText(/No results match/)).toBeInTheDocument();
  });

  it('renders table headers', () => {
    render(<ValidationsScanPanel {...defaultProps} />);
    expect(screen.getByText('Name')).toBeInTheDocument();
    expect(screen.getByText('Field')).toBeInTheDocument();
    expect(screen.getByText('Type')).toBeInTheDocument();
    expect(screen.getByText('Orig')).toBeInTheDocument();
    expect(screen.getByText('SM')).toBeInTheDocument();
    expect(screen.getByText('MD')).toBeInTheDocument();
    expect(screen.getByText('LG')).toBeInTheDocument();
  });
});
