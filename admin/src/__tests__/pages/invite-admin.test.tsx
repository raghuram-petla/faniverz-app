import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import InviteAdminPage from '@/app/(dashboard)/users/invite/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null }),
      ilike: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
      signOut: vi.fn(),
    },
    functions: { invoke: vi.fn() },
  },
}));

const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, back: vi.fn() }),
  usePathname: () => '/users/invite',
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

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: {
      id: 'super-1',
      role: 'super_admin',
      email: 'admin@test.com',
      productionHouseIds: [],
    },
    isLoading: false,
    isAccessDenied: false,
    blockedReason: null,
    signInWithGoogle: vi.fn(),

    signOut: vi.fn(),
    refreshUser: vi.fn(),
  }),
}));

vi.mock('@/hooks/useImpersonation', () => ({
  useEffectiveUser: () => ({
    id: 'super-1',
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

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isReadOnly: false,
    isPHAdmin: false,
    productionHouseIds: [],
    canCreate: () => true,
    canDeleteTopLevel: () => true,
    canManageAdmin: (role: string) => role !== 'root', // super_admin can manage all except root
    role: 'super_admin',
    isSuperAdmin: true,
  }),
}));

const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useAdminUsers', () => ({
  useInviteAdmin: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
    isError: false,
    error: null,
  }),
  useAdminUserList: () => ({ data: [], isLoading: false }),
  useAdminInvitations: () => ({ data: [], isLoading: false }),
  useRevokeAdmin: () => ({ mutate: vi.fn(), isPending: false }),
  useRevokeInvitation: () => ({ mutate: vi.fn(), isPending: false }),
  useUpdateAdminRole: () => ({ mutate: vi.fn(), isPending: false }),
  useBlockAdmin: () => ({ mutate: vi.fn(), isPending: false }),
  useUnblockAdmin: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useLanguageContext', () => ({
  useLanguageContext: () => ({
    languages: [
      { id: 'lang-1', code: 'te', name: 'Telugu' },
      { id: 'lang-2', code: 'ta', name: 'Tamil' },
      { id: 'lang-3', code: 'hi', name: 'Hindi' },
    ],
    selectedLanguageId: null,
    setSelectedLanguageId: vi.fn(),
    selectedLanguageCode: null,
    userLanguageIds: [],
    showSwitcher: true,
    availableLanguages: [],
  }),
}));

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useAdminProductionHouses: () => ({
    data: { pages: [[]] },
    isLoading: false,
    isFetching: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    isFetchingNextPage: false,
  }),
  useDeleteProductionHouse: () => ({ mutate: vi.fn() }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('InviteAdminPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Invite New Admin" heading', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByText('Invite New Admin')).toBeInTheDocument();
  });

  it('renders email input field', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument();
  });

  it('renders role select dropdown', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders "Create Invitation" submit button', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByText('Create Invitation')).toBeInTheDocument();
  });

  it('disables submit button when email is empty', () => {
    renderWithProviders(<InviteAdminPage />);
    const btn = screen.getByText('Create Invitation').closest('button');
    expect(btn).toBeDisabled();
  });

  it('enables submit button when email is filled', () => {
    renderWithProviders(<InviteAdminPage />);
    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
      target: { value: 'new@example.com' },
    });
    const btn = screen.getByText('Create Invitation').closest('button');
    expect(btn).not.toBeDisabled();
  });

  it('renders "Back to Admin Management" link', () => {
    renderWithProviders(<InviteAdminPage />);
    expect(screen.getByText('Back to Admin Management')).toBeInTheDocument();
  });

  it('does NOT show PH assignment section for non-PH roles', () => {
    renderWithProviders(<InviteAdminPage />);
    // Default role for super_admin should be super_admin or admin, not ph_admin
    expect(screen.queryByText('Assign Production Houses')).not.toBeInTheDocument();
  });

  it('shows PH assignment section when production_house_admin role is selected', () => {
    renderWithProviders(<InviteAdminPage />);
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'production_house_admin' } });
    expect(screen.getByText('Assign Production Houses')).toBeInTheDocument();
  });

  it('shows "No production houses available" when no houses exist for PH role', () => {
    renderWithProviders(<InviteAdminPage />);
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'production_house_admin' } });
    expect(screen.getByText('No production houses available')).toBeInTheDocument();
  });

  it('hides PH assignment when role switches away from production_house_admin', () => {
    renderWithProviders(<InviteAdminPage />);
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'production_house_admin' } });
    expect(screen.getByText('Assign Production Houses')).toBeInTheDocument();
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    expect(screen.queryByText('Assign Production Houses')).not.toBeInTheDocument();
  });

  it('shows alert when PH role is selected but no PH is assigned on submit', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithProviders(<InviteAdminPage />);

    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'production_house_admin' } });
    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
      target: { value: 'ph@example.com' },
    });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(alertSpy).toHaveBeenCalledWith('Please select at least one production house.');
    alertSpy.mockRestore();
  });

  it('calls mutateAsync with correct payload on form submit', async () => {
    mockMutateAsync.mockResolvedValue({ token: 'abc-token-123' });

    renderWithProviders(<InviteAdminPage />);
    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
      target: { value: 'newadmin@example.com' },
    });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newadmin@example.com',
        invited_by: 'super-1',
        production_house_ids: [],
      }),
    );
  });

  it('renders invite link success view after successful submission', async () => {
    mockMutateAsync.mockResolvedValue({ token: 'tok-xyz' });

    renderWithProviders(<InviteAdminPage />);
    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
      target: { value: 'invited@example.com' },
    });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    await waitFor(() => {
      expect(screen.getByText('Invitation Created')).toBeInTheDocument();
    });
  });

  it('shows Copy button in success view', async () => {
    mockMutateAsync.mockResolvedValue({ token: 'tok-xyz' });

    renderWithProviders(<InviteAdminPage />);
    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
      target: { value: 'invited@example.com' },
    });

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });

    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument();
    });
  });

  it('navigates to /users when "Back to Admin Management" button is clicked in success view', async () => {
    mockMutateAsync.mockResolvedValue({ token: 'tok-xyz' });

    renderWithProviders(<InviteAdminPage />);
    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
      target: { value: 'invited@example.com' },
    });

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });

    await waitFor(() => expect(screen.getByText('Invitation Created')).toBeInTheDocument());

    const backBtn = screen
      .getAllByText('Back to Admin Management')
      .find((el) => el.tagName === 'BUTTON');
    if (backBtn) {
      fireEvent.click(backBtn);
      expect(mockRouterPush).toHaveBeenCalledWith('/users');
    }
  });

  it('shows error alert on failed invitation', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockMutateAsync.mockRejectedValue(new Error('Failed to invite'));

    renderWithProviders(<InviteAdminPage />);
    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
      target: { value: 'bad@example.com' },
    });

    await act(async () => {
      fireEvent.submit(document.querySelector('form')!);
    });

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to invite');
    });
    alertSpy.mockRestore();
  });

  it('available roles exclude root for super_admin (canManageAdmin check)', () => {
    renderWithProviders(<InviteAdminPage />);
    const roleSelect = screen.getByRole('combobox');
    const options = Array.from(roleSelect.querySelectorAll('option'));
    const values = options.map((o) => o.getAttribute('value'));
    expect(values).not.toContain('root');
    // Should contain the invitable sub-roles
    expect(values).toContain('super_admin');
    expect(values).toContain('admin');
  });

  it('shows language assignment section when admin role is selected', () => {
    renderWithProviders(<InviteAdminPage />);
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    expect(screen.getByText('Assign Languages')).toBeInTheDocument();
    expect(screen.getByText('Telugu')).toBeInTheDocument();
    expect(screen.getByText('Tamil')).toBeInTheDocument();
    expect(screen.getByText('Hindi')).toBeInTheDocument();
  });

  it('does NOT show language section for non-admin roles', () => {
    renderWithProviders(<InviteAdminPage />);
    // Default role is super_admin
    expect(screen.queryByText('Assign Languages')).not.toBeInTheDocument();
  });

  it('hides language section when role switches away from admin', () => {
    renderWithProviders(<InviteAdminPage />);
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    expect(screen.getByText('Assign Languages')).toBeInTheDocument();
    fireEvent.change(roleSelect, { target: { value: 'viewer' } });
    expect(screen.queryByText('Assign Languages')).not.toBeInTheDocument();
  });

  it('shows alert when admin role is selected but no language is assigned on submit', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithProviders(<InviteAdminPage />);

    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'admin' } });
    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
      target: { value: 'admin@example.com' },
    });

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(alertSpy).toHaveBeenCalledWith('Please select at least one language.');
    alertSpy.mockRestore();
  });

  it('passes language_ids in payload when admin role with languages is submitted', async () => {
    mockMutateAsync.mockResolvedValue({ token: 'abc-token-123' });

    renderWithProviders(<InviteAdminPage />);
    const roleSelect = screen.getByRole('combobox');
    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    fireEvent.change(screen.getByPlaceholderText('admin@example.com'), {
      target: { value: 'newadmin@example.com' },
    });

    // Select Telugu language
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]); // Telugu

    const form = document.querySelector('form')!;
    await act(async () => {
      fireEvent.submit(form);
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        email: 'newadmin@example.com',
        role_id: 'admin',
        language_ids: ['lang-1'],
        production_house_ids: [],
        invited_by: 'super-1',
      }),
    );
  });
});
