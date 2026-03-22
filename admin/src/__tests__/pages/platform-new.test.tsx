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

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: vi.fn(), uploading: false }),
}));

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: () => <div data-testid="image-upload">ImageUpload</div>,
}));

vi.mock('@/components/common/SearchableCountryPicker', () => ({
  SearchableCountryPicker: () => null,
}));

vi.mock('@shared/colors', () => ({
  colors: { zinc900: '#18181B' },
}));

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
});
