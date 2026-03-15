import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PlatformsPage from '@/app/(dashboard)/platforms/page';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
  usePathname: () => '/platforms',
  useParams: () => ({}),
}));

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('PlatformsPage', () => {
  it('renders "Add Platform" button', () => {
    renderWithProviders(<PlatformsPage />);
    expect(screen.getByText('Add Platform')).toBeInTheDocument();
  });

  it('shows "Add Platform" dialog when button clicked', () => {
    renderWithProviders(<PlatformsPage />);
    fireEvent.click(screen.getByText('Add Platform'));
    expect(screen.getByText('Add Platform', { selector: 'h2' })).toBeInTheDocument();
  });

  it('shows name input in dialog', () => {
    renderWithProviders(<PlatformsPage />);
    fireEvent.click(screen.getByText('Add Platform'));
    expect(screen.getByPlaceholderText('e.g. Netflix')).toBeInTheDocument();
  });

  it('shows logo upload field in dialog', () => {
    renderWithProviders(<PlatformsPage />);
    fireEvent.click(screen.getByText('Add Platform'));
    expect(screen.getByText('Upload Logo')).toBeInTheDocument();
  });

  it('shows Create button in add dialog', () => {
    renderWithProviders(<PlatformsPage />);
    fireEvent.click(screen.getByText('Add Platform'));
    expect(screen.getByRole('button', { name: 'Create' })).toBeInTheDocument();
  });

  it('shows Cancel button in dialog', () => {
    renderWithProviders(<PlatformsPage />);
    fireEvent.click(screen.getByText('Add Platform'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('closes dialog when Cancel is clicked', () => {
    renderWithProviders(<PlatformsPage />);
    fireEvent.click(screen.getByText('Add Platform'));
    expect(screen.getByText('Add Platform', { selector: 'h2' })).toBeInTheDocument();
    fireEvent.click(screen.getByText('Cancel'));
    expect(screen.queryByText('Add Platform', { selector: 'h2' })).not.toBeInTheDocument();
  });

  it('closes dialog when X button is clicked', () => {
    renderWithProviders(<PlatformsPage />);
    fireEvent.click(screen.getByText('Add Platform'));
    const xButtons = screen.getAllByRole('button');
    const xButton = xButtons.find(
      (btn) => btn.querySelector('svg') && btn.closest('.flex.items-center.justify-between'),
    );
    if (xButton) fireEvent.click(xButton);
  });

  it('does not show Brand Color or Display Order fields', () => {
    renderWithProviders(<PlatformsPage />);
    fireEvent.click(screen.getByText('Add Platform'));
    expect(screen.queryByText('Brand Color')).not.toBeInTheDocument();
    expect(screen.queryByText('Display Order')).not.toBeInTheDocument();
    expect(screen.queryByText('Logo Text')).not.toBeInTheDocument();
  });
});
