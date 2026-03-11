import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditOttReleasePage from '@/app/(dashboard)/ott/[id]/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signInWithPassword: vi.fn(),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  usePathname: () => '/ott/movie-id~platform-id',
  useParams: () => ({ id: 'movie-id~platform-id' }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const mockRelease = {
  movie_id: 'movie-id',
  platform_id: 'platform-id',
  available_from: '2026-04-01',
  streaming_url: 'https://example.com/watch',
  movie: { id: 'movie-id', title: 'Test Movie', poster_url: null },
  platform: { id: 'platform-id', name: 'aha', color: '#FF5722', logo: 'a', logo_url: null },
};

const mockMutate = vi.fn();

vi.mock('@/hooks/useAdminOtt', () => ({
  useAdminOttReleases: vi.fn(),
  useUpdateOttRelease: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import { useAdminOttReleases } from '@/hooks/useAdminOtt';

const mockedUseAdminOttReleases = vi.mocked(useAdminOttReleases);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('EditOttReleasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAdminOttReleases.mockReturnValue({
      data: [mockRelease],
      isLoading: false,
      isError: false,
      error: null,
    } as ReturnType<typeof useAdminOttReleases>);
  });

  it('renders "Edit OTT Release" heading', () => {
    renderWithProviders(<EditOttReleasePage />);
    expect(screen.getByText('Edit OTT Release')).toBeInTheDocument();
  });

  it('shows movie title and platform name in the info bar', () => {
    renderWithProviders(<EditOttReleasePage />);
    expect(screen.getByText('Test Movie')).toBeInTheDocument();
    expect(screen.getByText('aha')).toBeInTheDocument();
  });

  it('pre-fills form fields from the release data', () => {
    renderWithProviders(<EditOttReleasePage />);
    const dateInput = screen.getByLabelText(/Available From/i) as HTMLInputElement;
    const urlInput = screen.getByLabelText(/Streaming URL/i) as HTMLInputElement;
    expect(dateInput.value).toBe('2026-04-01');
    expect(urlInput.value).toBe('https://example.com/watch');
  });

  it('shows loading spinner when loading', () => {
    mockedUseAdminOttReleases.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      error: null,
    } as ReturnType<typeof useAdminOttReleases>);

    const { container } = renderWithProviders(<EditOttReleasePage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('shows not-found message when release does not exist', () => {
    mockedUseAdminOttReleases.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
    } as unknown as ReturnType<typeof useAdminOttReleases>);

    renderWithProviders(<EditOttReleasePage />);
    expect(screen.getByText('OTT release not found.')).toBeInTheDocument();
  });

  it('calls updateRelease.mutate on form submit', async () => {
    renderWithProviders(<EditOttReleasePage />);

    const submitButton = screen.getByText('Save Changes');
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate).toHaveBeenCalledWith(
        {
          movieId: 'movie-id',
          platformId: 'platform-id',
          available_from: '2026-04-01',
          streaming_url: 'https://example.com/watch',
        },
        expect.objectContaining({
          onSuccess: expect.any(Function),
          onError: expect.any(Function),
        }),
      );
    });
  });

  it('renders Cancel link pointing to /ott', () => {
    renderWithProviders(<EditOttReleasePage />);
    const cancelLink = screen.getByText('Cancel');
    expect(cancelLink).toBeInTheDocument();
    expect(cancelLink).toHaveAttribute('href', '/ott');
  });

  it('renders back arrow link pointing to /ott', () => {
    renderWithProviders(<EditOttReleasePage />);
    const backLink = document.querySelector('a[href="/ott"]');
    expect(backLink).toBeInTheDocument();
  });
});
