import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddProductionHouseForm } from '@/components/production-houses/AddProductionHouseForm';

vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => url,
}));

const mockMutateAsync = vi.fn();

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useCreateProductionHouse: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: vi.fn(), uploading: false }),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useCountries: () => ({ data: [{ code: 'IN', name: 'India', display_order: 1 }] }),
}));

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('AddProductionHouseForm', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockMutateAsync.mockResolvedValue({});
  });

  it('renders name input with placeholder', () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument();
  });

  it('renders description textarea', () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
  });

  it('renders Add and Cancel buttons', () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders logo upload button', () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByText('Logo (optional)')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows typing in name input', () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    const input = screen.getByPlaceholderText('Name *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test House' } });
    expect(input.value).toBe('Test House');
  });

  it('allows typing in description textarea', () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    const textarea = screen.getByPlaceholderText('Description (optional)') as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: 'A great studio' } });
    expect(textarea.value).toBe('A great studio');
  });

  it('calls mutateAsync with correct data on Add click', async () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Name *'), {
      target: { value: 'DVV Entertainment' },
    });
    fireEvent.change(screen.getByPlaceholderText('Description (optional)'), {
      target: { value: 'Tollywood studio' },
    });
    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'DVV Entertainment',
        logo_url: null,
        description: 'Tollywood studio',
        origin_country: null,
      });
    });
  });

  it('calls onClose after successful add', async () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Name *'), {
      target: { value: 'Test House' },
    });
    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not submit when name is empty', async () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.click(screen.getByText('Add'));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('does not submit when name is whitespace only', async () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Name *'), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByText('Add'));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('sends null for empty description', async () => {
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Name *'), {
      target: { value: 'Studio' },
    });
    fireEvent.click(screen.getByText('Add'));
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Studio',
        logo_url: null,
        description: null,
        origin_country: null,
      });
    });
  });
});
