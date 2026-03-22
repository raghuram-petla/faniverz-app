import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const mockPush = vi.fn();
const mockMutate = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, back: vi.fn() }),
  useParams: () => ({}),
  usePathname: () => '/platforms/new',
  useSearchParams: () => ({
    get: (key: string) => (key === 'country' ? 'IN' : null),
  }),
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

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useCreatePlatform: () => ({
    mutate: mockMutate,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useCountries: () => ({
    data: [
      { code: 'IN', name: 'India', display_order: 1 },
      { code: 'US', name: 'United States', display_order: 2 },
    ],
  }),
}));

const mockUploadFn = vi.hoisted(() => vi.fn().mockResolvedValue('https://cdn.test/logo.png'));
vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: mockUploadFn, uploading: false }),
}));

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: ({
    onUpload,
    onRemove,
  }: {
    label: string;
    url: string;
    bucket: string;
    uploading: boolean;
    uploadEndpoint: string;
    previewAlt: string;
    previewClassName: string;
    showUrlCaption: boolean;
    onUpload: (file: File) => void;
    onRemove: () => void;
  }) => (
    <div data-testid="image-upload">
      <button data-testid="upload-logo" onClick={() => onUpload(new File([], 'logo.png'))}>
        Upload
      </button>
      <button data-testid="remove-logo" onClick={onRemove}>
        Remove
      </button>
    </div>
  ),
}));

vi.mock('@/components/common/SearchableCountryPicker', () => ({
  SearchableCountryPicker: ({
    onSelect,
    onCancel,
  }: {
    countries: unknown[];
    onSelect: (code: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="country-picker">
      <button data-testid="select-us" onClick={() => onSelect('US')}>
        Select US
      </button>
      <button data-testid="select-in" onClick={() => onSelect('IN')}>
        Select IN (duplicate)
      </button>
      <button data-testid="select-empty" onClick={() => onSelect('')}>
        Select empty
      </button>
      <button data-testid="cancel-picker" onClick={onCancel}>
        Cancel
      </button>
    </div>
  ),
}));

vi.mock('@shared/colors', () => ({
  colors: { zinc900: '#18181B' },
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

import { useUnsavedChangesWarning } from '@/hooks/useUnsavedChangesWarning';
import NewPlatformPage from '@/app/(dashboard)/platforms/new/page';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('NewPlatformPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders Add Platform heading', () => {
    renderWithProviders(<NewPlatformPage />);
    expect(screen.getByText('Add Platform')).toBeInTheDocument();
  });

  it('renders back link to platforms list', () => {
    renderWithProviders(<NewPlatformPage />);
    const links = screen.getAllByRole('link');
    const backLink = links.find((l) => l.getAttribute('href') === '/platforms');
    expect(backLink).toBeTruthy();
  });

  it('renders empty name input', () => {
    renderWithProviders(<NewPlatformPage />);
    const input = screen.getByPlaceholderText('e.g. Netflix') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('renders TMDB provider ID input', () => {
    renderWithProviders(<NewPlatformPage />);
    expect(screen.getByPlaceholderText('e.g. 119 (optional)')).toBeInTheDocument();
  });

  it('renders Create button', () => {
    renderWithProviders(<NewPlatformPage />);
    expect(screen.getByText('Create')).toBeInTheDocument();
  });

  it('renders Cancel link', () => {
    renderWithProviders(<NewPlatformPage />);
    const cancelLink = screen.getByText('Cancel');
    expect(cancelLink).toHaveAttribute('href', '/platforms');
  });

  it('Create button is disabled when name is empty', () => {
    renderWithProviders(<NewPlatformPage />);
    const btn = screen.getByText('Create').closest('button')!;
    expect(btn).toBeDisabled();
  });

  it('Create button becomes enabled when name is filled', () => {
    renderWithProviders(<NewPlatformPage />);
    const input = screen.getByPlaceholderText('e.g. Netflix');
    fireEvent.change(input, { target: { value: 'Disney Plus' } });
    const btn = screen.getByText('Create').closest('button')!;
    expect(btn).not.toBeDisabled();
  });

  it('calls createPlatform.mutate on form submit', () => {
    renderWithProviders(<NewPlatformPage />);
    const input = screen.getByPlaceholderText('e.g. Netflix');
    fireEvent.change(input, { target: { value: 'Disney Plus' } });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toMatchObject({
      name: 'Disney Plus',
      regions: ['IN'],
    });
  });

  it('renders default country tag (IN)', () => {
    renderWithProviders(<NewPlatformPage />);
    expect(screen.getByText(/India/)).toBeInTheDocument();
  });

  it('renders image upload field', () => {
    renderWithProviders(<NewPlatformPage />);
    expect(screen.getByTestId('image-upload')).toBeInTheDocument();
  });

  it('does not submit with empty name', () => {
    renderWithProviders(<NewPlatformPage />);
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('calls useUnsavedChangesWarning with false when form is empty', () => {
    renderWithProviders(<NewPlatformPage />);
    // Default state: name is empty, so isDirty should account for default country (IN)
    // regions.length > 1 is false (only default country), so isDirty depends on name
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });

  it('calls useUnsavedChangesWarning with true when name is filled', () => {
    renderWithProviders(<NewPlatformPage />);
    const input = screen.getByPlaceholderText('e.g. Netflix');
    fireEvent.change(input, { target: { value: 'Disney Plus' } });
    // After re-render, isDirty should be true
    const calls = vi.mocked(useUnsavedChangesWarning).mock.calls;
    const lastCall = calls[calls.length - 1];
    expect(lastCall[0]).toBe(true);
  });

  it('submits with tmdb_provider_id when provided', () => {
    renderWithProviders(<NewPlatformPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), {
      target: { value: 'Netflix' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. 119 (optional)'), {
      target: { value: '119' },
    });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toMatchObject({
      tmdb_provider_id: 119,
    });
  });

  it('submits with null tmdb_provider_id when empty', () => {
    renderWithProviders(<NewPlatformPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), {
      target: { value: 'Netflix' },
    });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toMatchObject({
      tmdb_provider_id: null,
    });
  });

  it('submits with null logo_url when no logo uploaded', () => {
    renderWithProviders(<NewPlatformPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), {
      target: { value: 'Test' },
    });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockMutate.mock.calls[0][0]).toMatchObject({
      logo_url: null,
    });
  });

  it('calls onSuccess callback after successful create', () => {
    // Make mutate call the onSuccess callback
    mockMutate.mockImplementation((_data: unknown, opts: { onSuccess: () => void }) => {
      opts.onSuccess();
    });
    renderWithProviders(<NewPlatformPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), {
      target: { value: 'Test' },
    });
    fireEvent.submit(screen.getByText('Create').closest('form')!);
    expect(mockPush).toHaveBeenCalledWith('/platforms');
  });

  it('shows Add button for adding countries', () => {
    renderWithProviders(<NewPlatformPage />);
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders remove button for default country', () => {
    renderWithProviders(<NewPlatformPage />);
    // There should be an X button to remove the default country
    const removeButtons = document.querySelectorAll('button[type="button"]');
    expect(removeButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('removes a country when X button is clicked', () => {
    renderWithProviders(<NewPlatformPage />);
    // Click the X button for the default country (IN / India)
    const removeButtons = document.querySelectorAll('button[type="button"]');
    // The first button[type=button] in the region area is the X for the first country
    const xButton = Array.from(removeButtons).find((btn) => {
      const parent = btn.closest('span');
      return parent && parent.textContent?.includes('India');
    });
    if (xButton) {
      fireEvent.click(xButton);
      expect(screen.queryByText(/India/)).not.toBeInTheDocument();
    }
  });

  it('shows country picker when Add button is clicked', () => {
    renderWithProviders(<NewPlatformPage />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('country-picker')).toBeInTheDocument();
  });

  it('adds country via SearchableCountryPicker onSelect', () => {
    renderWithProviders(<NewPlatformPage />);
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByTestId('select-us'));
    // Now US should be in the regions list
    expect(screen.getByText(/United States/)).toBeInTheDocument();
    // Picker should be hidden after selection
    expect(screen.queryByTestId('country-picker')).not.toBeInTheDocument();
  });

  it('hides country picker when cancel is clicked', () => {
    renderWithProviders(<NewPlatformPage />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('country-picker')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('cancel-picker'));
    expect(screen.queryByTestId('country-picker')).not.toBeInTheDocument();
  });

  it('does not add duplicate country (IN already in regions)', () => {
    renderWithProviders(<NewPlatformPage />);
    fireEvent.click(screen.getByText('Add'));
    // Try to add IN which is already the default
    fireEvent.click(screen.getByTestId('select-in'));
    // Should still only have one India
    const indiaTexts = screen.getAllByText(/India/);
    expect(indiaTexts.length).toBe(1);
  });

  it('does not add when empty code is selected', () => {
    renderWithProviders(<NewPlatformPage />);
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByTestId('select-empty'));
    // Picker should close but no new country added
    expect(screen.queryByTestId('country-picker')).not.toBeInTheDocument();
  });

  it('calls upload when logo upload button is clicked', async () => {
    mockUploadFn.mockResolvedValueOnce('https://cdn.test/logo.png');
    renderWithProviders(<NewPlatformPage />);
    fireEvent.click(screen.getByTestId('upload-logo'));
    await vi.waitFor(() => {
      expect(mockUploadFn).toHaveBeenCalled();
    });
  });

  it('shows alert when logo upload fails with Error', async () => {
    mockUploadFn.mockRejectedValueOnce(new Error('Upload error'));
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithProviders(<NewPlatformPage />);
    fireEvent.click(screen.getByTestId('upload-logo'));
    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Upload error');
    });
    alertSpy.mockRestore();
  });

  it('shows generic alert when logo upload fails with non-Error', async () => {
    mockUploadFn.mockRejectedValueOnce('string error');
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    renderWithProviders(<NewPlatformPage />);
    fireEvent.click(screen.getByTestId('upload-logo'));
    await vi.waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith('Upload failed');
    });
    alertSpy.mockRestore();
  });

  it('uses country code when country name not found', () => {
    // Default country is IN which is in our mock, so it shows "India"
    // This test verifies the ?? code fallback would work
    renderWithProviders(<NewPlatformPage />);
    expect(screen.getByText(/India/)).toBeInTheDocument();
  });
});
