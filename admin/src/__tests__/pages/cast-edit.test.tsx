import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import EditActorPage from '@/app/(dashboard)/cast/[id]/page';
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
  useRouter: () => ({ push: mockRouterPush, back: vi.fn() }),
  usePathname: () => '/cast/1',
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
  useFormChanges: vi.fn(() => ({ changes: [], isDirty: false, changeCount: 0 })),
}));

vi.mock('@/hooks/useAdminCast', () => ({
  useAdminActor: vi.fn(),
  useUpdateActor: vi.fn(),
  useDeleteActor: vi.fn(),
}));

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: vi.fn(() => ({ upload: mockUpload, uploading: false })),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: vi.fn(() => ({ isReadOnly: false })),
}));

vi.mock('@shared/constants', () => ({
  DEVICES: [
    { name: 'iPhone', width: 375, height: 812, scale: 3 },
    { name: 'iPad', width: 768, height: 1024, scale: 2 },
  ],
}));

vi.mock('@/components/preview/DeviceFrame', () => ({
  DeviceFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="device-frame">{children}</div>
  ),
}));

vi.mock('@/components/preview/DeviceSelector', () => ({
  DeviceSelector: () => <div data-testid="device-selector" />,
}));

vi.mock('@/components/preview/ActorDetailPreview', () => ({
  ActorDetailPreview: () => <div data-testid="actor-detail-preview" />,
}));

vi.mock('@/components/cast-edit/ActorFormFields', () => ({
  ActorFormFields: ({ onPhotoUpload }: { onPhotoUpload: (file: File) => void }) => (
    <div data-testid="actor-form-fields">
      <button
        data-testid="trigger-photo-upload"
        onClick={() => onPhotoUpload(new File(['img'], 'photo.jpg', { type: 'image/jpeg' }))}
      >
        Upload Photo
      </button>
    </div>
  ),
}));

vi.mock('@/components/common/FormChangesDock', () => ({
  FormChangesDock: ({
    onSave,
    onDiscard,
    onRevertField,
  }: {
    onSave: () => void;
    onDiscard: () => void;
    onRevertField: (key: string) => void;
    changes: unknown[];
    changeCount: number;
    saveStatus: string;
  }) => (
    <div data-testid="form-changes-dock">
      <button data-testid="save-btn" onClick={onSave}>
        Save
      </button>
      <button data-testid="discard-btn" onClick={onDiscard}>
        Discard
      </button>
      <button data-testid="revert-field-btn" onClick={() => onRevertField('name')}>
        Revert Name
      </button>
    </div>
  ),
}));

import { useAdminActor, useUpdateActor, useDeleteActor } from '@/hooks/useAdminCast';
import { usePermissions } from '@/hooks/usePermissions';

const mockedUseAdminActor = vi.mocked(useAdminActor);
const mockedUseUpdateActor = vi.mocked(useUpdateActor);
const mockedUseDeleteActor = vi.mocked(useDeleteActor);
const mockedUsePermissions = vi.mocked(usePermissions);

const mockRouterPush = vi.fn();
const mockUpload = vi.fn();
const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();

const actorData = {
  id: '1',
  name: 'Test Actor',
  photo_url: null,
  person_type: 'actor' as const,
  birth_date: null,
  gender: 0,
  biography: null,
  place_of_birth: null,
  height_cm: null,
  tmdb_person_id: null,
};

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('EditActorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRouterPush.mockReset();
    mockUpload.mockReset();
    mockUpdateMutateAsync.mockReset();
    mockDeleteMutateAsync.mockReset();

    mockedUsePermissions.mockReturnValue({ isReadOnly: false } as ReturnType<
      typeof usePermissions
    >);
    mockedUseUpdateActor.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useUpdateActor>);
    mockedUseDeleteActor.mockReturnValue({
      mutateAsync: mockDeleteMutateAsync,
      isPending: false,
    } as unknown as ReturnType<typeof useDeleteActor>);
  });

  it('renders loading spinner when loading', () => {
    mockedUseAdminActor.mockReturnValue({
      data: undefined,
      isLoading: true,
    } as unknown as ReturnType<typeof useAdminActor>);

    const { container } = renderWithProviders(<EditActorPage />);
    const spinner = container.querySelector('.animate-spin');
    expect(spinner).toBeInTheDocument();
  });

  it('renders "Edit Actor" heading when data is loaded', async () => {
    mockedUseAdminActor.mockReturnValue({
      data: actorData,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminActor>);

    renderWithProviders(<EditActorPage />);
    await waitFor(() => {
      expect(screen.getByText('Edit Actor')).toBeInTheDocument();
    });
  });

  it('renders actor form fields', async () => {
    mockedUseAdminActor.mockReturnValue({
      data: actorData,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminActor>);

    renderWithProviders(<EditActorPage />);
    await waitFor(() => {
      expect(screen.getByTestId('actor-form-fields')).toBeInTheDocument();
    });
  });

  it('calls useUnsavedChangesWarning hook', () => {
    mockedUseAdminActor.mockReturnValue({
      data: actorData,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminActor>);

    renderWithProviders(<EditActorPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });

  it('renders FormChangesDock with save/discard buttons', async () => {
    mockedUseAdminActor.mockReturnValue({
      data: actorData,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminActor>);

    renderWithProviders(<EditActorPage />);
    await waitFor(() => {
      expect(screen.getByTestId('form-changes-dock')).toBeInTheDocument();
      expect(screen.getByTestId('save-btn')).toBeInTheDocument();
      expect(screen.getByTestId('discard-btn')).toBeInTheDocument();
    });
  });

  it('shows delete button when not read-only', async () => {
    mockedUseAdminActor.mockReturnValue({
      data: actorData,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminActor>);

    renderWithProviders(<EditActorPage />);
    await waitFor(() => {
      expect(screen.getByText('Delete')).toBeInTheDocument();
    });
  });

  it('hides delete button when read-only', async () => {
    mockedUsePermissions.mockReturnValue({ isReadOnly: true } as ReturnType<typeof usePermissions>);
    mockedUseAdminActor.mockReturnValue({
      data: actorData,
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminActor>);

    renderWithProviders(<EditActorPage />);
    await waitFor(() => {
      expect(screen.queryByText('Delete')).not.toBeInTheDocument();
    });
  });

  describe('handleSave', () => {
    it('calls updateActor.mutateAsync when save is clicked', async () => {
      mockUpdateMutateAsync.mockResolvedValue({});
      mockedUseAdminActor.mockReturnValue({
        data: actorData,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminActor>);

      renderWithProviders(<EditActorPage />);
      await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-btn'));
      });

      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ id: '1' }));
    });

    it('calls alert on save error', async () => {
      mockUpdateMutateAsync.mockRejectedValue(new Error('Save error'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockedUseAdminActor.mockReturnValue({
        data: actorData,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminActor>);

      renderWithProviders(<EditActorPage />);
      await waitFor(() => expect(screen.getByTestId('save-btn')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(screen.getByTestId('save-btn'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Save failed'));
      });
    });
  });

  describe('handleDiscard', () => {
    it('clicking discard does not throw', async () => {
      mockedUseAdminActor.mockReturnValue({
        data: actorData,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminActor>);

      renderWithProviders(<EditActorPage />);
      await waitFor(() => expect(screen.getByTestId('discard-btn')).toBeInTheDocument());

      expect(() => fireEvent.click(screen.getByTestId('discard-btn'))).not.toThrow();
    });
  });

  describe('handleRevertField', () => {
    it('clicking revert field does not throw', async () => {
      mockedUseAdminActor.mockReturnValue({
        data: actorData,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminActor>);

      renderWithProviders(<EditActorPage />);
      await waitFor(() => expect(screen.getByTestId('revert-field-btn')).toBeInTheDocument());

      expect(() => fireEvent.click(screen.getByTestId('revert-field-btn'))).not.toThrow();
    });
  });

  describe('handleDelete', () => {
    it('calls deleteActor.mutateAsync and navigates when confirm is true', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeleteMutateAsync.mockResolvedValue({});
      mockedUseAdminActor.mockReturnValue({
        data: actorData,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminActor>);

      renderWithProviders(<EditActorPage />);
      await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      await waitFor(() => {
        expect(mockDeleteMutateAsync).toHaveBeenCalledWith('1');
        expect(mockRouterPush).toHaveBeenCalledWith('/cast');
      });
    });

    it('does not call deleteActor.mutateAsync when confirm is false', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(false);
      mockedUseAdminActor.mockReturnValue({
        data: actorData,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminActor>);

      renderWithProviders(<EditActorPage />);
      await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());

      fireEvent.click(screen.getByText('Delete'));
      expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
      expect(mockRouterPush).not.toHaveBeenCalled();
    });

    it('calls alert when delete fails', async () => {
      vi.spyOn(window, 'confirm').mockReturnValue(true);
      mockDeleteMutateAsync.mockRejectedValue(new Error('Delete error'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockedUseAdminActor.mockReturnValue({
        data: actorData,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminActor>);

      renderWithProviders(<EditActorPage />);
      await waitFor(() => expect(screen.getByText('Delete')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(screen.getByText('Delete'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('Delete failed'));
      });
    });
  });

  describe('handlePhotoUpload', () => {
    it('calls upload and does not throw on success', async () => {
      mockUpload.mockResolvedValue('https://example.com/photo.jpg');
      mockedUseAdminActor.mockReturnValue({
        data: actorData,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminActor>);

      renderWithProviders(<EditActorPage />);
      await waitFor(() => expect(screen.getByTestId('trigger-photo-upload')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(screen.getByTestId('trigger-photo-upload'));
      });

      expect(mockUpload).toHaveBeenCalled();
    });

    it('calls alert when upload fails', async () => {
      mockUpload.mockRejectedValue(new Error('Upload failed'));
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
      mockedUseAdminActor.mockReturnValue({
        data: actorData,
        isLoading: false,
      } as unknown as ReturnType<typeof useAdminActor>);

      renderWithProviders(<EditActorPage />);
      await waitFor(() => expect(screen.getByTestId('trigger-photo-upload')).toBeInTheDocument());

      await act(async () => {
        fireEvent.click(screen.getByTestId('trigger-photo-upload'));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith('Upload failed');
      });
    });
  });
});
