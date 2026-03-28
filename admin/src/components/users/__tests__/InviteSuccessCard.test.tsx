import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('lucide-react', () => ({
  ArrowLeft: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="arrow-left" {...props} />,
  Check: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="check-icon" {...props} />,
  Copy: (props: React.SVGProps<SVGSVGElement>) => <svg data-testid="copy-icon" {...props} />,
}));

vi.mock('@/lib/types', () => ({
  ADMIN_ROLE_LABELS: {
    super_admin: 'Super Admin',
    admin: 'Admin',
    production_house_admin: 'Production Admin',
    viewer: 'Viewer',
  },
}));

import {
  InviteSuccessCard,
  type InviteSuccessCardProps,
} from '@/components/users/InviteSuccessCard';

const defaultProps: InviteSuccessCardProps = {
  email: 'test@example.com',
  roleId: 'admin',
  inviteLink: 'https://app.example.com/login?invite=abc123',
  copied: false,
  onCopy: vi.fn(),
};

describe('InviteSuccessCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the invitation created heading', () => {
    render(<InviteSuccessCard {...defaultProps} />);
    expect(screen.getByText('Invitation Created')).toBeInTheDocument();
  });

  it('displays the email address in the description', () => {
    render(<InviteSuccessCard {...defaultProps} />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('displays the invite link in a readonly input', () => {
    render(<InviteSuccessCard {...defaultProps} />);
    const input = screen.getByDisplayValue(defaultProps.inviteLink);
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('readOnly');
  });

  it('shows Copy button when not copied', () => {
    render(<InviteSuccessCard {...defaultProps} copied={false} />);
    expect(screen.getByText('Copy')).toBeInTheDocument();
  });

  it('shows Copied button when copied is true', () => {
    render(<InviteSuccessCard {...defaultProps} copied={true} />);
    expect(screen.getByText('Copied')).toBeInTheDocument();
  });

  it('calls onCopy when copy button is clicked', () => {
    const onCopy = vi.fn();
    render(<InviteSuccessCard {...defaultProps} onCopy={onCopy} />);
    fireEvent.click(screen.getByText('Copy'));
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it('displays the role label in the expiry notice', () => {
    render(<InviteSuccessCard {...defaultProps} roleId="viewer" />);
    expect(screen.getByText('Viewer')).toBeInTheDocument();
  });

  it('navigates to /users when back button is clicked', () => {
    render(<InviteSuccessCard {...defaultProps} />);
    fireEvent.click(screen.getByText('Back to Admin Management', { selector: 'button' }));
    expect(mockPush).toHaveBeenCalledWith('/users');
  });

  it('renders back link to /users', () => {
    render(<InviteSuccessCard {...defaultProps} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/users');
  });
});
