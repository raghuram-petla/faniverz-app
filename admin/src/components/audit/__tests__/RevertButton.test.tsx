import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockMutate = vi.fn();
const mockUseRevertAuditEntry = vi.fn();

vi.mock('@/hooks/useAdminAudit', () => ({
  useRevertAuditEntry: () => mockUseRevertAuditEntry(),
}));

vi.mock('@/components/audit/auditUtils', () => ({
  getRevertDescription: (action: string) => {
    if (action === 'update') return 'Restore previous values';
    if (action === 'create') return 'Delete this entity';
    if (action === 'delete') return 'Re-create this entity';
    return 'Revert this change';
  },
}));

vi.mock('@/lib/utils', () => ({
  formatDateTime: (dt: string) => `Formatted: ${dt}`,
}));

import { RevertButton } from '@/components/audit/RevertButton';

describe('RevertButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseRevertAuditEntry.mockReturnValue({
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    });
  });

  describe('when already reverted', () => {
    it('shows reverted status with formatted date', () => {
      render(
        <RevertButton
          entryId="e-1"
          action="update"
          revertedAt="2025-01-01T12:00:00Z"
          revertedByName="Alice"
        />,
      );
      expect(screen.getByText(/Reverted/)).toBeInTheDocument();
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
      expect(screen.getByText(/Formatted: 2025-01-01T12:00:00Z/)).toBeInTheDocument();
    });

    it('omits "by name" when revertedByName is null', () => {
      render(
        <RevertButton
          entryId="e-1"
          action="update"
          revertedAt="2025-01-01T12:00:00Z"
          revertedByName={null}
        />,
      );
      expect(screen.getByText(/Reverted/)).toBeInTheDocument();
      expect(screen.queryByText(/ by /)).not.toBeInTheDocument();
    });

    it('does not show the Revert button when already reverted', () => {
      render(
        <RevertButton
          entryId="e-1"
          action="update"
          revertedAt="2025-01-01T12:00:00Z"
          revertedByName={null}
        />,
      );
      expect(screen.queryByText('Revert')).not.toBeInTheDocument();
    });
  });

  describe('initial state (not reverted)', () => {
    it('shows Revert button', () => {
      render(
        <RevertButton entryId="e-1" action="update" revertedAt={null} revertedByName={null} />,
      );
      expect(screen.getByText('Revert')).toBeInTheDocument();
    });

    it('does not show confirm prompt initially', () => {
      render(
        <RevertButton entryId="e-1" action="update" revertedAt={null} revertedByName={null} />,
      );
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
    });

    it('shows error message when revertMutation has error', () => {
      mockUseRevertAuditEntry.mockReturnValue({
        mutate: mockMutate,
        isPending: false,
        isError: true,
        error: { message: 'Revert failed' },
      });

      render(
        <RevertButton entryId="e-1" action="update" revertedAt={null} revertedByName={null} />,
      );
      expect(screen.getByText('Revert failed')).toBeInTheDocument();
    });
  });

  describe('confirming revert', () => {
    it('shows confirm UI after clicking Revert', () => {
      render(
        <RevertButton entryId="e-1" action="update" revertedAt={null} revertedByName={null} />,
      );
      fireEvent.click(screen.getByText('Revert'));
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText(/Restore previous values/)).toBeInTheDocument();
    });

    it('shows correct revert description for create action', () => {
      render(
        <RevertButton entryId="e-1" action="create" revertedAt={null} revertedByName={null} />,
      );
      fireEvent.click(screen.getByText('Revert'));
      expect(screen.getByText(/Delete this entity/)).toBeInTheDocument();
    });

    it('shows correct revert description for delete action', () => {
      render(
        <RevertButton entryId="e-1" action="delete" revertedAt={null} revertedByName={null} />,
      );
      fireEvent.click(screen.getByText('Revert'));
      expect(screen.getByText(/Re-create this entity/)).toBeInTheDocument();
    });

    it('calls mutate with entryId when Confirm is clicked', () => {
      render(
        <RevertButton
          entryId="entry-123"
          action="update"
          revertedAt={null}
          revertedByName={null}
        />,
      );
      fireEvent.click(screen.getByText('Revert'));
      fireEvent.click(screen.getByText('Confirm'));
      expect(mockMutate).toHaveBeenCalledWith(
        'entry-123',
        expect.objectContaining({ onSettled: expect.any(Function) }),
      );
    });

    it('returns to initial state after onSettled is called', async () => {
      render(
        <RevertButton entryId="e-1" action="update" revertedAt={null} revertedByName={null} />,
      );
      fireEvent.click(screen.getByText('Revert'));
      expect(screen.getByText('Confirm')).toBeInTheDocument();

      // Click confirm to trigger mutate call
      fireEvent.click(screen.getByText('Confirm'));

      // Get the onSettled callback and call it
      const call = mockMutate.mock.calls[0];
      const options = call[1];
      options.onSettled();

      await waitFor(() => {
        expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
      });
    });

    it('dismisses confirm UI when Cancel is clicked', () => {
      render(
        <RevertButton entryId="e-1" action="update" revertedAt={null} revertedByName={null} />,
      );
      fireEvent.click(screen.getByText('Revert'));
      expect(screen.getByText('Confirm')).toBeInTheDocument();
      fireEvent.click(screen.getByText('Cancel'));
      expect(screen.queryByText('Confirm')).not.toBeInTheDocument();
      expect(screen.getByText('Revert')).toBeInTheDocument();
    });

    it('disables Confirm button when mutation is pending', () => {
      mockUseRevertAuditEntry.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isError: false,
        error: null,
      });

      render(
        <RevertButton entryId="e-1" action="update" revertedAt={null} revertedByName={null} />,
      );
      fireEvent.click(screen.getByText('Revert'));
      const confirmBtn = screen.getByText('Reverting...');
      expect(confirmBtn.closest('button')).toBeDisabled();
    });

    it('shows "Reverting..." text when pending', () => {
      mockUseRevertAuditEntry.mockReturnValue({
        mutate: mockMutate,
        isPending: true,
        isError: false,
        error: null,
      });

      render(
        <RevertButton entryId="e-1" action="update" revertedAt={null} revertedByName={null} />,
      );
      fireEvent.click(screen.getByText('Revert'));
      expect(screen.getByText('Reverting...')).toBeInTheDocument();
    });
  });
});
