import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TheatersPage from '@/app/(dashboard)/theaters/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/theaters',
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

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TheatersPage', () => {
  it('renders "In Theaters" section heading', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.getByText('In Theaters')).toBeInTheDocument();
  });

  it('renders "Upcoming" section', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('renders "Add a Movie to "In Theaters"" section', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.getByText('Add a Movie to "In Theaters"')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.getByPlaceholderText('Search movies...')).toBeInTheDocument();
  });

  it('hides Save Changes button when no changes pending', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('does not show Discard button when no changes pending', () => {
    renderWithProviders(<TheatersPage />);
    expect(screen.queryByText('Discard')).not.toBeInTheDocument();
  });

  it('shows empty state when no movies are in theaters', async () => {
    renderWithProviders(<TheatersPage />);
    expect(await screen.findByText('No movies currently in theaters')).toBeInTheDocument();
  });
});
