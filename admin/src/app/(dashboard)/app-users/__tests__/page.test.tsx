import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockUseAdminEndUsers = vi.fn();
const mockBanUserMutate = vi.fn();
const mockUpdateProfileMutate = vi.fn();
const mockUseDebouncedSearch = vi.fn();

vi.mock('@/hooks/useAdminEndUsers', () => ({
  useAdminEndUsers: (...args: unknown[]) => mockUseAdminEndUsers(...args),
  useBanUser: vi.fn(() => ({
    mutate: mockBanUserMutate,
    isPending: false,
  })),
  useUpdateEndUserProfile: vi.fn(() => ({
    mutate: mockUpdateProfileMutate,
    isPending: false,
  })),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: (...args: unknown[]) => mockUseDebouncedSearch(...args),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({
    isReadOnly: false,
    languageCodes: [],
  })),
}));

vi.mock('@/components/common/SearchInput', () => ({
  SearchInput: ({
    value,
    onChange,
    placeholder,
  }: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    isLoading: boolean;
  }) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  ),
}));

vi.mock('@/components/common/PaginationControls', () => ({
  PaginationControls: ({
    page,
    totalPages,
    onPrevious,
    onNext,
  }: {
    page: number;
    totalPages: number;
    totalCount: number;
    pageSize: number;
    onPrevious: () => void;
    onNext: () => void;
  }) => (
    <div data-testid="pagination">
      <span data-testid="page-info">
        {page + 1}/{totalPages}
      </span>
      <button onClick={onPrevious} data-testid="prev-btn">
        Prev
      </button>
      <button onClick={onNext} data-testid="next-btn">
        Next
      </button>
    </div>
  ),
}));

const makeUser = (overrides = {}) => ({
  id: 'user-1',
  display_name: 'John Doe',
  username: 'johndoe',
  email: 'john@example.com',
  avatar_url: null,
  bio: null,
  location: null,
  preferred_lang: null,
  created_at: '2024-01-01T00:00:00Z',
  ...overrides,
});

import AppUsersPage from '@/app/(dashboard)/app-users/page';

describe('AppUsersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    mockUseDebouncedSearch.mockReturnValue({
      search: '',
      setSearch: vi.fn(),
      debouncedSearch: '',
    });
    mockUseAdminEndUsers.mockReturnValue({
      data: null,
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
  });

  it('renders search input', () => {
    render(<AppUsersPage />);
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: null,
      isLoading: true,
      isError: false,
      error: null,
      isFetching: true,
    });
    render(<AppUsersPage />);
    // Loader2 renders as svg
    expect(document.querySelector('svg')).toBeInTheDocument();
  });

  it('shows "No users found." when no users and no search', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [], totalCount: 0 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText('No users found.')).toBeInTheDocument();
  });

  it('shows "No users match your search." when no users but search active', () => {
    mockUseDebouncedSearch.mockReturnValue({
      search: 'query',
      setSearch: vi.fn(),
      debouncedSearch: 'query',
    });
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [], totalCount: 0 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText('No users match your search.')).toBeInTheDocument();
  });

  it('shows user count when data is loaded', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser()], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText('1 user')).toBeInTheDocument();
  });

  it('shows plural "users" for count > 1', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: {
        users: [makeUser(), makeUser({ id: 'user-2', display_name: 'Jane' })],
        totalCount: 2,
      },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText('2 users')).toBeInTheDocument();
  });

  it('renders user table with user data', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser()], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('@johndoe')).toBeInTheDocument();
    expect(screen.getByText('john@example.com')).toBeInTheDocument();
  });

  it('shows "--" for users without username', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser({ username: null })], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    const dashes = screen.getAllByText('--');
    expect(dashes.length).toBeGreaterThan(0);
  });

  it('shows "No name" when display_name is null', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser({ display_name: null })], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText('No name')).toBeInTheDocument();
  });

  it('shows error message when isError is true', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: new Error('DB connection failed'),
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText(/Error loading users: DB connection failed/)).toBeInTheDocument();
  });

  it('shows "Unknown error" for non-Error error object', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: null,
      isLoading: false,
      isError: true,
      error: 'string error',
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText(/Unknown error/)).toBeInTheDocument();
  });

  it('calls ban mutate with user id on ban confirm', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser()], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);

    const banBtn = screen.getByTitle('Ban user');
    fireEvent.click(banBtn);

    expect(window.confirm).toHaveBeenCalledWith('Ban John Doe? They will not be able to log in.');
    expect(mockBanUserMutate).toHaveBeenCalledWith('user-1');
  });

  it('does not call ban mutate when user cancels confirm', () => {
    window.confirm = vi.fn(() => false);
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser()], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);

    const banBtn = screen.getByTitle('Ban user');
    fireEvent.click(banBtn);

    expect(mockBanUserMutate).not.toHaveBeenCalled();
  });

  it('uses email in ban confirm when display_name is null', () => {
    window.confirm = vi.fn(() => false);
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser({ display_name: null })], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);

    fireEvent.click(screen.getByTitle('Ban user'));

    expect(window.confirm).toHaveBeenCalledWith(
      'Ban john@example.com? They will not be able to log in.',
    );
  });

  it('uses "this user" in ban confirm when both display_name and email are null', () => {
    window.confirm = vi.fn(() => false);
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser({ display_name: null, email: null })], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);

    fireEvent.click(screen.getByTitle('Ban user'));

    expect(window.confirm).toHaveBeenCalledWith('Ban this user? They will not be able to log in.');
  });

  it('enters edit mode when Edit button is clicked', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser()], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);

    fireEvent.click(screen.getByTitle('Edit profile'));

    // Should show save/cancel buttons
    expect(screen.getByTitle('Save')).toBeInTheDocument();
    expect(screen.getByTitle('Cancel')).toBeInTheDocument();
    // Should show name input (not the search input)
    const inputs = screen.getAllByRole('textbox');
    expect(inputs.length).toBeGreaterThanOrEqual(2); // search + edit
  });

  it('calls updateProfile mutate on save', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser()], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);

    fireEvent.click(screen.getByTitle('Edit profile'));
    // Get the name edit input (has w-40 class — the edit field inside the table)
    const allInputs = screen.getAllByRole('textbox');
    const editInput = allInputs.find((el) => (el as HTMLInputElement).className.includes('w-40'));
    expect(editInput).toBeDefined();
    fireEvent.change(editInput!, { target: { value: 'New Name' } });
    fireEvent.click(screen.getByTitle('Save'));

    expect(mockUpdateProfileMutate).toHaveBeenCalledWith(
      { userId: 'user-1', fields: { display_name: 'New Name' } },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('exits edit mode on cancel', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser()], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);

    fireEvent.click(screen.getByTitle('Edit profile'));
    expect(screen.getByTitle('Cancel')).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Cancel'));
    expect(screen.queryByTitle('Cancel')).not.toBeInTheDocument();
    expect(screen.getByTitle('Edit profile')).toBeInTheDocument();
  });

  it('shows pagination when totalPages > 1', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: {
        users: [makeUser()],
        totalCount: 51, // 51 users = 2 pages at PAGE_SIZE=50
      },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByTestId('pagination')).toBeInTheDocument();
  });

  it('does not show pagination when totalPages <= 1', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser()], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.queryByTestId('pagination')).not.toBeInTheDocument();
  });

  it('renders avatar image when avatar_url is set', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser({ avatar_url: 'https://example.com/avatar.jpg' })], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    const img = screen.getByAltText('John Doe');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders initials fallback when no avatar_url', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser({ avatar_url: null })], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText('J')).toBeInTheDocument(); // first letter of "John"
  });

  it('shows "?" initials when both avatar_url and display_name are null', () => {
    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser({ avatar_url: null, display_name: null })], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);
    expect(screen.getByText('?')).toBeInTheDocument();
  });

  it('hides action buttons in read-only mode', async () => {
    const { usePermissions } = await import('@/hooks/usePermissions');
    vi.mocked(usePermissions).mockReturnValue({
      isReadOnly: true,
      languageCodes: [],
    } as unknown as ReturnType<typeof usePermissions>);

    mockUseAdminEndUsers.mockReturnValue({
      data: { users: [makeUser()], totalCount: 1 },
      isLoading: false,
      isError: false,
      error: null,
      isFetching: false,
    });
    render(<AppUsersPage />);

    expect(screen.queryByTitle('Edit profile')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Ban user')).not.toBeInTheDocument();
  });
});
