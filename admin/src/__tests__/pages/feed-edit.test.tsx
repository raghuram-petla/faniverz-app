import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditFeedItemPage from '@/app/(dashboard)/feed/[id]/page';
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
  usePathname: () => '/feed/1',
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

const mockMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

vi.mock('@/hooks/useAdminFeed', () => ({
  useAdminFeedItem: vi.fn(),
  useUpdateFeedItem: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
  useDeleteFeedItem: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
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

import { useAdminFeedItem } from '@/hooks/useAdminFeed';

const mockedUseAdminFeedItem = vi.mocked(useAdminFeedItem);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

const mockItem = {
  id: '1',
  title: 'Test Feed',
  description: 'desc',
  is_pinned: false,
  is_featured: false,
  feed_type: 'update',
  content_type: 'update',
  youtube_id: null,
  thumbnail_url: null,
  source_table: null,
  movie: null,
};

describe('EditFeedItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner when loading', () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    const { container } = renderWithProviders(<EditFeedItemPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders "Feed item not found" when data is null and not loading', () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: undefined,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    expect(screen.getByText('Feed item not found.')).toBeInTheDocument();
  });

  it('renders "Edit Feed Item" heading when data is loaded', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByText('Edit Feed Item')).toBeInTheDocument();
    });
  });

  it('renders title input with loaded value', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument();
    });
  });

  it('calls useUnsavedChangesWarning hook', () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });

  it('renders Delete button when not read-only', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('renders feed type and content type badges', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByText('Type: update')).toBeInTheDocument();
      expect(screen.getByText('Content: update')).toBeInTheDocument();
    });
  });

  it('renders source_table notice when source_table is set', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, source_table: 'movies' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    const { container } = renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      // The notice div contains "Auto-generated from <code>movies</code>"
      const notice = container.querySelector('.text-on-surface-muted.text-sm');
      expect(notice?.textContent).toContain('Auto-generated from');
      expect(notice?.textContent).toContain('movies');
    });
  });

  it('renders YouTube iframe when youtube_id is set', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, youtube_id: 'abc123' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    const { container } = renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      const iframe = container.querySelector('iframe');
      expect(iframe).toBeInTheDocument();
      expect(iframe?.src).toContain('abc123');
    });
  });

  it('renders thumbnail img when thumbnail_url is set but no youtube_id', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, thumbnail_url: 'https://example.com/thumb.jpg' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    const { container } = renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      const img = container.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img?.src).toContain('example.com');
    });
  });

  it('renders movie badge when item has a linked movie', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, movie: { title: 'RRR' } },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByText('Movie: RRR')).toBeInTheDocument();
    });
  });

  it('renders FormChangesDock', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByTestId('form-changes-dock')).toBeInTheDocument();
    });
  });

  it('calls deleteMutation and navigates on confirmed delete', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    mockDeleteMutateAsync.mockResolvedValue({});

    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });

    expect(mockDeleteMutateAsync).toHaveBeenCalledWith('1');
    expect(mockRouterPush).toHaveBeenCalledWith('/feed');
    vi.restoreAllMocks();
  });

  it('does NOT call deleteMutation when confirm is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());

    fireEvent.click(screen.getByText('Delete'));
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('renders description textarea populated with loaded description', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, description: 'A description' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByDisplayValue('A description')).toBeInTheDocument();
    });
  });

  it('renders Pin to top and Featured checkboxes', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByText('Pin to top')).toBeInTheDocument();
      expect(screen.getByText('Featured')).toBeInTheDocument();
    });
  });

  it('toggles Pin to top checkbox', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Pin to top')).toBeInTheDocument());

    const checkbox = screen.getByText('Pin to top').closest('label')?.querySelector('input');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox!);
    expect(checkbox).toBeChecked();
  });

  it('toggles Featured checkbox', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Featured')).toBeInTheDocument());

    const checkbox = screen.getByText('Featured').closest('label')?.querySelector('input');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox!);
    expect(checkbox).toBeChecked();
  });

  it('renders title input that can be changed', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('Test Feed'), { target: { value: 'New Title' } });
    expect(screen.getByDisplayValue('New Title')).toBeInTheDocument();
  });

  it('renders description textarea that can be changed', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, description: 'initial' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByDisplayValue('initial')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('initial'), { target: { value: 'updated' } });
    expect(screen.getByDisplayValue('updated')).toBeInTheDocument();
  });

  it('does not render source_table notice when source_table is null', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, source_table: null },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Edit Feed Item')).toBeInTheDocument());
    expect(screen.queryByText('Auto-generated from')).not.toBeInTheDocument();
  });

  it('does not render media when youtube_id and thumbnail_url are null', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, youtube_id: null, thumbnail_url: null },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    const { container } = renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Edit Feed Item')).toBeInTheDocument());
    expect(container.querySelector('iframe')).not.toBeInTheDocument();
    expect(container.querySelector('img')).not.toBeInTheDocument();
  });

  it('does not render movie badge when movie is null', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, movie: null },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Edit Feed Item')).toBeInTheDocument());
    expect(screen.queryByText(/^Movie:/)).not.toBeInTheDocument();
  });

  it('shows error alert when delete fails', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockDeleteMutateAsync.mockRejectedValue(new Error('Delete failed'));

    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });

    expect(window.alert).toHaveBeenCalledWith('Delete failed: Delete failed');
    vi.restoreAllMocks();
  });

  it('renders back link to /feed', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => {
      expect(screen.getByRole('link', { name: '' })).toHaveAttribute('href', '/feed');
    });
  });

  it('handleSave calls updateMutation.mutateAsync and sets success', async () => {
    mockMutateAsync.mockResolvedValue({});
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('Test Feed'), { target: { value: 'Updated' } });

    await act(async () => {
      capturedDockProps.current.onSave();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', title: 'Updated' }),
    );
    expect(capturedDockProps.current.saveStatus).toBe('success');
  });

  it('handleSave sets idle and alerts on error', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Save failed'));
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument());

    await act(async () => {
      capturedDockProps.current.onSave();
    });

    expect(window.alert).toHaveBeenCalledWith('Save failed: Save failed');
    expect(capturedDockProps.current.saveStatus).toBe('idle');
    vi.restoreAllMocks();
  });

  it('handleSave sends null for empty description', async () => {
    mockMutateAsync.mockResolvedValue({});
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, description: 'some desc' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByDisplayValue('some desc')).toBeInTheDocument());

    // Clear description
    const textarea = screen.getByDisplayValue('some desc');
    fireEvent.change(textarea, { target: { value: '' } });

    await act(async () => {
      capturedDockProps.current.onSave();
    });

    expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  it('handleDiscard resets all fields to initial values', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('Test Feed'), { target: { value: 'Changed' } });
    expect(screen.getByDisplayValue('Changed')).toBeInTheDocument();

    act(() => capturedDockProps.current.onDiscard());
    expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument();
  });

  it('handleRevertField reverts only the specified field', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, description: 'original desc' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('Test Feed'), { target: { value: 'New Title' } });
    fireEvent.change(screen.getByDisplayValue('original desc'), { target: { value: 'New Desc' } });

    act(() => capturedDockProps.current.onRevertField('title'));
    expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument();
    expect(screen.getByDisplayValue('New Desc')).toBeInTheDocument();
  });

  it('handleRevertField reverts description', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, description: 'orig' },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByDisplayValue('orig')).toBeInTheDocument());

    fireEvent.change(screen.getByDisplayValue('orig'), { target: { value: 'changed' } });
    act(() => capturedDockProps.current.onRevertField('description'));
    expect(screen.getByDisplayValue('orig')).toBeInTheDocument();
  });

  it('handleRevertField reverts isPinned', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, is_pinned: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Pin to top')).toBeInTheDocument());

    const checkbox = screen.getByText('Pin to top').closest('label')?.querySelector('input');
    fireEvent.click(checkbox!);
    expect(checkbox).toBeChecked();

    act(() => capturedDockProps.current.onRevertField('isPinned'));
    expect(checkbox).not.toBeChecked();
  });

  it('handleRevertField reverts isFeatured', async () => {
    mockedUseAdminFeedItem.mockReturnValue({
      data: { ...mockItem, is_featured: false },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Featured')).toBeInTheDocument());

    const checkbox = screen.getByText('Featured').closest('label')?.querySelector('input');
    fireEvent.click(checkbox!);
    expect(checkbox).toBeChecked();

    act(() => capturedDockProps.current.onRevertField('isFeatured'));
    expect(checkbox).not.toBeChecked();
  });

  it('handleSave error with non-Error value shows generic message', async () => {
    mockMutateAsync.mockRejectedValue('string error');
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByDisplayValue('Test Feed')).toBeInTheDocument());

    await act(async () => {
      capturedDockProps.current.onSave();
    });

    expect(window.alert).toHaveBeenCalledWith('Save failed: "string error"');
    vi.restoreAllMocks();
  });

  it('delete error with non-Error value shows generic message', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockDeleteMutateAsync.mockRejectedValue('string error');

    mockedUseAdminFeedItem.mockReturnValue({
      data: mockItem,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminFeedItem>);

    renderWithProviders(<EditFeedItemPage />);
    await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());

    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });

    expect(window.alert).toHaveBeenCalledWith('Delete failed: "string error"');
    vi.restoreAllMocks();
  });
});
