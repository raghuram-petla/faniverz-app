import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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
  useRouter: () => ({ push: vi.fn(), back: vi.fn() }),
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

vi.mock('@/hooks/useAdminCast', () => ({
  useAdminActor: vi.fn(),
  useUpdateActor: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteActor: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: vi.fn(), uploading: false }),
}));

vi.mock('@shared/constants', () => ({
  DEVICES: [{ name: 'iPhone', width: 375, height: 812, scale: 3 }],
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
  ActorFormFields: () => <div data-testid="actor-form-fields" />,
}));

import { useAdminActor } from '@/hooks/useAdminCast';

const mockedUseAdminActor = vi.mocked(useAdminActor);

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('EditActorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      data: {
        id: '1',
        name: 'Test Actor',
        photo_url: null,
        person_type: 'actor',
        birth_date: null,
        gender: 0,
        biography: null,
        place_of_birth: null,
        height_cm: null,
        tmdb_person_id: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminActor>);

    renderWithProviders(<EditActorPage />);
    await waitFor(() => {
      expect(screen.getByText('Edit Actor')).toBeInTheDocument();
    });
  });

  it('renders actor form fields', async () => {
    mockedUseAdminActor.mockReturnValue({
      data: {
        id: '1',
        name: 'Test Actor',
        photo_url: null,
        person_type: 'actor',
        birth_date: null,
        gender: 0,
        biography: null,
        place_of_birth: null,
        height_cm: null,
        tmdb_person_id: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminActor>);

    renderWithProviders(<EditActorPage />);
    await waitFor(() => {
      expect(screen.getByTestId('actor-form-fields')).toBeInTheDocument();
    });
  });

  it('calls useUnsavedChangesWarning hook', () => {
    mockedUseAdminActor.mockReturnValue({
      data: {
        id: '1',
        name: 'Test Actor',
        photo_url: null,
        person_type: 'actor',
        birth_date: null,
        gender: 0,
        biography: null,
        place_of_birth: null,
        height_cm: null,
        tmdb_person_id: null,
      },
      isLoading: false,
    } as unknown as ReturnType<typeof useAdminActor>);

    renderWithProviders(<EditActorPage />);
    expect(useUnsavedChangesWarning).toHaveBeenCalled();
  });
});
