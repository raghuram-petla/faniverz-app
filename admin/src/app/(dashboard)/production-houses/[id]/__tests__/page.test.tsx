import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'ph-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockUpload = vi.fn();
const mockUsePermissions = vi.fn();
const mockUseAdminProductionHouse = vi.fn();

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useAdminProductionHouse: (...args: unknown[]) => mockUseAdminProductionHouse(...args),
  useUpdateProductionHouse: () => ({ mutateAsync: mockUpdateMutateAsync }),
  useDeleteProductionHouse: () => ({ mutateAsync: mockDeleteMutateAsync }),
}));

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: () => ({ upload: mockUpload, uploading: false }),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/hooks/useFormChanges', () => ({
  useFormChanges: () => ({ changes: [], isDirty: false, changeCount: 0 }),
}));

vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useCountries: () => ({
    data: [
      { code: 'IN', name: 'India' },
      { code: 'US', name: 'United States' },
      { code: 'GB', name: 'United Kingdom' },
    ],
  }),
}));

vi.mock('@/components/common/FormChangesDock', () => ({
  FormChangesDock: ({
    saveStatus,
    onSave,
    onDiscard,
    onRevertField,
  }: {
    saveStatus: string;
    onSave: () => void;
    onDiscard: () => void;
    onRevertField?: (key: string) => void;
  }) => (
    <div data-testid="form-changes-dock">
      <span data-testid="save-status">{saveStatus}</span>
      <button onClick={onSave} data-testid="save-btn">
        Save
      </button>
      <button onClick={onDiscard} data-testid="discard-btn">
        Discard
      </button>
      {onRevertField && (
        <button onClick={() => onRevertField('name')} data-testid="revert-btn">
          Revert
        </button>
      )}
    </div>
  ),
}));

vi.mock('@/components/movie-edit/ImageUploadField', () => ({
  ImageUploadField: ({
    onUpload,
    onRemove,
    label,
  }: {
    onUpload: (f: File) => void;
    onRemove: () => void;
    label: string;
  }) => (
    <div data-testid="image-upload-field">
      <span>{label}</span>
      <button
        onClick={() => onUpload(new File([''], 'logo.png', { type: 'image/png' }))}
        data-testid="upload-btn"
      >
        Upload
      </button>
      <button onClick={onRemove} data-testid="remove-btn">
        Remove
      </button>
    </div>
  ),
}));

vi.mock('@/components/movie-edit/PosterGalleryCard', () => ({
  PosterVariantStatus: () => <div data-testid="poster-variant-status" />,
}));

vi.mock('@/components/common/CountryDropdown', () => ({
  CountryDropdown: ({ onChange, value }: { onChange: (code: string) => void; value: string }) => (
    <div data-testid="country-dropdown">
      <select value={value} onChange={(e) => onChange(e.target.value)} data-testid="country-select">
        <option value="">Select country</option>
        <option value="IN">India</option>
        <option value="US">United States</option>
        <option value="GB">United Kingdom</option>
      </select>
    </div>
  ),
  countryFlag: (code: string) => `[${code}]`,
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import EditProductionHousePage from '@/app/(dashboard)/production-houses/[id]/page';

const mockHouse = {
  id: 'ph-1',
  name: 'Arka Media Works',
  logo_url: 'https://cdn.example.com/arka.png',
  description: 'Telugu production house',
  origin_country: 'IN',
  tmdb_company_id: null,
};

describe('EditProductionHousePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
    mockUsePermissions.mockReturnValue({ isReadOnly: false, canDeleteTopLevel: () => true });
    mockUseAdminProductionHouse.mockReturnValue({ data: mockHouse, isLoading: false });
  });

  it('shows loading spinner when data is loading', () => {
    mockUseAdminProductionHouse.mockReturnValue({ data: undefined, isLoading: true });
    render(<EditProductionHousePage />);
    expect(screen.queryByText('Edit Production House')).not.toBeInTheDocument();
  });

  it('renders Edit Production House heading when loaded', () => {
    render(<EditProductionHousePage />);
    expect(screen.getByText('Edit Production House')).toBeInTheDocument();
  });

  it('renders back link to /production-houses', () => {
    render(<EditProductionHousePage />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/production-houses');
  });

  it('populates name field with house data', () => {
    render(<EditProductionHousePage />);
    expect(screen.getByDisplayValue('Arka Media Works')).toBeInTheDocument();
  });

  it('populates description field', () => {
    render(<EditProductionHousePage />);
    expect(screen.getByDisplayValue('Telugu production house')).toBeInTheDocument();
  });

  it('shows Delete button when not read-only', () => {
    render(<EditProductionHousePage />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides Delete button when read-only', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true, canDeleteTopLevel: () => false });
    render(<EditProductionHousePage />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows country dropdown when no TMDB link', () => {
    render(<EditProductionHousePage />);
    expect(screen.getByTestId('country-dropdown')).toBeInTheDocument();
  });

  it('hides country dropdown when TMDB-linked AND origin_country set', () => {
    mockUseAdminProductionHouse.mockReturnValue({
      data: { ...mockHouse, tmdb_company_id: 12345, origin_country: 'IN' },
      isLoading: false,
    });
    render(<EditProductionHousePage />);
    expect(screen.queryByTestId('country-dropdown')).not.toBeInTheDocument();
  });

  it('shows TMDB metadata badge when tmdb_company_id is set', () => {
    mockUseAdminProductionHouse.mockReturnValue({
      data: { ...mockHouse, tmdb_company_id: 12345 },
      isLoading: false,
    });
    render(<EditProductionHousePage />);
    expect(screen.getByText(/TMDB #12345/)).toBeInTheDocument();
  });

  it('shows country badge in TMDB metadata when origin_country is set', () => {
    mockUseAdminProductionHouse.mockReturnValue({
      data: { ...mockHouse, tmdb_company_id: 12345, origin_country: 'IN' },
      isLoading: false,
    });
    render(<EditProductionHousePage />);
    expect(screen.getByText(/India/)).toBeInTheDocument();
  });

  it('shows country dropdown when TMDB-linked but no origin_country', () => {
    mockUseAdminProductionHouse.mockReturnValue({
      data: { ...mockHouse, tmdb_company_id: 12345, origin_country: null },
      isLoading: false,
    });
    render(<EditProductionHousePage />);
    expect(screen.getByTestId('country-dropdown')).toBeInTheDocument();
  });

  it('calls updateHouse mutateAsync on save', async () => {
    mockUpdateMutateAsync.mockResolvedValue({});
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByTestId('save-btn'));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'ph-1', name: 'Arka Media Works' }),
      );
    });
  });

  it('passes empty string values as null to save', async () => {
    mockUpdateMutateAsync.mockResolvedValue({});
    mockUseAdminProductionHouse.mockReturnValue({
      data: { ...mockHouse, logo_url: null, description: null, origin_country: null },
      isLoading: false,
    });
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByTestId('save-btn'));

    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ logo_url: null, description: null, origin_country: null }),
      );
    });
  });

  it('shows alert when save fails', async () => {
    mockUpdateMutateAsync.mockRejectedValue(new Error('Save error'));
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByTestId('save-btn'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Save failed'));
    });
  });

  it('handles non-Error save failures', async () => {
    mockUpdateMutateAsync.mockRejectedValue({ code: 500 });
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByTestId('save-btn'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalled();
    });
  });

  it('calls deleteHouse and navigates on confirmed delete', async () => {
    mockDeleteMutateAsync.mockResolvedValue({});
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith('ph-1');
    });
  });

  it('does not delete when confirm is cancelled', () => {
    window.confirm = vi.fn(() => false);
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByText('Delete'));
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it('shows alert when delete fails', async () => {
    mockDeleteMutateAsync.mockRejectedValue(new Error('Delete error'));
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Delete failed'));
    });
  });

  it('uploads logo on upload button click', async () => {
    mockUpload.mockResolvedValue('https://cdn.example.com/new-logo.png');
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalled();
    });
  });

  it('shows alert when upload fails', async () => {
    mockUpload.mockRejectedValue(new Error('Upload error'));
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Upload error');
    });
  });

  it('shows upload fallback alert for non-Error', async () => {
    mockUpload.mockRejectedValue('string error');
    render(<EditProductionHousePage />);

    fireEvent.click(screen.getByTestId('upload-btn'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('removes logo when remove button clicked', () => {
    render(<EditProductionHousePage />);
    fireEvent.click(screen.getByTestId('remove-btn'));
    // Page should still render correctly
    expect(screen.getByText('Edit Production House')).toBeInTheDocument();
  });

  it('updates form when name input changes', () => {
    render(<EditProductionHousePage />);
    const nameInput = screen.getByDisplayValue('Arka Media Works');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });
    expect(screen.getByDisplayValue('New Name')).toBeInTheDocument();
  });

  it('updates form when description changes', () => {
    render(<EditProductionHousePage />);
    const descInput = screen.getByDisplayValue('Telugu production house');
    fireEvent.change(descInput, { target: { value: 'Updated desc' } });
    expect(screen.getByDisplayValue('Updated desc')).toBeInTheDocument();
  });

  it('updates origin_country via country dropdown', () => {
    render(<EditProductionHousePage />);
    const countrySelect = screen.getByTestId('country-select');
    fireEvent.change(countrySelect, { target: { value: 'US' } });
    expect((countrySelect as HTMLSelectElement).value).toBe('US');
  });

  it('handles house with no logo (null logo_url)', () => {
    mockUseAdminProductionHouse.mockReturnValue({
      data: { ...mockHouse, logo_url: null },
      isLoading: false,
    });
    render(<EditProductionHousePage />);
    expect(screen.getByText('Edit Production House')).toBeInTheDocument();
    // PosterVariantStatus should NOT render when no logo_url
    expect(screen.queryByTestId('poster-variant-status')).not.toBeInTheDocument();
  });

  it('shows PosterVariantStatus when logo_url is set', () => {
    render(<EditProductionHousePage />);
    expect(screen.getByTestId('poster-variant-status')).toBeInTheDocument();
  });

  it('reverts form to initial values when discard is clicked', () => {
    render(<EditProductionHousePage />);
    const nameInput = screen.getByDisplayValue('Arka Media Works');
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } });
    expect(screen.getByDisplayValue('Changed Name')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('discard-btn'));
    expect(screen.getByDisplayValue('Arka Media Works')).toBeInTheDocument();
  });

  it('reverts a single field when revert button is clicked', () => {
    render(<EditProductionHousePage />);
    const nameInput = screen.getByDisplayValue('Arka Media Works');
    fireEvent.change(nameInput, { target: { value: 'Changed Name' } });
    expect(screen.getByDisplayValue('Changed Name')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('revert-btn'));
    expect(screen.getByDisplayValue('Arka Media Works')).toBeInTheDocument();
  });
});
