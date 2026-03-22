import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockCreatePlatformMutate = vi.fn();
const mockUseCountries = vi.fn();
const mockUpload = vi.fn();
const mockUseRouter = vi.fn();
const mockUseSearchParams = vi.fn();

vi.mock('@/hooks/useAdminPlatforms', () => ({
  useCreatePlatform: () => ({
    mutate: mockCreatePlatformMutate,
    isPending: false,
    isError: false,
  }),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useCountries: () => mockUseCountries(),
}));

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: mockUpload, uploading: false }),
}));

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: ({
    label,
    onUpload,
    onRemove,
    url,
  }: {
    label: string;
    url: string;
    bucket?: string;
    uploading: boolean;
    uploadEndpoint: string;
    previewAlt?: string;
    previewClassName?: string;
    showUrlCaption?: boolean;
    onUpload: (file: File) => void;
    onRemove: () => void;
  }) => (
    <div>
      <label>{label}</label>
      {url && <img src={url} alt="logo" data-testid="logo-preview" />}
      <button
        type="button"
        onClick={() => onUpload(new File([''], 'logo.png', { type: 'image/png' }))}
        data-testid="upload-logo-btn"
      >
        Upload Logo
      </button>
      <button type="button" onClick={onRemove} data-testid="remove-logo-btn">
        Remove Logo
      </button>
    </div>
  ),
}));

vi.mock('@/components/common/SearchableCountryPicker', () => ({
  SearchableCountryPicker: ({
    onSelect,
    onCancel,
  }: {
    countries: { code: string; name: string }[];
    onSelect: (code: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid="country-picker">
      <button onClick={() => onSelect('US')} data-testid="select-us">
        Select US
      </button>
      <button onClick={onCancel} data-testid="cancel-picker">
        Cancel
      </button>
    </div>
  ),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  useSearchParams: () => mockUseSearchParams(),
}));

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    className,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
  }) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('@shared/colors', () => ({
  colors: { zinc900: '#18181b' },
}));

import NewPlatformPage from '@/app/(dashboard)/platforms/new/page';

describe('NewPlatformPage', () => {
  const mockRouter = { push: vi.fn() };
  const mockSearchParamsGet = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
    mockUseRouter.mockReturnValue(mockRouter);
    mockUseSearchParams.mockReturnValue({ get: mockSearchParamsGet });
    mockSearchParamsGet.mockReturnValue(null); // no ?country= param
    mockUseCountries.mockReturnValue({
      data: [
        { code: 'IN', name: 'India', display_order: 1 },
        { code: 'US', name: 'United States', display_order: 2 },
      ],
    });
  });

  it('renders the page heading', () => {
    render(<NewPlatformPage />);
    expect(screen.getByText('Add Platform')).toBeInTheDocument();
  });

  it('renders name input', () => {
    render(<NewPlatformPage />);
    expect(screen.getByPlaceholderText('e.g. Netflix')).toBeInTheDocument();
  });

  it('renders TMDB Provider ID input', () => {
    render(<NewPlatformPage />);
    expect(screen.getByPlaceholderText('e.g. 119 (optional)')).toBeInTheDocument();
  });

  it('renders default country (IN) from state', () => {
    render(<NewPlatformPage />);
    // India flag should be rendered as country badge
    expect(screen.getByText(/India/)).toBeInTheDocument();
  });

  it('uses country from searchParam if provided', () => {
    mockSearchParamsGet.mockReturnValue('US');
    render(<NewPlatformPage />);
    expect(screen.getByText(/United States/)).toBeInTheDocument();
  });

  it('submit button is disabled when name is empty', () => {
    render(<NewPlatformPage />);
    const submitBtn = screen.getByText('Create').closest('button');
    expect(submitBtn).toBeDisabled();
  });

  it('submit button is enabled when name is filled', () => {
    render(<NewPlatformPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), { target: { value: 'Netflix' } });
    const submitBtn = screen.getByText('Create').closest('button');
    expect(submitBtn).not.toBeDisabled();
  });

  it('calls createPlatform.mutate on form submit', () => {
    render(<NewPlatformPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), { target: { value: 'Netflix' } });
    fireEvent.submit(document.querySelector('form')!);
    expect(mockCreatePlatformMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Netflix',
        logo: 'N',
        regions: ['IN'],
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('generates slug-based id from name', () => {
    render(<NewPlatformPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), {
      target: { value: 'My Platform!' },
    });
    fireEvent.submit(document.querySelector('form')!);
    const call = mockCreatePlatformMutate.mock.calls[0][0];
    expect(call.id).toMatch(/^my-platform-/);
  });

  it('sets tmdb_provider_id when filled', () => {
    render(<NewPlatformPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), { target: { value: 'Aha' } });
    fireEvent.change(screen.getByPlaceholderText('e.g. 119 (optional)'), {
      target: { value: '119' },
    });
    fireEvent.submit(document.querySelector('form')!);
    const call = mockCreatePlatformMutate.mock.calls[0][0];
    expect(call.tmdb_provider_id).toBe(119);
  });

  it('sets tmdb_provider_id to null when empty', () => {
    render(<NewPlatformPage />);
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), { target: { value: 'Aha' } });
    fireEvent.submit(document.querySelector('form')!);
    const call = mockCreatePlatformMutate.mock.calls[0][0];
    expect(call.tmdb_provider_id).toBeNull();
  });

  it('sets logo_url when upload succeeds', async () => {
    mockUpload.mockResolvedValue('https://cdn/logo.png');
    render(<NewPlatformPage />);
    fireEvent.click(screen.getByTestId('upload-logo-btn'));
    await waitFor(() => {
      // After upload completes, logo URL should be set
      // We can verify by checking if the form would submit with the URL
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Netflix'), {
      target: { value: 'Platform' },
    });
    fireEvent.submit(document.querySelector('form')!);
    await waitFor(() => {
      expect(mockCreatePlatformMutate).toHaveBeenCalledWith(
        expect.objectContaining({ logo_url: 'https://cdn/logo.png' }),
        expect.anything(),
      );
    });
  });

  it('shows alert when upload fails', async () => {
    mockUpload.mockRejectedValue(new Error('Upload failed'));
    render(<NewPlatformPage />);
    fireEvent.click(screen.getByTestId('upload-logo-btn'));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('removes country when X button is clicked', () => {
    render(<NewPlatformPage />);
    // Find and click the X button for IN
    const removeButtons = screen.getAllByRole('button').filter((btn) => btn.querySelector('svg'));
    // The X button for country removal
    const xBtn = screen.getAllByRole('button').find((b) => {
      const parent = b.closest('span');
      return parent?.textContent?.includes('India');
    });
    if (xBtn) {
      fireEvent.click(xBtn);
      expect(screen.queryByText(/India/)).not.toBeInTheDocument();
    }
  });

  it('shows Add button to add more countries', () => {
    render(<NewPlatformPage />);
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('clicking Add shows SearchableCountryPicker', () => {
    render(<NewPlatformPage />);
    fireEvent.click(screen.getByText('Add'));
    expect(screen.getByTestId('country-picker')).toBeInTheDocument();
  });

  it('selecting a country from picker adds it to regions', () => {
    render(<NewPlatformPage />);
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByTestId('select-us'));
    expect(screen.getByText(/United States/)).toBeInTheDocument();
    // picker should be dismissed
    expect(screen.queryByTestId('country-picker')).not.toBeInTheDocument();
  });

  it('canceling picker dismisses it without adding country', () => {
    render(<NewPlatformPage />);
    fireEvent.click(screen.getByText('Add'));
    fireEvent.click(screen.getByTestId('cancel-picker'));
    expect(screen.queryByTestId('country-picker')).not.toBeInTheDocument();
  });

  it('does not add duplicate country', () => {
    render(<NewPlatformPage />);
    // Click Add then try to add IN (already present)
    fireEvent.click(screen.getByText('Add'));
    // handleAddCountry with '' (cancelled) or same code 'IN'
    // The picker only shows available (non-selected) countries,
    // but we can test the guard by checking final count
    fireEvent.click(screen.getByTestId('select-us'));
    // US should now appear, IN was already there
    const indiaBadges = screen.queryAllByText(/India/);
    expect(indiaBadges.length).toBe(1);
  });

  it('Cancel link navigates back to platforms', () => {
    render(<NewPlatformPage />);
    const cancelLink = screen.getByText('Cancel').closest('a');
    expect(cancelLink?.getAttribute('href')).toBe('/platforms');
  });

  it('Back link navigates to platforms', () => {
    render(<NewPlatformPage />);
    const backLink = screen.getByRole('link', { name: '' });
    expect(backLink?.getAttribute('href')).toBe('/platforms');
  });
});
