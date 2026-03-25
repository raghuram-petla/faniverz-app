import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUseAdminComments = vi.fn();
const mockDeleteMutate = vi.fn();
const mockUpdateMutate = vi.fn();
const mockUsePermissions = vi.fn();
const mockSetSearch = vi.fn();

vi.mock('@/hooks/useAdminComments', () => ({
  useAdminComments: (...args: unknown[]) => mockUseAdminComments(...args),
  useDeleteComment: () => ({ mutate: mockDeleteMutate, isPending: false }),
  useUpdateComment: () => ({ mutate: mockUpdateMutate, isPending: false }),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: () => ({ search: '', setSearch: mockSetSearch, debouncedSearch: '' }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock('@/components/common/SearchInput', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder?: string;
    isLoading?: boolean;
  }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

import CommentsPage from '@/app/(dashboard)/comments/page';

const makeComment = (id: string, body: string, overrides = {}) => ({
  id,
  body,
  created_at: '2024-01-15T12:00:00Z',
  feed_item: { id: 'post-1', title: 'Test Post' },
  profile: { id: 'user-1', display_name: 'John Doe', email: 'john@example.com' },
  ...overrides,
});

describe('CommentsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
    mockUsePermissions.mockReturnValue({ isReadOnly: false });
    mockUseAdminComments.mockReturnValue({
      data: [],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
  });

  it('renders search input', () => {
    render(<CommentsPage />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    mockUseAdminComments.mockReturnValue({
      data: undefined,
      isLoading: true,
      isFetching: false,
      isError: false,
      error: null,
    });
    const { container } = render(<CommentsPage />);
    // There should be a spinner element (Loader2 svg)
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows "No comments found." when no data', () => {
    render(<CommentsPage />);
    expect(screen.getByText('No comments found.')).toBeInTheDocument();
  });

  it('shows comment count when data is loaded', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Great movie!'), makeComment('c2', 'Loved it')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    expect(screen.getByText('2 comments')).toBeInTheDocument();
  });

  it('shows singular "comment" for 1 result', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Nice')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    // finds "1 comment" (singular) in the count paragraph
    const paragraphs = screen.getAllByText(/1 comment/);
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it('renders comment rows in table', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Awesome film')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    expect(screen.getByText('Awesome film')).toBeInTheDocument();
    expect(screen.getByText('Test Post')).toBeInTheDocument();
    expect(screen.getByText('John Doe')).toBeInTheDocument();
  });

  it('falls back to "Untitled post" when feed_item is null', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Hi', { feed_item: null })],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    expect(screen.getByText('Untitled post')).toBeInTheDocument();
  });

  it('falls back to email when display_name is null', () => {
    mockUseAdminComments.mockReturnValue({
      data: [
        makeComment('c1', 'Hi', {
          profile: { id: 'u1', display_name: null, email: 'anon@example.com' },
        }),
      ],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    expect(screen.getByText('anon@example.com')).toBeInTheDocument();
  });

  it('falls back to "Unknown" when profile is null', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Hi', { profile: null })],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('shows error message when isError is true', () => {
    mockUseAdminComments.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: new Error('Network error'),
    });
    render(<CommentsPage />);
    expect(screen.getByText(/Network error/)).toBeInTheDocument();
  });

  it('shows "Unknown error" when error is not an Error instance', () => {
    mockUseAdminComments.mockReturnValue({
      data: undefined,
      isLoading: false,
      isFetching: false,
      isError: true,
      error: 'string error',
    });
    render(<CommentsPage />);
    expect(screen.getByText(/Unknown error/)).toBeInTheDocument();
  });

  it('calls deleteComment.mutate on delete confirmation', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Delete me')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    fireEvent.click(screen.getByTitle('Delete comment'));
    expect(window.confirm).toHaveBeenCalled();
    expect(mockDeleteMutate).toHaveBeenCalledWith('c1');
  });

  it('does not delete when user cancels confirm', () => {
    window.confirm = vi.fn(() => false);
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Keep me')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    fireEvent.click(screen.getByTitle('Delete comment'));
    expect(mockDeleteMutate).not.toHaveBeenCalled();
  });

  it('enters edit mode when edit button is clicked', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Edit me')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    fireEvent.click(screen.getByTitle('Edit comment'));
    // Textarea should be visible
    const textarea = document.querySelector('textarea');
    expect(textarea).toBeInTheDocument();
    expect(textarea?.value).toBe('Edit me');
  });

  it('shows Save (Check) and Cancel (X) buttons in edit mode', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Edit me')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    fireEvent.click(screen.getByTitle('Edit comment'));
    expect(screen.getByTitle('Save')).toBeInTheDocument();
    expect(screen.getByTitle('Cancel')).toBeInTheDocument();
  });

  it('cancels edit mode when Cancel is clicked', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Edit me')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    fireEvent.click(screen.getByTitle('Edit comment'));
    fireEvent.click(screen.getByTitle('Cancel'));
    expect(screen.queryByTitle('Save')).not.toBeInTheDocument();
  });

  it('calls updateComment.mutate on save', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Original')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    fireEvent.click(screen.getByTitle('Edit comment'));
    const textarea = document.querySelector('textarea')!;
    fireEvent.change(textarea, { target: { value: 'Updated body' } });
    fireEvent.click(screen.getByTitle('Save'));
    expect(mockUpdateMutate).toHaveBeenCalledWith(
      { id: 'c1', body: 'Updated body' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('hides edit/delete buttons when isReadOnly is true', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'Comment')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    expect(screen.queryByTitle('Edit comment')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete comment')).not.toBeInTheDocument();
  });

  it('shows table headers when comments are present', () => {
    mockUseAdminComments.mockReturnValue({
      data: [makeComment('c1', 'A comment')],
      isLoading: false,
      isFetching: false,
      isError: false,
      error: null,
    });
    render(<CommentsPage />);
    expect(screen.getByText('Post')).toBeInTheDocument();
    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Comment')).toBeInTheDocument();
  });
});
