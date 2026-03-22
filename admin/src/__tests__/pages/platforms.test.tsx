import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlatformsPage from '@/app/(dashboard)/platforms/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
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

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useAdminPlatforms: () => ({ data: [], isLoading: false }),
  useDeletePlatform: () => ({ mutate: vi.fn(), isPending: false }),
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

describe('PlatformsPage', () => {
  it('renders empty state when no platforms', () => {
    renderWithProviders(<PlatformsPage />);
    expect(screen.getByText(/No platforms found/)).toBeInTheDocument();
  });
});
