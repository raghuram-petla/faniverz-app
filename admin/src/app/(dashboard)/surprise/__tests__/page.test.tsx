import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUseAdminSurprise = vi.fn();
const mockDeleteMutate = vi.fn();
const mockUsePermissions = vi.fn();

vi.mock('@/hooks/useAdminSurprise', () => ({
  useAdminSurprise: () => mockUseAdminSurprise(),
  useDeleteSurprise: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
    title,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    title?: string;
  }) => (
    <a
      href={href}
      className={className}
      title={title}
      data-testid={`link-${href.replace(/\//g, '-').replace(/^-/, '')}`}
    >
      {children}
    </a>
  ),
}));

import SurpriseContentPage from '@/app/(dashboard)/surprise/page';

const makeItem = (id: string, title: string, category: string, views = 100) => ({
  id,
  title,
  category,
  views,
  created_at: '2024-01-01T00:00:00Z',
});

describe('SurpriseContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
    mockUsePermissions.mockReturnValue({ isReadOnly: false, canDeleteTopLevel: () => true });
    mockUseAdminSurprise.mockReturnValue({
      data: [],
      isLoading: false,
    });
  });

  it('renders Add Content button when not read-only', () => {
    render(<SurpriseContentPage />);
    expect(screen.getByText('Add Content')).toBeInTheDocument();
  });

  it('hides Add Content button when read-only', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true, canDeleteTopLevel: () => false });
    render(<SurpriseContentPage />);
    expect(screen.queryByText('Add Content')).not.toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    mockUseAdminSurprise.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<SurpriseContentPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows empty state when no items', () => {
    render(<SurpriseContentPage />);
    expect(
      screen.getByText('No surprise content found. Add one to get started.'),
    ).toBeInTheDocument();
  });

  it('renders table headers when items are present', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'Song Item', 'song')],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Category')).toBeInTheDocument();
    expect(screen.getByText('Views')).toBeInTheDocument();
    expect(screen.getByText('Actions')).toBeInTheDocument();
  });

  it('renders item title and views', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'My Song', 'song', 500)],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    expect(screen.getByText('My Song')).toBeInTheDocument();
    expect(screen.getByText('500')).toBeInTheDocument();
  });

  it('renders category badge with correct text', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'A Song', 'song')],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    expect(screen.getByText('song')).toBeInTheDocument();
  });

  it('renders known category colors (song -> pink)', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'A Song', 'song')],
      isLoading: false,
    });
    const { container } = render(<SurpriseContentPage />);
    const badge = container.querySelector('.bg-pink-600\\/20');
    expect(badge).toBeInTheDocument();
  });

  it('renders short-film category with purple style', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'Short Film', 'short-film')],
      isLoading: false,
    });
    const { container } = render(<SurpriseContentPage />);
    const badge = container.querySelector('.bg-purple-600\\/20');
    expect(badge).toBeInTheDocument();
  });

  it('renders unknown category with fallback bg-input style', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'Mystery', 'unknown-category')],
      isLoading: false,
    });
    const { container } = render(<SurpriseContentPage />);
    const badge = container.querySelector('.bg-input');
    expect(badge).toBeInTheDocument();
  });

  it('renders edit link for each item', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'A Song', 'song')],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    const editLink = screen.getByTitle('Edit');
    expect(editLink.getAttribute('href')).toBe('/surprise/s1');
  });

  it('renders delete button when not read-only', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'A Song', 'song')],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    expect(screen.getByTitle('Delete')).toBeInTheDocument();
  });

  it('hides delete button when read-only', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true, canDeleteTopLevel: () => false });
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'A Song', 'song')],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    expect(screen.queryByTitle('Delete')).not.toBeInTheDocument();
  });

  it('calls deleteItem.mutate on confirmed delete', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'A Song', 'song')],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    fireEvent.click(screen.getByTitle('Delete'));
    expect(window.confirm).toHaveBeenCalledWith('Delete this surprise content?');
    expect(mockDeleteMutate).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('does not delete when user cancels confirm', () => {
    window.confirm = vi.fn(() => false);
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'A Song', 'song')],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    fireEvent.click(screen.getByTitle('Delete'));
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it('formats views with localeString (comma-separated for large numbers)', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'Popular', 'trailer', 1234567)],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    expect(screen.getByText('1,234,567')).toBeInTheDocument();
  });

  it('renders multiple items', () => {
    mockUseAdminSurprise.mockReturnValue({
      data: [
        makeItem('s1', 'First Song', 'song'),
        makeItem('s2', 'A Short Film', 'short-film'),
        makeItem('s3', 'BTS Footage', 'bts'),
      ],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    expect(screen.getByText('First Song')).toBeInTheDocument();
    expect(screen.getByText('A Short Film')).toBeInTheDocument();
    expect(screen.getByText('BTS Footage')).toBeInTheDocument();
  });

  it('Add Content link navigates to /surprise/new', () => {
    render(<SurpriseContentPage />);
    const addLink = screen.getByText('Add Content').closest('a');
    expect(addLink?.getAttribute('href')).toBe('/surprise/new');
  });

  it('calls alert when delete onError fires', () => {
    mockDeleteMutate.mockImplementation((_id: string, opts: { onError: (err: Error) => void }) => {
      opts.onError(new Error('Delete failed'));
    });
    mockUseAdminSurprise.mockReturnValue({
      data: [makeItem('s1', 'A Song', 'song')],
      isLoading: false,
    });
    render(<SurpriseContentPage />);
    fireEvent.click(screen.getByTitle('Delete'));
    expect(window.alert).toHaveBeenCalledWith('Error: Delete failed');
  });
});
