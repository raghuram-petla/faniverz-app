import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AppUsersPage from '@/app/(dashboard)/app-users/page';

vi.mock('@/hooks/useAdminEndUsers', () => ({
  useAdminEndUsers: vi.fn(),
  useBanUser: vi.fn(),
  useUpdateEndUserProfile: vi.fn(),
}));

vi.mock('@/hooks/useDebouncedSearch', () => ({
  useDebouncedSearch: vi.fn(),
}));

import { useAdminEndUsers, useBanUser, useUpdateEndUserProfile } from '@/hooks/useAdminEndUsers';
import { useDebouncedSearch } from '@/hooks/useDebouncedSearch';

const mockUseAdminEndUsers = vi.mocked(useAdminEndUsers);
const mockUseBanUser = vi.mocked(useBanUser);
const mockUseUpdateEndUserProfile = vi.mocked(useUpdateEndUserProfile);
const mockUseDebouncedSearch = vi.mocked(useDebouncedSearch);

const mockUsers = [
  {
    id: 'usr-1',
    display_name: 'John Doe',
    username: 'johndoe',
    email: 'john@example.com',
    avatar_url: 'https://example.com/avatar.jpg',
    bio: 'Movie fan',
    location: 'Hyderabad',
    preferred_lang: 'te',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 'usr-2',
    display_name: null,
    username: null,
    email: 'jane@example.com',
    avatar_url: null,
    bio: null,
    location: null,
    preferred_lang: 'en',
    created_at: '2024-02-01T00:00:00Z',
  },
];

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockSetSearch = vi.fn();

const mockBanMutate = vi.fn();

beforeEach(() => {
  vi.restoreAllMocks();

  mockSetSearch.mockReset();
  mockBanMutate.mockReset();

  mockUseDebouncedSearch.mockReturnValue({
    search: '',
    setSearch: mockSetSearch as React.Dispatch<React.SetStateAction<string>>,
    debouncedSearch: '',
  });

  mockUseBanUser.mockReturnValue({
    mutate: mockBanMutate,
    isPending: false,
  } as unknown as ReturnType<typeof useBanUser>);

  mockUseUpdateEndUserProfile.mockReturnValue({
    mutate: vi.fn(),
    isPending: false,
  } as unknown as ReturnType<typeof useUpdateEndUserProfile>);
});

describe('AppUsersPage', () => {
  describe('header', () => {
    it('shows total count when data is loaded', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: mockUsers, totalCount: 125 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText('125 users')).toBeInTheDocument();
    });

    it('does not show count when data is undefined', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.queryByText(/\(\d+\)/)).not.toBeInTheDocument();
    });
  });

  describe('search', () => {
    it('renders search input', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: [], totalCount: 0 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(
        screen.getByPlaceholderText('Search by name, username, or email...'),
      ).toBeInTheDocument();
    });

    it('calls setSearch when typing in search input', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: [], totalCount: 0 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      const input = screen.getByPlaceholderText('Search by name, username, or email...');
      fireEvent.change(input, { target: { value: 'john' } });

      expect(mockSetSearch).toHaveBeenCalledWith('john');
    });
  });

  describe('loading state', () => {
    it('shows loading spinner when isLoading is true', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      const { container } = renderWithProviders(<AppUsersPage />);

      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('does not show table when loading', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: undefined,
        isLoading: true,
        isError: false,
        error: null,
        isFetching: true,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.queryByRole('table')).not.toBeInTheDocument();
    });
  });

  describe('error state', () => {
    it('shows error message when isError is true', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: undefined,
        isLoading: false,
        isError: true,
        error: new Error('Permission denied'),
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText(/Permission denied/)).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('shows "No users found." when users array is empty', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: [], totalCount: 0 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText('No users found.')).toBeInTheDocument();
    });

    it('shows search-specific empty state when searching', () => {
      mockUseDebouncedSearch.mockReturnValue({
        search: 'xyz',
        setSearch: mockSetSearch as React.Dispatch<React.SetStateAction<string>>,
        debouncedSearch: 'xyz',
      });

      mockUseAdminEndUsers.mockReturnValue({
        data: { users: [], totalCount: 0 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText('No users match your search.')).toBeInTheDocument();
    });
  });

  describe('data rendering', () => {
    beforeEach(() => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: mockUsers, totalCount: 2 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);
    });

    it('renders table with correct column headers', () => {
      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText('User')).toBeInTheDocument();
      expect(screen.getByText('Username')).toBeInTheDocument();
      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Joined')).toBeInTheDocument();
      expect(screen.getByText('Actions')).toBeInTheDocument();
    });

    it('renders user display_name', () => {
      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    it('shows "No name" when display_name is null', () => {
      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText('No name')).toBeInTheDocument();
    });

    it('renders username with @ prefix', () => {
      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText('@johndoe')).toBeInTheDocument();
    });

    it('shows "--" when username is null', () => {
      renderWithProviders(<AppUsersPage />);

      const dashes = screen.getAllByText('--');
      expect(dashes.length).toBeGreaterThanOrEqual(1);
    });

    it('renders user email', () => {
      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText('john@example.com')).toBeInTheDocument();
      expect(screen.getByText('jane@example.com')).toBeInTheDocument();
    });

    it('renders avatar image when avatar_url is present', () => {
      renderWithProviders(<AppUsersPage />);

      const avatar = screen.getByAltText('John Doe');
      expect(avatar).toBeInTheDocument();
      expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg');
    });

    it('renders initials fallback when avatar_url is null', () => {
      renderWithProviders(<AppUsersPage />);

      // usr-2 has no avatar_url and display_name is null, so initials should be '?'
      expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('renders formatted date', () => {
      renderWithProviders(<AppUsersPage />);

      const dateCells = screen.getAllByText(new Date('2024-01-01T00:00:00Z').toLocaleDateString());
      expect(dateCells.length).toBeGreaterThanOrEqual(1);
    });

    it('renders ban button for each user', () => {
      renderWithProviders(<AppUsersPage />);

      const banButtons = screen.getAllByTitle('Ban user');
      expect(banButtons).toHaveLength(2);
    });
  });

  describe('ban action', () => {
    beforeEach(() => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: mockUsers, totalCount: 2 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);
    });

    it('shows confirm dialog when ban button is clicked', () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<AppUsersPage />);

      const banButtons = screen.getAllByTitle('Ban user');
      fireEvent.click(banButtons[0]);

      expect(confirmSpy).toHaveBeenCalledWith('Ban John Doe? They will not be able to log in.');
    });

    it('calls banUser.mutate when confirm returns true', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);

      renderWithProviders(<AppUsersPage />);

      const banButtons = screen.getAllByTitle('Ban user');
      fireEvent.click(banButtons[0]);

      expect(mockBanMutate).toHaveBeenCalledWith('usr-1');
    });

    it('does not call banUser.mutate when confirm returns false', () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);

      renderWithProviders(<AppUsersPage />);

      const banButtons = screen.getAllByTitle('Ban user');
      fireEvent.click(banButtons[0]);

      expect(mockBanMutate).not.toHaveBeenCalled();
    });
  });

  describe('pagination', () => {
    it('does not show pagination when totalPages is 1', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: mockUsers, totalCount: 2 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.queryByText(/Page/)).not.toBeInTheDocument();
    });

    it('shows pagination when totalCount exceeds pageSize', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: mockUsers, totalCount: 75 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
      expect(screen.getByText('Showing 1--50 of 75')).toBeInTheDocument();
    });

    it('disables previous button on first page', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: mockUsers, totalCount: 75 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.getByTitle('Previous page')).toBeDisabled();
    });

    it('enables next button when more pages exist', () => {
      mockUseAdminEndUsers.mockReturnValue({
        data: { users: mockUsers, totalCount: 75 },
        isLoading: false,
        isError: false,
        error: null,
        isFetching: false,
      } as unknown as ReturnType<typeof useAdminEndUsers>);

      renderWithProviders(<AppUsersPage />);

      expect(screen.getByTitle('Next page')).not.toBeDisabled();
    });
  });
});
