import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewSurpriseContentPage from '@/app/(dashboard)/surprise/new/page';
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
  usePathname: () => '/surprise/new',
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

const mockMutate = vi.fn();
const mockCreateSurpriseReturn = vi.hoisted(() => ({
  current: {
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
}));
vi.mock('@/hooks/useAdminSurprise', () => ({
  useCreateSurprise: () => mockCreateSurpriseReturn.current,
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('NewSurpriseContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockMutate.mockReset();
    mockCreateSurpriseReturn.current = {
      mutate: mockMutate,
      isPending: false,
      isError: false,
      error: null,
    };
  });

  it('renders "Add Surprise Content" heading', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByText('Add Surprise Content')).toBeInTheDocument();
  });

  it('renders title input', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByPlaceholderText('Enter title')).toBeInTheDocument();
  });

  it('calls useUnsavedChangesWarning hook', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });

  it('renders YouTube ID input', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByPlaceholderText('e.g. dQw4w9WgXcQ')).toBeInTheDocument();
  });

  it('renders description textarea', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
  });

  it('renders category select with placeholder option', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByText('Select category...')).toBeInTheDocument();
  });

  it('renders all five category options', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    const select = screen.getByLabelText('Category');
    const options = select.querySelectorAll('option');
    // 1 placeholder + 5 categories
    expect(options).toHaveLength(6);
    const values = Array.from(options).map((o) => o.getAttribute('value'));
    expect(values).toContain('song');
    expect(values).toContain('short-film');
    expect(values).toContain('bts');
    expect(values).toContain('interview');
    expect(values).toContain('trailer');
  });

  it('renders views input with default value 0', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('renders "Create Content" submit button', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByText('Create Content')).toBeInTheDocument();
  });

  it('renders Cancel link pointing to /surprise', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByText('Cancel')).toHaveAttribute('href', '/surprise');
  });

  it('renders back arrow link to /surprise', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    const links = screen.getAllByRole('link');
    const backLink = links.find((l) => l.getAttribute('href') === '/surprise');
    expect(backLink).toBeInTheDocument();
  });

  it('isDirty becomes true when title is entered', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'My Content' },
    });
    const calls = vi.mocked(useUnsavedChangesWarning).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(true);
  });

  it('isDirty remains false when no fields are filled', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    const calls = vi.mocked(useUnsavedChangesWarning).mock.calls;
    // Initial call should be false
    expect(calls[0][0]).toBe(false);
  });

  it('calls mutate with correct payload on form submit', async () => {
    renderWithProviders(<NewSurpriseContentPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'A New Song' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. dQw4w9WgXcQ'), {
      target: { value: 'xyz789' },
    });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'song' } });
    fireEvent.change(screen.getByPlaceholderText('Optional description'), {
      target: { value: 'A nice song' },
    });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'A New Song',
          youtube_id: 'xyz789',
          category: 'song',
          description: 'A nice song',
          views: 0,
        }),
        expect.objectContaining({ onSuccess: expect.any(Function) }),
      );
    });
  });

  it('coerces empty description to null in mutate payload', async () => {
    renderWithProviders(<NewSurpriseContentPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'T' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. dQw4w9WgXcQ'), { target: { value: 'v' } });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'bts' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalledWith(
        expect.objectContaining({ description: null }),
        expect.any(Object),
      );
    });
  });

  it('Submit button is enabled when form is not pending', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    const btn = screen.getByText('Create Content').closest('button');
    // isPending is false in default mock so button should not be disabled
    expect(btn).not.toBeDisabled();
  });

  it('displays formatted category label (capitalized) in options', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByText('Song')).toBeInTheDocument();
    expect(screen.getByText('Short film')).toBeInTheDocument();
    expect(screen.getByText('Bts')).toBeInTheDocument();
  });

  it('shows error message when createItem has an Error instance', () => {
    mockCreateSurpriseReturn.current = {
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: new Error('Duplicate entry'),
    };
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByText('Duplicate entry')).toBeInTheDocument();
  });

  it('shows generic error message when error is not an Error instance', () => {
    mockCreateSurpriseReturn.current = {
      mutate: vi.fn(),
      isPending: false,
      isError: true,
      error: 'some string error',
    };
    renderWithProviders(<NewSurpriseContentPage />);
    expect(screen.getByText('Failed to create content')).toBeInTheDocument();
  });

  it('disables submit button and shows spinner when isPending is true', () => {
    mockCreateSurpriseReturn.current = {
      mutate: vi.fn(),
      isPending: true,
      isError: false,
      error: null,
    };
    renderWithProviders(<NewSurpriseContentPage />);
    const btn = screen.getByText('Create Content').closest('button');
    expect(btn).toBeDisabled();
  });

  it('handles views input with non-numeric value (defaults to 0)', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    const viewsInput = screen.getByDisplayValue('0');
    fireEvent.change(viewsInput, { target: { value: 'abc' } });
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('handles views input with negative value (clamps to 0)', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    const viewsInput = screen.getByDisplayValue('0');
    fireEvent.change(viewsInput, { target: { value: '-5' } });
    expect(screen.getByDisplayValue('0')).toBeInTheDocument();
  });

  it('handles views input with decimal value (floors to integer)', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    const viewsInput = screen.getByDisplayValue('0');
    fireEvent.change(viewsInput, { target: { value: '3.7' } });
    expect(screen.getByDisplayValue('3')).toBeInTheDocument();
  });

  it('isDirty becomes true when description is entered', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    fireEvent.change(screen.getByPlaceholderText('Optional description'), {
      target: { value: 'Some desc' },
    });
    const calls = vi.mocked(useUnsavedChangesWarning).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(true);
  });

  it('isDirty becomes true when youtubeId is entered', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. dQw4w9WgXcQ'), {
      target: { value: 'abc123' },
    });
    const calls = vi.mocked(useUnsavedChangesWarning).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(true);
  });

  it('navigates to /surprise on successful creation via onSuccess callback', async () => {
    // Make mutate call the onSuccess callback
    mockMutate.mockImplementation((_data: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess();
    });
    renderWithProviders(<NewSurpriseContentPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. dQw4w9WgXcQ'), {
      target: { value: 'abc' },
    });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'song' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/surprise');
    });
  });

  it('alerts on create error via onError callback', async () => {
    window.alert = vi.fn();
    renderWithProviders(<NewSurpriseContentPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'Test' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. dQw4w9WgXcQ'), {
      target: { value: 'abc' },
    });
    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'song' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutate).toHaveBeenCalled();
    });
    const { onError } = mockMutate.mock.calls[0][1];
    onError(new Error('create failed'));
    expect(window.alert).toHaveBeenCalledWith('create failed');
  });

  it('isDirty becomes true when category is selected', () => {
    renderWithProviders(<NewSurpriseContentPage />);
    fireEvent.change(screen.getByLabelText('Category'), {
      target: { value: 'song' },
    });
    const calls = vi.mocked(useUnsavedChangesWarning).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(true);
  });
});
