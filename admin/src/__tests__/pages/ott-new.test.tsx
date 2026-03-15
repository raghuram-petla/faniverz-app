import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewOttReleasePage from '@/app/(dashboard)/ott/new/page';
import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';

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

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/ott/new',
  useParams: () => ({}),
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

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/hooks/useAdminMovies', () => ({
  useAllMovies: vi.fn(),
}));

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: vi.fn(),
}));

vi.mock('@/hooks/useAdminOtt', () => ({
  useCreateOttRelease: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
}));

import { useAllMovies } from '@/hooks/useAdminMovies';
import { useAdminPlatforms } from '@/hooks/useAdminPlatforms';

const mockedUseAllMovies = vi.mocked(useAllMovies);
const mockedUseAdminPlatforms = vi.mocked(useAdminPlatforms);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('NewOttReleasePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseAllMovies.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAllMovies>);
    mockedUseAdminPlatforms.mockReturnValue({
      data: [],
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminPlatforms>);
  });

  it('renders loading spinner when data is loading', () => {
    mockedUseAllMovies.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useAllMovies>);

    const { container } = renderWithProviders(<NewOttReleasePage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders "Add OTT Release" heading', async () => {
    renderWithProviders(<NewOttReleasePage />);
    await waitFor(() => {
      expect(screen.getByText('Add OTT Release')).toBeInTheDocument();
    });
  });

  it('renders movie and platform dropdowns', async () => {
    renderWithProviders(<NewOttReleasePage />);
    await waitFor(() => {
      expect(screen.getByText('Select a movie...')).toBeInTheDocument();
      expect(screen.getByText('Select a platform...')).toBeInTheDocument();
    });
  });

  it('calls useUnsavedChangesWarning hook', () => {
    renderWithProviders(<NewOttReleasePage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });
});
