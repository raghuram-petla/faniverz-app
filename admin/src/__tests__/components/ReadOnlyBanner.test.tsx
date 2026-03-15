import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

import { ReadOnlyBanner } from '@/components/common/ReadOnlyBanner';

describe('ReadOnlyBanner', () => {
  it('renders banner when isReadOnly is true', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    render(<ReadOnlyBanner />);
    expect(screen.getByText('You are in read-only mode. Changes are disabled.')).toBeTruthy();
  });

  it('renders nothing when isReadOnly is false', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: false });
    const { container } = render(<ReadOnlyBanner />);
    expect(container.innerHTML).toBe('');
  });
});
