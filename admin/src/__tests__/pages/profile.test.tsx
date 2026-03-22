/**
 * Tests for ProfilePage — avatar management, email display, role display.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ProfilePage from '@/app/(dashboard)/profile/page';

// --- Mocks ---

const mockRefreshUser = vi.fn().mockResolvedValue(undefined);
const mockMutateAsync = vi.fn().mockResolvedValue({});
const mockUpload = vi.fn().mockResolvedValue('https://cdn.test/avatar.jpg');

let mockUser: Record<string, unknown> | null = {
  id: 'user-1',
  email: 'admin@example.com',
  avatar_url: 'https://cdn.test/old-avatar.jpg',
  role: 'super_admin',
};

vi.mock('@/components/providers/AuthProvider', () => ({
  useAuth: () => ({
    user: mockUser,
    refreshUser: mockRefreshUser,
  }),
}));

vi.mock('@/hooks/useUpdateProfile', () => ({
  useUpdateProfile: () => ({
    mutateAsync: mockMutateAsync,
  }),
}));

let mockUploading = false;

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({
    upload: mockUpload,
    uploading: mockUploading,
  }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
        error: null,
      }),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/profile',
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

// Mock ImageUploadField to expose handlers for testing
let capturedOnUpload: ((file: File) => void) | undefined;
let capturedOnRemove: (() => void) | undefined;
let capturedOnReset: (() => void) | undefined;

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: ({
    label,
    url,
    uploading: isUploading,
    resetLabel,
    onUpload,
    onRemove,
    onReset,
  }: {
    label: string;
    url: string;
    uploading: boolean;
    resetLabel?: string;
    onUpload: (file: File) => void;
    onRemove: () => void;
    onReset?: () => void;
    [key: string]: unknown;
  }) => {
    capturedOnUpload = onUpload;
    capturedOnRemove = onRemove;
    capturedOnReset = onReset;
    return (
      <div data-testid="image-upload-field">
        <span>{label}</span>
        {url && <span data-testid="avatar-url">{url}</span>}
        {isUploading && <span data-testid="uploading">Uploading...</span>}
        <button
          data-testid="upload-btn"
          onClick={() => onUpload(new File(['x'], 'avatar.png', { type: 'image/png' }))}
        >
          Upload
        </button>
        <button data-testid="remove-btn" onClick={() => onRemove()}>
          Remove
        </button>
        {onReset && (
          <button data-testid="reset-btn" onClick={() => onReset()}>
            {resetLabel ?? 'Reset'}
          </button>
        )}
      </div>
    );
  },
}));

vi.mock('@/lib/types', () => ({
  ADMIN_ROLE_LABELS: {
    root: 'Root',
    super_admin: 'Super Admin',
    admin: 'Admin',
    ph_admin: 'PH Admin',
    read_only: 'Read Only',
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = {
      id: 'user-1',
      email: 'admin@example.com',
      avatar_url: 'https://cdn.test/old-avatar.jpg',
      role: 'super_admin',
    };
    mockUploading = false;
    capturedOnUpload = undefined;
    capturedOnRemove = undefined;
    capturedOnReset = undefined;
  });

  // --- Rendering ---

  it('renders back to dashboard link', () => {
    renderWithProviders(<ProfilePage />);
    const link = screen.getByText('Back to Dashboard');
    expect(link).toBeInTheDocument();
    expect(link.closest('a')).toHaveAttribute('href', '/');
  });

  it('renders user email', () => {
    renderWithProviders(<ProfilePage />);
    expect(screen.getByText('admin@example.com')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders role label for super_admin', () => {
    renderWithProviders(<ProfilePage />);
    expect(screen.getByText('Role')).toBeInTheDocument();
    expect(screen.getByText('Super Admin')).toBeInTheDocument();
  });

  it('renders role label for admin', () => {
    mockUser = { ...mockUser, role: 'admin' };
    renderWithProviders(<ProfilePage />);
    expect(screen.getByText('Admin')).toBeInTheDocument();
  });

  it('renders avatar upload field', () => {
    renderWithProviders(<ProfilePage />);
    expect(screen.getByTestId('image-upload-field')).toBeInTheDocument();
    expect(screen.getByText('Avatar')).toBeInTheDocument();
  });

  it('shows current avatar URL', () => {
    renderWithProviders(<ProfilePage />);
    expect(screen.getByTestId('avatar-url')).toHaveTextContent('https://cdn.test/old-avatar.jpg');
  });

  it('renders reset to Google avatar button', () => {
    renderWithProviders(<ProfilePage />);
    expect(screen.getByTestId('reset-btn')).toHaveTextContent('Reset to Google avatar');
  });

  // --- Conditional rendering ---

  it('shows dash when user email is missing', () => {
    mockUser = { id: 'user-1', role: 'admin' };
    renderWithProviders(<ProfilePage />);
    expect(screen.getByText('\u2014')).toBeInTheDocument();
  });

  it('hides role section when user has no role', () => {
    mockUser = { id: 'user-1', email: 'test@example.com' };
    renderWithProviders(<ProfilePage />);
    expect(screen.queryByText('Role')).not.toBeInTheDocument();
  });

  it('does not show avatar URL when avatar_url is empty', () => {
    mockUser = { ...mockUser, avatar_url: '' };
    renderWithProviders(<ProfilePage />);
    expect(screen.queryByTestId('avatar-url')).not.toBeInTheDocument();
  });

  // --- User interactions ---

  it('calls upload and updates profile on avatar upload', async () => {
    renderWithProviders(<ProfilePage />);

    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        avatar_url: 'https://cdn.test/avatar.jpg',
      });
    });

    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it('calls mutateAsync with null on avatar remove', async () => {
    renderWithProviders(<ProfilePage />);

    fireEvent.click(screen.getByTestId('remove-btn'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({ avatar_url: null });
    });

    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it('shows alert when upload fails', async () => {
    mockUpload.mockRejectedValueOnce(new Error('Upload error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Upload error');
    });

    alertSpy.mockRestore();
  });

  it('shows generic alert when upload fails with non-Error', async () => {
    mockUpload.mockRejectedValueOnce('string error');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Upload failed');
    });

    alertSpy.mockRestore();
  });

  it('shows generic alert when remove fails with non-Error', async () => {
    mockMutateAsync.mockRejectedValueOnce('string error');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('remove-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to remove avatar');
    });

    alertSpy.mockRestore();
  });

  it('rolls back avatar to empty string when user has no avatar_url', async () => {
    mockUser = { ...mockUser!, avatar_url: null };
    mockMutateAsync.mockRejectedValueOnce(new Error('fail'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('remove-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
    mockUser = {
      id: 'user-1',
      email: 'admin@example.com',
      avatar_url: 'https://cdn.test/old-avatar.jpg',
      role: 'super_admin',
    };
  });

  it('shows alert when remove fails and rolls back avatar', async () => {
    mockMutateAsync.mockRejectedValueOnce(new Error('Remove failed'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('remove-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Remove failed');
    });

    alertSpy.mockRestore();
  });

  it('fetches Google avatar and updates profile on reset', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          google_avatar_url: 'https://google.com/avatar.jpg',
        }),
    });

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('reset-btn'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        avatar_url: 'https://google.com/avatar.jpg',
      });
    });

    expect(mockRefreshUser).toHaveBeenCalled();
  });

  it('shows alert when no Google avatar is found', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ google_avatar_url: null }),
    });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('reset-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('No Google avatar found');
    });

    alertSpy.mockRestore();
  });

  it('shows alert when Google avatar fetch fails', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({}),
    });
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('reset-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to fetch Google avatar');
    });

    alertSpy.mockRestore();
  });

  it('shows generic alert when reset fails with non-Error', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    vi.mocked(supabase.auth.getSession).mockRejectedValueOnce('string error');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('reset-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Failed to reset avatar');
    });

    alertSpy.mockRestore();
  });

  it('rolls back to empty string on reset failure when user has no avatar_url', async () => {
    mockUser = { ...mockUser!, avatar_url: null };
    const { supabase } = await import('@/lib/supabase-browser');
    vi.mocked(supabase.auth.getSession).mockRejectedValueOnce(new Error('fail'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('reset-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalled();
    });

    alertSpy.mockRestore();
    mockUser = {
      id: 'user-1',
      email: 'admin@example.com',
      avatar_url: 'https://cdn.test/old-avatar.jpg',
      role: 'super_admin',
    };
  });

  it('shows alert when session is missing on reset', async () => {
    const { supabase } = await import('@/lib/supabase-browser');
    vi.mocked(supabase.auth.getSession).mockResolvedValueOnce({
      data: { session: null },
      error: null,
    } as never);
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

    renderWithProviders(<ProfilePage />);
    fireEvent.click(screen.getByTestId('reset-btn'));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Not authenticated');
    });

    alertSpy.mockRestore();
  });
});
