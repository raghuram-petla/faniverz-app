import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Mocks before imports ───
const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

const mockStartScan = vi.fn();
const mockFixSelected = vi.fn();
const mockToggleItem = vi.fn();
const mockSelectAllIssues = vi.fn();
const mockDeselectAll = vi.fn();
const mockSetActiveFilter = vi.fn();

vi.mock('@/hooks/useValidations', () => ({
  useValidations: () => ({
    summary: null,
    isSummaryLoading: false,
    scanResults: [],
    allScanResults: [],
    scanProgress: null,
    fixProgress: null,
    selectedItems: new Set(),
    activeFilter: 'all',
    setActiveFilter: mockSetActiveFilter,
    startScan: mockStartScan,
    fixSelected: mockFixSelected,
    toggleItem: mockToggleItem,
    selectAllIssues: mockSelectAllIssues,
    deselectAll: mockDeselectAll,
  }),
  hasIssue: vi.fn((item: unknown) => !!(item as { issue?: boolean }).issue),
}));

const mockGetSession = vi.fn();
vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

vi.mock('@/components/validations/ValidationsSummary', () => ({
  ValidationsSummary: ({
    onScanAll,
    onDeepScan,
    onScan,
  }: {
    summary: unknown;
    isLoading: boolean;
    onScan: (entity: string) => void;
    onDeepScan: (entity: string) => void;
    onScanAll: () => void;
    isScanning: boolean;
    activeScanEntity: string | null;
  }) => (
    <div data-testid="validations-summary">
      <button data-testid="scan-all-btn" onClick={onScanAll}>
        Scan All
      </button>
      <button data-testid="deep-scan-btn" onClick={() => onDeepScan('movies')}>
        Deep Scan Movies
      </button>
      <button data-testid="scan-btn" onClick={() => onScan('actors')}>
        Scan Actors
      </button>
    </div>
  ),
}));

vi.mock('@/components/validations/ValidationsScanPanel', () => ({
  ValidationsScanPanel: ({
    results,
    onFix,
    onFixSingle,
  }: {
    results: unknown[];
    totalResultCount: number;
    selectedItems: Set<string>;
    onToggle: (id: string) => void;
    onSelectAllIssues: () => void;
    onDeselectAll: () => void;
    onFix: () => void;
    onFixSingle: (item: unknown) => void;
    fixProgress: unknown;
    scanProgress: unknown;
    isReadOnly: boolean;
    activeFilter: string;
    onFilterChange: (f: string) => void;
  }) => (
    <div data-testid="validations-scan-panel">
      <span data-testid="result-count">{results.length}</span>
      <button data-testid="fix-selected-btn" onClick={onFix}>
        Fix Selected
      </button>
      <button
        data-testid="fix-single-btn"
        onClick={() =>
          onFixSingle({
            id: 'r1',
            entity: 'movies',
            field: 'poster_url',
            currentUrl: 'https://cdn/img.jpg',
            urlType: 'external',
            issue: true,
            tmdbId: null,
          })
        }
      >
        Fix Single
      </button>
    </div>
  ),
}));

import ValidationsPage from '@/app/(dashboard)/validations/page';

describe('ValidationsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissions.mockReturnValue({ isReadOnly: false });
    mockStartScan.mockResolvedValue(undefined);
    mockGetSession.mockResolvedValue({
      data: { session: { access_token: 'tok123' } },
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it('renders Image Validations heading', () => {
    render(<ValidationsPage />);
    expect(screen.getByText('Image Validations')).toBeInTheDocument();
  });

  it('renders ValidationsSummary component', () => {
    render(<ValidationsPage />);
    expect(screen.getByTestId('validations-summary')).toBeInTheDocument();
  });

  it('renders ValidationsScanPanel component', () => {
    render(<ValidationsPage />);
    expect(screen.getByTestId('validations-scan-panel')).toBeInTheDocument();
  });

  it('handleScanAll calls startScan for all entity types', async () => {
    render(<ValidationsPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('scan-all-btn'));
    });

    await waitFor(() => {
      expect(mockStartScan).toHaveBeenCalledTimes(6);
      expect(mockStartScan).toHaveBeenCalledWith('movies');
      expect(mockStartScan).toHaveBeenCalledWith('movie_images');
      expect(mockStartScan).toHaveBeenCalledWith('actors');
      expect(mockStartScan).toHaveBeenCalledWith('platforms');
      expect(mockStartScan).toHaveBeenCalledWith('production_houses');
      expect(mockStartScan).toHaveBeenCalledWith('profiles');
    });
  });

  it('handleDeepScan calls startScan with deep=true for entity', async () => {
    render(<ValidationsPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('deep-scan-btn'));
    });
    await waitFor(() => {
      expect(mockStartScan).toHaveBeenCalledWith('movies', true);
    });
  });

  it('onScan calls startScan for a single entity', async () => {
    render(<ValidationsPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('scan-btn'));
    });
    await waitFor(() => {
      expect(mockStartScan).toHaveBeenCalledWith('actors');
    });
  });

  it('handleFixSingle skips items with no issue', async () => {
    const { useValidations: _useValidations } = await import('@/hooks/useValidations');
    const { hasIssue } = await import('@/hooks/useValidations');
    vi.mocked(hasIssue).mockReturnValue(false);

    render(<ValidationsPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('fix-single-btn'));
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('handleFixSingle sends fix request when item has issue', async () => {
    const { hasIssue } = await import('@/hooks/useValidations');
    vi.mocked(hasIssue).mockReturnValue(true);

    render(<ValidationsPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('fix-single-btn'));
    });
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/validations/fix',
        expect.objectContaining({ method: 'POST' }),
      );
    });
  });

  it('hasIssue gate — skips fix when item has no issue (session missing irrelevant)', async () => {
    const { hasIssue } = await import('@/hooks/useValidations');
    vi.mocked(hasIssue).mockReturnValue(false);
    mockGetSession.mockResolvedValue({ data: { session: null } });

    render(<ValidationsPage />);
    fireEvent.click(screen.getByTestId('fix-single-btn'));

    await new Promise((r) => setTimeout(r, 50));
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('fix-selected calls fixSelected', () => {
    render(<ValidationsPage />);
    fireEvent.click(screen.getByTestId('fix-selected-btn'));
    expect(mockFixSelected).toHaveBeenCalled();
  });
});
