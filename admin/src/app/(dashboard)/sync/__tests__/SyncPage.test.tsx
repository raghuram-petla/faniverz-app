import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

let mockIsReadOnly = false;
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({ isReadOnly: mockIsReadOnly }),
}));

vi.mock('@/components/sync/DiscoverTab', () => ({
  DiscoverTab: ({ isReadOnly }: { isReadOnly?: boolean }) => (
    <div data-testid="discover-tab">
      <span data-testid="discover-readonly">{isReadOnly ? 'true' : 'false'}</span>
    </div>
  ),
}));

vi.mock('@/components/sync/BulkTab', () => ({
  BulkTab: ({ isReadOnly }: { isReadOnly?: boolean }) => (
    <div data-testid="bulk-tab">
      <span data-testid="bulk-readonly">{isReadOnly ? 'true' : 'false'}</span>
    </div>
  ),
}));

vi.mock('@/components/sync/HistoryTab', () => ({
  HistoryTab: () => <div data-testid="history-tab" />,
}));

import SyncPage from '../page';

describe('SyncPage', () => {
  beforeEach(() => {
    mockIsReadOnly = false;
  });

  it('renders Discover tab by default', () => {
    render(<SyncPage />);
    expect(screen.getByTestId('discover-tab')).toBeInTheDocument();
  });

  it('renders tab buttons', () => {
    render(<SyncPage />);
    expect(screen.getByText('Discover')).toBeInTheDocument();
    expect(screen.getByText('Bulk')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
  });

  it('passes isReadOnly=false to DiscoverTab when not viewer', () => {
    render(<SyncPage />);
    expect(screen.getByTestId('discover-readonly').textContent).toBe('false');
  });

  it('passes isReadOnly=true to DiscoverTab when viewer', () => {
    mockIsReadOnly = true;
    render(<SyncPage />);
    expect(screen.getByTestId('discover-readonly').textContent).toBe('true');
  });
});
