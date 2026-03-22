import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
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

const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, back: vi.fn() }),
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

vi.mock('@/hooks/useFormChanges', () => ({
  useFormChanges: () => ({ changes: [], isDirty: false, changeCount: 0 }),
}));

vi.mock('@/components/common/FormChangesDock', () => ({
  FormChangesDock: () => <div data-testid="form-changes-dock" />,
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isReadOnly: false,
    isPHAdmin: false,
    productionHouseIds: [],
    canCreate: () => true,
    canDeleteTopLevel: () => true,
    canManageAdmin: () => true,
    role: 'super_admin',
    isSuperAdmin: true,
  }),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: () => ({
    id: 'user-1',
    role: 'super_admin',
    productionHouseIds: [],
    languageIds: [],
    languageCodes: [],
  }),
  useImpersonation: () => ({
    isImpersonating: false,
    effectiveUser: null,
    realUser: null,
    startImpersonation: vi.fn(),
    startRoleImpersonation: vi.fn(),
    stopImpersonation: vi.fn(),
  }),
}));

const mockMutate = vi.fn();
const mockDeleteMutate = vi.fn();

vi.mock('@/hooks/useAdminSurprise', () => ({
  useAdminSurpriseItem: vi.fn(),
  useUpdateSurprise: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  }),
  useDeleteSurprise: () => ({ mutate: mockDeleteMutate, isPending: false }),
}));

import { useAdminSurpriseItem } from '@/hooks/useAdminSurprise';

const mockedUseAdminSurpriseItem = vi.mocked(useAdminSurpriseItem);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockItem = {
  id: '1',
  title: 'Test Song',
  description: null,
  youtube_id: 'abc123',
  category: 'song',
  views: 100,
};

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

  it('renders "Content not found" when data is null and not loading', () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    expect(screen.getByText('Content not found.')).toBeInTheDocument();
  });

  it('renders "Edit Content" heading when data is loaded', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(screen.getByText('Edit Content')).toBeInTheDocument();
    });
  });

  it('renders title input with loaded value', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument();
    });
  });

  it('calls useUnsavedChangesWarning hook', () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });

  it('renders Delete button when not read-only', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('renders YouTube iframe when youtube_id is set', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    const { container } = renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toContain('abc123');
    });
  });

  it('does NOT render iframe when youtube_id is empty', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: { ...mockItem, youtube_id: '' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    const { container } = renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(container.querySelector('iframe')).not.toBeInTheDocument();
    });
  });

  it('renders views input populated with loaded value', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: { ...mockItem, views: 500 },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('500')).toBeInTheDocument();
    });
  });

  it('renders category select populated with loaded category', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      const select = screen.getByLabelText('Category') as HTMLSelectElement;
      expect(select.value).toBe('song');
    });
  });

  it('renders FormChangesDock', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(screen.getByTestId('form-changes-dock')).toBeInTheDocument();
    });
  });

  it('calls deleteItem.mutate and navigates on confirmed delete', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });

    expect(mockDeleteMutate).toHaveBeenCalledWith(
      '1',
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
    vi.restoreAllMocks();
  });

  it('does NOT call deleteItem.mutate when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Delete'));
    expect(mockDeleteMutate).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('renders description textarea (empty for null description)', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: { ...mockItem, description: null },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    const { container } = renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      const textarea = container.querySelector('textarea');
      expect(textarea).toBeInTheDocument();
      expect(textarea?.value).toBe('');
    });
  });

  it('renders description textarea with loaded value', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: { ...mockItem, description: 'A great song' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('A great song')).toBeInTheDocument();
    });
  });

  it('renders all five category options plus placeholder', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      const select = screen.getByLabelText('Category');
      const options = select.querySelectorAll('option');
      // placeholder + 5 categories
      expect(options).toHaveLength(6);
    });
  });
});
