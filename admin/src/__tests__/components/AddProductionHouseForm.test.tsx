import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AddProductionHouseForm } from '@/components/production-houses/AddProductionHouseForm';

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
    functions: { invoke: vi.fn() },
  },
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('AddProductionHouseForm', () => {
  it('renders name input with required placeholder', () => {
    renderWithProviders(<AddProductionHouseForm onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument();
  });

  it('renders description textarea', () => {
    renderWithProviders(<AddProductionHouseForm onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
  });

  it('renders Add and Cancel buttons', () => {
    renderWithProviders(<AddProductionHouseForm onClose={vi.fn()} />);
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders logo upload button', () => {
    renderWithProviders(<AddProductionHouseForm onClose={vi.fn()} />);
    expect(screen.getByText('Logo (optional)')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    const onClose = vi.fn();
    renderWithProviders(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('allows typing in name input', () => {
    renderWithProviders(<AddProductionHouseForm onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('Name *') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test House' } });
    expect(input.value).toBe('Test House');
  });

  it('renders country dropdown with label', () => {
    renderWithProviders(<AddProductionHouseForm onClose={vi.fn()} />);
    expect(screen.getByText('Country (optional)')).toBeInTheDocument();
  });
});
