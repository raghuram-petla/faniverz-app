import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NewFeedItemPage from '@/app/(dashboard)/feed/new/page';
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
  usePathname: () => '/feed/new',
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

const mockMutateAsync = vi.fn();
vi.mock('@/hooks/useAdminFeed', () => ({
  useCreateFeedItem: () => ({ mutateAsync: mockMutateAsync, mutate: vi.fn(), isPending: false }),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('NewFeedItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Add Feed Item" heading', () => {
    renderWithProviders(<NewFeedItemPage />);
    expect(screen.getByText('Add Feed Item')).toBeInTheDocument();
  });

  it('renders title input', () => {
    renderWithProviders(<NewFeedItemPage />);
    expect(screen.getByPlaceholderText('Enter title')).toBeInTheDocument();
  });

  it('calls useUnsavedChangesWarning hook', () => {
    renderWithProviders(<NewFeedItemPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });

  it('renders feed type select with default "update" selected', () => {
    renderWithProviders(<NewFeedItemPage />);
    const select = screen.getByDisplayValue('Update (text announcement)');
    expect(select).toBeInTheDocument();
  });

  it('renders all three feed type options', () => {
    renderWithProviders(<NewFeedItemPage />);
    const select = screen.getAllByRole('combobox')[0];
    const options = select.querySelectorAll('option');
    expect(options).toHaveLength(3);
    expect(options[0].textContent).toBe('Update (text announcement)');
    expect(options[1].textContent).toBe('Video');
    expect(options[2].textContent).toBe('Poster');
  });

  it('does NOT render content type dropdown when only one content type for current feed type', () => {
    renderWithProviders(<NewFeedItemPage />);
    // 'update' feed type has only 1 content type so dropdown is hidden
    expect(screen.queryByText('Content Type')).not.toBeInTheDocument();
  });

  it('renders content type dropdown when switching to "video" feed type', () => {
    renderWithProviders(<NewFeedItemPage />);
    const feedTypeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(feedTypeSelect, { target: { value: 'video' } });
    expect(screen.getByText('Content Type')).toBeInTheDocument();
  });

  it('shows YouTube ID field when feed type is "video"', () => {
    renderWithProviders(<NewFeedItemPage />);
    const feedTypeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(feedTypeSelect, { target: { value: 'video' } });
    expect(screen.getByPlaceholderText('e.g. dQw4w9WgXcQ')).toBeInTheDocument();
  });

  it('does NOT show YouTube ID field when feed type is "update"', () => {
    renderWithProviders(<NewFeedItemPage />);
    expect(screen.queryByPlaceholderText('e.g. dQw4w9WgXcQ')).not.toBeInTheDocument();
  });

  it('shows Thumbnail URL field when feed type is NOT "video"', () => {
    renderWithProviders(<NewFeedItemPage />);
    // default is 'update', which is not 'video'
    expect(screen.getByPlaceholderText('Image URL')).toBeInTheDocument();
  });

  it('hides Thumbnail URL field when feed type is "video"', () => {
    renderWithProviders(<NewFeedItemPage />);
    const feedTypeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(feedTypeSelect, { target: { value: 'video' } });
    expect(screen.queryByPlaceholderText('Image URL')).not.toBeInTheDocument();
  });

  it('renders Pin to top and Featured checkboxes', () => {
    renderWithProviders(<NewFeedItemPage />);
    expect(screen.getByText('Pin to top')).toBeInTheDocument();
    expect(screen.getByText('Featured')).toBeInTheDocument();
  });

  it('renders Create button disabled when title is empty', () => {
    renderWithProviders(<NewFeedItemPage />);
    const createBtn = screen.getByText('Create').closest('button');
    expect(createBtn).toBeDisabled();
  });

  it('renders Create button enabled when title is filled', () => {
    renderWithProviders(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'My Feed Item' },
    });
    const createBtn = screen.getByText('Create').closest('button');
    expect(createBtn).not.toBeDisabled();
  });

  it('renders Cancel link pointing to /feed', () => {
    renderWithProviders(<NewFeedItemPage />);
    expect(screen.getByText('Cancel')).toHaveAttribute('href', '/feed');
  });

  it('renders back arrow link to /feed', () => {
    renderWithProviders(<NewFeedItemPage />);
    const links = screen.getAllByRole('link');
    const backLink = links.find((l) => l.getAttribute('href') === '/feed');
    expect(backLink).toBeInTheDocument();
  });

  it('renders description textarea', () => {
    renderWithProviders(<NewFeedItemPage />);
    expect(screen.getByPlaceholderText('Optional description')).toBeInTheDocument();
  });

  it('isDirty becomes true when title is entered and useUnsavedChangesWarning called with true', () => {
    renderWithProviders(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'Something' },
    });
    const calls = vi.mocked(useUnsavedChangesWarning).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(true);
  });

  it('calls mutateAsync with auto-generated YouTube thumbnail when youtubeId is set but thumbnail is blank', async () => {
    mockMutateAsync.mockResolvedValue({});
    renderWithProviders(<NewFeedItemPage />);

    // Switch to video
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'video' } });

    // Fill in title
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'My Video' } });

    // Fill in youtube id
    fireEvent.change(screen.getByPlaceholderText('e.g. dQw4w9WgXcQ'), {
      target: { value: 'abc123' },
    });

    // Submit form
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          youtube_id: 'abc123',
          thumbnail_url: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
        }),
      );
    });
  });

  it('calls mutateAsync with null youtube_id and null description when empty', async () => {
    mockMutateAsync.mockResolvedValue({});
    renderWithProviders(<NewFeedItemPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'No YouTube' },
    });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          youtube_id: null,
          description: null,
          thumbnail_url: null,
        }),
      );
    });
  });

  it('shows alert on submission error', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mockMutateAsync.mockRejectedValue(new Error('Network error'));
    renderWithProviders(<NewFeedItemPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'Test' },
    });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Network error');
    });
    alertSpy.mockRestore();
  });

  it('resets content type to first option for new feed type when switching', () => {
    renderWithProviders(<NewFeedItemPage />);
    const feedTypeSelect = screen.getAllByRole('combobox')[0];

    // Switch to video — content type should reset to 'trailer' (first video option)
    fireEvent.change(feedTypeSelect, { target: { value: 'video' } });
    const contentTypeSelect = screen.getAllByRole('combobox')[1];
    expect(contentTypeSelect).toHaveValue('trailer');
  });

  it('updates content type when content type select is changed', () => {
    renderWithProviders(<NewFeedItemPage />);
    const feedTypeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(feedTypeSelect, { target: { value: 'video' } });
    const contentTypeSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(contentTypeSelect, { target: { value: 'song' } });
    expect(contentTypeSelect).toHaveValue('song');
  });

  it('updates description text when typed', () => {
    renderWithProviders(<NewFeedItemPage />);
    const textarea = screen.getByPlaceholderText('Optional description');
    fireEvent.change(textarea, { target: { value: 'My description' } });
    expect(textarea).toHaveValue('My description');
  });

  it('toggles isPinned when checkbox is clicked', () => {
    renderWithProviders(<NewFeedItemPage />);
    const pinCheckbox = screen.getByText('Pin to top').closest('label')!.querySelector('input')!;
    fireEvent.click(pinCheckbox);
    expect(pinCheckbox.checked).toBe(true);
    fireEvent.click(pinCheckbox);
    expect(pinCheckbox.checked).toBe(false);
  });

  it('toggles isFeatured when checkbox is clicked', () => {
    renderWithProviders(<NewFeedItemPage />);
    const featuredCheckbox = screen.getByText('Featured').closest('label')!.querySelector('input')!;
    fireEvent.click(featuredCheckbox);
    expect(featuredCheckbox.checked).toBe(true);
  });

  it('sends isPinned and isFeatured values in form submission', async () => {
    mockMutateAsync.mockResolvedValue({});
    renderWithProviders(<NewFeedItemPage />);

    // Fill title
    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'Pinned Item' },
    });

    // Check isPinned
    const pinCheckbox = screen.getByText('Pin to top').closest('label')!.querySelector('input')!;
    fireEvent.click(pinCheckbox);

    // Check isFeatured
    const featuredCheckbox = screen.getByText('Featured').closest('label')!.querySelector('input')!;
    fireEvent.click(featuredCheckbox);

    // Submit
    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          is_pinned: true,
          is_featured: true,
        }),
      );
    });
  });

  it('sends thumbnailUrl when set on non-video type', async () => {
    mockMutateAsync.mockResolvedValue({});
    renderWithProviders(<NewFeedItemPage />);

    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'Poster Post' },
    });

    // Switch to poster type
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'poster' } });

    fireEvent.change(screen.getByPlaceholderText('Image URL'), {
      target: { value: 'https://example.com/thumb.jpg' },
    });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnail_url: 'https://example.com/thumb.jpg',
        }),
      );
    });
  });
});
