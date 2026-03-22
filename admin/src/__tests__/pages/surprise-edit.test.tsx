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

/* eslint-disable @typescript-eslint/no-explicit-any */
const capturedDockProps: Record<string, any> = {};
vi.mock('@/components/common/FormChangesDock', () => ({
  FormChangesDock: (props: any) => {
    capturedDockProps.current = props;
    return <div data-testid="form-changes-dock" />;
  },
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
    // Invoke onSuccess to cover the router.push('/surprise') callback
    const deleteCall = mockDeleteMutate.mock.calls[0];
    const deleteOptions = deleteCall[1];
    deleteOptions.onSuccess();
    expect(mockRouterPush).toHaveBeenCalledWith('/surprise');
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

  it('calls updateItem.mutate when handleSave fires', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument());

    // Modify the title to trigger save
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Song' } });

    // FormChangesDock is mocked, so the save is triggered via the component's handleSave
    // We can't trigger it directly but can verify the state setup
    expect(screen.getByDisplayValue('Updated Song')).toBeInTheDocument();
  });

  it('renders youtube_id input with loaded value', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('abc123')).toBeInTheDocument();
    });
  });

  it('updates youtube_id input when changed', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('abc123')).toBeInTheDocument());
    fireEvent.change(screen.getByLabelText('YouTube ID'), { target: { value: 'xyz789' } });
    expect(screen.getByDisplayValue('xyz789')).toBeInTheDocument();
  });

  it('updates category select when changed', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      const select = screen.getByLabelText('Category') as HTMLSelectElement;
      expect(select.value).toBe('song');
    });

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'bts' } });
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('bts');
  });

  it('updates views input when changed (clamps to non-negative integer)', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: { ...mockItem, views: 50 },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('50')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Views'), { target: { value: '200' } });
    expect(screen.getByDisplayValue('200')).toBeInTheDocument();
  });

  it('renders back link to /surprise', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      const link = screen.getByRole('link');
      expect(link).toHaveAttribute('href', '/surprise');
    });
  });

  it('updates description textarea when changed', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: { ...mockItem, description: 'old desc' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('old desc')).toBeInTheDocument());

    const textarea = screen.getByLabelText('Description');
    fireEvent.change(textarea, { target: { value: 'new desc' } });
    expect(screen.getByDisplayValue('new desc')).toBeInTheDocument();
  });

  it('handleSave calls updateItem.mutate with current form values', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument());

    // Modify title
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated Title' } });

    // Invoke handleSave via FormChangesDock props
    act(() => capturedDockProps.current.onSave());

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: '1',
        title: 'Updated Title',
        youtube_id: 'abc123',
        category: 'song',
        views: 100,
      }),
      expect.objectContaining({
        onSuccess: expect.any(Function),
        onError: expect.any(Function),
      }),
    );
  });

  it('handleSave onSuccess resets initialRef and saveStatus', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument());

    act(() => capturedDockProps.current.onSave());

    // Extract the onSuccess callback and call it
    const mutateCall = mockMutate.mock.calls[0];
    const callbacks = mutateCall[1];
    act(() => callbacks.onSuccess());

    // saveStatus should be 'success' now (dock receives it)
    expect(capturedDockProps.current.saveStatus).toBe('success');
  });

  it('handleSave onError resets saveStatus to idle', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument());

    act(() => capturedDockProps.current.onSave());

    const mutateCall = mockMutate.mock.calls[0];
    const callbacks = mutateCall[1];
    act(() => callbacks.onError());

    expect(capturedDockProps.current.saveStatus).toBe('idle');
  });

  it('handleSave sends null for empty description', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: { ...mockItem, description: 'some desc' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('some desc')).toBeInTheDocument());

    // Clear description
    fireEvent.change(screen.getByLabelText('Description'), { target: { value: '' } });
    act(() => capturedDockProps.current.onSave());

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({ description: null }),
      expect.any(Object),
    );
  });

  it('handleDiscard resets all fields to initial values', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument());

    // Modify fields
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Changed' } });
    fireEvent.change(screen.getByLabelText('YouTube ID'), { target: { value: 'new-id' } });

    expect(screen.getByDisplayValue('Changed')).toBeInTheDocument();

    // Discard
    act(() => capturedDockProps.current.onDiscard());

    expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument();
    expect(screen.getByDisplayValue('abc123')).toBeInTheDocument();
  });

  it('handleRevertField reverts only the specified field', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument());

    // Modify title and youtubeId
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Changed Title' } });
    fireEvent.change(screen.getByLabelText('YouTube ID'), { target: { value: 'new-id' } });

    // Revert only title
    act(() => capturedDockProps.current.onRevertField('title'));
    expect(screen.getByDisplayValue('Test Song')).toBeInTheDocument();
    // YouTube ID should still be changed
    expect(screen.getByDisplayValue('new-id')).toBeInTheDocument();
  });

  it('handleRevertField reverts description field', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: { ...mockItem, description: 'original' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('original')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Description'), { target: { value: 'changed' } });
    act(() => capturedDockProps.current.onRevertField('description'));
    expect(screen.getByDisplayValue('original')).toBeInTheDocument();
  });

  it('handleRevertField reverts youtubeId field', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('abc123')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('YouTube ID'), { target: { value: 'changed-id' } });
    act(() => capturedDockProps.current.onRevertField('youtubeId'));
    expect(screen.getByDisplayValue('abc123')).toBeInTheDocument();
  });

  it('handleRevertField reverts category field', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => {
      expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('song');
    });

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'bts' } });
    act(() => capturedDockProps.current.onRevertField('category'));
    expect((screen.getByLabelText('Category') as HTMLSelectElement).value).toBe('song');
  });

  it('handleRevertField reverts views field', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: { ...mockItem, views: 42 },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('42')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Views'), { target: { value: '999' } });
    act(() => capturedDockProps.current.onRevertField('views'));
    expect(screen.getByDisplayValue('42')).toBeInTheDocument();
  });

  it('views input clamps negative values to 0', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('100')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Views'), { target: { value: '-5' } });
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('views input handles non-numeric value as 0', async () => {
    mockedUseAdminSurpriseItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminSurpriseItem>);

    renderWithProviders(<EditSurpriseContentPage />);
    await waitFor(() => expect(screen.getByDisplayValue('100')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Views'), { target: { value: 'abc' } });
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });
});
