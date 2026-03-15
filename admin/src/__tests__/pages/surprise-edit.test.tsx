import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditSurpriseContentPage from '@/app/(dashboard)/surprise/[id]/page';
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
  usePathname: () => '/surprise/1',
  useParams: () => ({ id: '1' }),
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

vi.mock('@/hooks/useAdminSurprise', () => ({
  useAdminSurpriseItem: vi.fn(),
  useUpdateSurprise: () => ({ mutate: vi.fn(), isPending: false, isError: false, error: null }),
  useDeleteSurprise: () => ({ mutate: vi.fn(), isPending: false }),
}));

import { useAdminSurpriseItem } from '@/hooks/useAdminSurprise';

const mockedUseAdminSurpriseItem = vi.mocked(useAdminSurpriseItem);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('EditSurpriseContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner when loading', () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    const { container } = renderWithProviders(<EditSurpriseContentPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders "Edit Content" heading when data is loaded', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: {
        id: '1',
        title: 'Test',
        description: null,
        youtube_id: 'abc',
        category: 'song',
        views: 0,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(screen.getByText('Edit Content')).toBeInTheDocument();
    });
  });

  it('renders title input with loaded value', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: {
        id: '1',
        title: 'Test',
        description: null,
        youtube_id: 'abc',
        category: 'song',
        views: 0,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test')).toBeInTheDocument();
    });
  });

  it('calls useUnsavedChangesWarning hook', () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: {
        id: '1',
        title: 'Test',
        description: null,
        youtube_id: 'abc',
        category: 'song',
        views: 0,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });
});
