import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import React from 'react';

vi.mock('@/hooks/useValidations', () => ({
  itemKey: (r: { id: string; field: string }) => `${r.id}-${r.field}`,
  hasIssue: (r: {
    urlType: string;
    originalExists: boolean | null;
    variants: { sm: boolean | null; md: boolean | null; lg: boolean | null };
  }) => {
    if (r.urlType === 'external') return true;
    if (r.originalExists === false) return true;
    return r.variants.sm === false || r.variants.md === false || r.variants.lg === false;
  },
}));

vi.mock('@/components/validations/ValidationRow', () => ({
  ValidationRow: ({
    item,
    isSelected,
    onToggle,
    isReadOnly,
    onFixSingle,
  }: {
    item: { id: string; field: string; entityLabel: string };
    isSelected: boolean;
    onToggle: () => void;
    isReadOnly: boolean;
    onFixSingle: () => void;
  }) => (
    <tr data-testid={`row-${item.id}-${item.field}`}>
      <td>
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggle}
          data-testid={`check-${item.id}`}
        />
      </td>
      <td>{item.entityLabel}</td>
      {!isReadOnly && (
        <td>
          <button onClick={onFixSingle} data-testid={`fix-${item.id}`}>
            Fix
          </button>
        </td>
      )}
    </tr>
  ),
}));

import { ValidationsScanPanel } from '../ValidationsScanPanel';
import type { ValidationsScanPanelProps } from '../ValidationsScanPanel';

const makeResult = (overrides = {}) => ({
  id: 'result-1',
  entity: 'movies',
  field: 'poster_url',
  currentUrl: 'https://external.com/img.jpg',
  urlType: 'external' as const,
  originalExists: true,
  variants: { sm: true, md: true, lg: true },
  entityLabel: 'Test Movie',
  tmdbId: 12345,
  ...overrides,
});

const defaultProps: ValidationsScanPanelProps = {
  results: [],
  totalResultCount: 0,
  selectedItems: new Set<string>(),
  onToggle: vi.fn(),
  onSelectAllIssues: vi.fn(),
  onDeselectAll: vi.fn(),
  onFix: vi.fn(),
  onFixSingle: vi.fn(),
  fixProgress: null,
  scanProgress: null,
  isReadOnly: false,
  activeFilter: 'all',
  onFilterChange: vi.fn(),
};

describe('ValidationsScanPanel — empty state', () => {
  it('shows initial scan prompt when no results and no scan in progress', () => {
    render(<ValidationsScanPanel {...defaultProps} />);
    expect(screen.getByText(/Select an entity above/i)).toBeTruthy();
  });

  it('shows "No results found" when scanProgress exists but count is 0', () => {
    render(
      <ValidationsScanPanel
        {...defaultProps}
        scanProgress={{ entity: 'movies', scanned: 5, total: 5, isScanning: false }}
      />,
    );
    expect(screen.getByText(/No results found/i)).toBeTruthy();
  });

  it('does not show initial prompt when scan is actively running (totalResultCount=0 but isScanning=true)', () => {
    render(
      <ValidationsScanPanel
        {...defaultProps}
        totalResultCount={0}
        scanProgress={{ entity: 'movies', scanned: 2, total: 10, isScanning: true }}
      />,
    );
    // Should NOT show the "Select an entity above" message
    expect(screen.queryByText(/Select an entity above/i)).toBeNull();
  });
});

describe('ValidationsScanPanel — with results', () => {
  const result = makeResult();
  const props: ValidationsScanPanelProps = {
    ...defaultProps,
    results: [result],
    totalResultCount: 1,
  };

  it('renders results table when results present', () => {
    render(<ValidationsScanPanel {...props} />);
    expect(screen.getByTestId('row-result-1-poster_url')).toBeTruthy();
  });

  it('renders filter buttons', () => {
    render(<ValidationsScanPanel {...props} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('External')).toBeTruthy();
    expect(screen.getByText('Missing Variants')).toBeTruthy();
    expect(screen.getByText('OK')).toBeTruthy();
  });

  it('calls onFilterChange when filter clicked', () => {
    const onFilterChange = vi.fn();
    render(<ValidationsScanPanel {...props} onFilterChange={onFilterChange} />);
    fireEvent.click(screen.getByText('External'));
    expect(onFilterChange).toHaveBeenCalledWith('external');
  });
});

describe('ValidationsScanPanel — empty filter message', () => {
  it('shows "No results match" message when results empty but totalResultCount > 0', () => {
    render(
      <ValidationsScanPanel
        {...defaultProps}
        results={[]}
        totalResultCount={5}
        activeFilter="missing"
      />,
    );
    expect(screen.getByText(/No results match the "Missing Variants" filter/i)).toBeTruthy();
  });
});

describe('ValidationsScanPanel — issue selection controls', () => {
  const result = makeResult();
  const props: ValidationsScanPanelProps = {
    ...defaultProps,
    results: [result],
    totalResultCount: 1,
  };

  it('shows "Select all issues" button when issues present and nothing selected', () => {
    render(<ValidationsScanPanel {...props} />);
    expect(screen.getByText(/Select all issues/i)).toBeTruthy();
  });

  it('calls onSelectAllIssues when "Select all issues" clicked', () => {
    const onSelectAllIssues = vi.fn();
    render(<ValidationsScanPanel {...props} onSelectAllIssues={onSelectAllIssues} />);
    fireEvent.click(screen.getByText(/Select all issues/i));
    expect(onSelectAllIssues).toHaveBeenCalled();
  });

  it('shows "Deselect all" when items selected', () => {
    const key = 'result-1-poster_url';
    render(<ValidationsScanPanel {...props} selectedItems={new Set([key])} />);
    expect(screen.getByText('Deselect all')).toBeTruthy();
  });

  it('calls onDeselectAll when "Deselect all" clicked', () => {
    const onDeselectAll = vi.fn();
    const key = 'result-1-poster_url';
    render(
      <ValidationsScanPanel
        {...props}
        selectedItems={new Set([key])}
        onDeselectAll={onDeselectAll}
      />,
    );
    fireEvent.click(screen.getByText('Deselect all'));
    expect(onDeselectAll).toHaveBeenCalled();
  });

  it('shows Fix Selected button when items selected and not readOnly', () => {
    const key = 'result-1-poster_url';
    render(<ValidationsScanPanel {...props} selectedItems={new Set([key])} isReadOnly={false} />);
    expect(screen.getByText(/Fix Selected/i)).toBeTruthy();
  });

  it('does not show Fix Selected button when isReadOnly', () => {
    const key = 'result-1-poster_url';
    render(<ValidationsScanPanel {...props} selectedItems={new Set([key])} isReadOnly={true} />);
    expect(screen.queryByText(/Fix Selected/i)).toBeNull();
  });

  it('calls onFix when Fix Selected clicked', () => {
    const onFix = vi.fn();
    const key = 'result-1-poster_url';
    render(<ValidationsScanPanel {...props} selectedItems={new Set([key])} onFix={onFix} />);
    fireEvent.click(screen.getByText(/Fix Selected/i));
    expect(onFix).toHaveBeenCalled();
  });
});

describe('ValidationsScanPanel — progress bars', () => {
  const result = makeResult();
  const props: ValidationsScanPanelProps = {
    ...defaultProps,
    results: [result],
    totalResultCount: 1,
  };

  it('shows scan progress bar when scanning', () => {
    render(
      <ValidationsScanPanel
        {...props}
        scanProgress={{ entity: 'movies', scanned: 3, total: 10, isScanning: true }}
      />,
    );
    expect(screen.getByText('Scanning...')).toBeTruthy();
    expect(screen.getByText('3 / 10 (30%)')).toBeTruthy();
  });

  it('shows fix progress bar when fixing', () => {
    render(
      <ValidationsScanPanel
        {...props}
        fixProgress={{ isFixing: true, fixed: 2, failed: 1, total: 10 }}
      />,
    );
    expect(screen.getByText('Fixing...')).toBeTruthy();
  });

  it('shows fix results summary after fixing completes', () => {
    render(
      <ValidationsScanPanel
        {...props}
        fixProgress={{ isFixing: false, fixed: 8, failed: 2, total: 10 }}
      />,
    );
    expect(screen.getByText('8 fixed')).toBeTruthy();
    expect(screen.getByText('2 failed')).toBeTruthy();
  });

  it('does not show failed count when failed=0', () => {
    render(
      <ValidationsScanPanel
        {...props}
        fixProgress={{ isFixing: false, fixed: 10, failed: 0, total: 10 }}
      />,
    );
    expect(screen.queryByText(/failed/i)).toBeNull();
  });

  it('shows spinner when scan is running', () => {
    render(
      <ValidationsScanPanel
        {...props}
        scanProgress={{ entity: 'movies', scanned: 5, total: 10, isScanning: true }}
      />,
    );
    // Spinner appears at bottom when scanning
    const spinners = document.querySelectorAll('[class*="animate-spin"]');
    expect(spinners.length).toBeGreaterThan(0);
  });
});

describe('ValidationsScanPanel — toggle item selection', () => {
  it('calls onToggle when a result row checkbox is clicked', () => {
    const onToggle = vi.fn();
    const result = makeResult();
    render(
      <ValidationsScanPanel
        {...defaultProps}
        results={[result]}
        totalResultCount={1}
        onToggle={onToggle}
      />,
    );
    const checkbox = screen.getByTestId('check-result-1');
    fireEvent.click(checkbox);
    expect(onToggle).toHaveBeenCalled();
  });
});

describe('ValidationsScanPanel — progress bar edge case', () => {
  it('shows 0% when total is 0', () => {
    render(
      <ValidationsScanPanel
        {...defaultProps}
        results={[makeResult()]}
        totalResultCount={1}
        scanProgress={{ entity: 'movies', scanned: 0, total: 0, isScanning: true }}
      />,
    );
    expect(screen.getByText('0 / 0 (0%)')).toBeTruthy();
  });
});
