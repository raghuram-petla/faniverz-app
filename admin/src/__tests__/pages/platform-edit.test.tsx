import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      gte: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      ilike: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/platforms/plat-1',
  useParams: () => ({ id: 'plat-1' }),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [k: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isReadOnly: false,
    canDeleteTopLevel: () => true,
  }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('EditPlatformPage', () => {
  it('renders edit platform heading after loading', async () => {
    const EditPlatformPage = (await import('@/app/(dashboard)/platforms/[id]/page')).default;
    renderWithProviders(<EditPlatformPage />);
    await waitFor(() => {
      expect(screen.getByText('Edit Platform')).toBeInTheDocument();
    });
  });

  it('renders delete button', async () => {
    const EditPlatformPage = (await import('@/app/(dashboard)/platforms/[id]/page')).default;
    renderWithProviders(<EditPlatformPage />);
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('renders back link to platforms list', async () => {
    const EditPlatformPage = (await import('@/app/(dashboard)/platforms/[id]/page')).default;
    renderWithProviders(<EditPlatformPage />);
    await waitFor(() => {
      const links = screen.getAllByRole('link');
      const backLink = links.find((l) => l.getAttribute('href') === '/platforms');
      expect(backLink).toBeTruthy();
    });
  });

  it('renders name label', async () => {
    const EditPlatformPage = (await import('@/app/(dashboard)/platforms/[id]/page')).default;
    renderWithProviders(<EditPlatformPage />);
    await waitFor(() => {
      expect(screen.getByText('Name *')).toBeInTheDocument();
    });
  });

  it('renders TMDB Provider ID label', async () => {
    const EditPlatformPage = (await import('@/app/(dashboard)/platforms/[id]/page')).default;
    renderWithProviders(<EditPlatformPage />);
    await waitFor(() => {
      expect(screen.getByText('TMDB Provider ID')).toBeInTheDocument();
    });
  });

  it('renders Countries label', async () => {
    const EditPlatformPage = (await import('@/app/(dashboard)/platforms/[id]/page')).default;
    renderWithProviders(<EditPlatformPage />);
    await waitFor(() => {
      expect(screen.getByText('Countries')).toBeInTheDocument();
    });
  });
});
