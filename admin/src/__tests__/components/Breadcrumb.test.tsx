import { render, screen } from '@testing-library/react';
import { Breadcrumb } from '@/components/layout/Breadcrumb';

let mockPathname = '/';
vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname,
}));

describe('Breadcrumb', () => {
  beforeEach(() => {
    mockPathname = '/';
  });

  it('renders Admin link on dashboard', () => {
    render(<Breadcrumb />);
    const adminLink = screen.getByText('Admin');
    expect(adminLink).toBeInTheDocument();
    expect(adminLink.closest('a')).toHaveAttribute('href', '/');
  });

  it('shows only Admin on dashboard (no section or page)', () => {
    render(<Breadcrumb />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    // Dashboard should not show extra crumbs
    expect(screen.queryByText('Dashboard')).not.toBeInTheDocument();
  });

  it('shows section and page for content routes', () => {
    mockPathname = '/theaters';
    render(<Breadcrumb />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
  });

  it('shows section and page for moderation routes', () => {
    mockPathname = '/reviews';
    render(<Breadcrumb />);
    expect(screen.getByText('Moderation')).toBeInTheDocument();
    expect(screen.getByText('Reviews')).toBeInTheDocument();
  });

  it('shows section and page for system routes', () => {
    mockPathname = '/audit';
    render(<Breadcrumb />);
    expect(screen.getByText('System')).toBeInTheDocument();
    expect(screen.getByText('Audit Log')).toBeInTheDocument();
  });

  it('handles sub-routes via prefix matching', () => {
    mockPathname = '/movies/123';
    render(<Breadcrumb />);
    expect(screen.getByText('Content')).toBeInTheDocument();
    expect(screen.getByText('Movies')).toBeInTheDocument();
  });

  it('shows page without section for profile', () => {
    mockPathname = '/profile';
    render(<Breadcrumb />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Profile')).toBeInTheDocument();
  });

  it('renders breadcrumb nav with aria-label', () => {
    render(<Breadcrumb />);
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
  });

  it('handles unknown routes gracefully', () => {
    mockPathname = '/unknown-route';
    render(<Breadcrumb />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
    // Should not crash, just shows Admin
  });
});
