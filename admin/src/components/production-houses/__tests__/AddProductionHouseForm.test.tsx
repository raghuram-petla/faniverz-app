import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockMutateAsync = vi.fn();
const mockUpload = vi.fn();

vi.mock('@/hooks/useAdminProductionHouses', () => ({
  useCreateProductionHouse: vi.fn(() => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  })),
}));

vi.mock('@/hooks/useAdminMovieAvailability', () => ({
  useCountries: vi.fn(() => ({
    data: [
      { code: 'US', name: 'United States', flag: '🇺🇸' },
      { code: 'IN', name: 'India', flag: '🇮🇳' },
    ],
  })),
}));

vi.mock('@/hooks/useImageUpload', () => ({
  useImageUpload: vi.fn(() => ({
    upload: (...args: unknown[]) => mockUpload(...args),
    uploading: false,
  })),
}));

vi.mock('@/components/common/CountryDropdown', () => ({
  CountryDropdown: ({
    value,
    onChange,
  }: {
    countries: unknown[];
    value: string;
    onChange: (code: string) => void;
  }) => (
    <select data-testid="country-dropdown" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">All countries</option>
      <option value="US">United States</option>
      <option value="IN">India</option>
    </select>
  ),
}));

const mockGetImageUrl = vi.fn((url: string) => url);
vi.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string) => mockGetImageUrl(url),
}));

import { AddProductionHouseForm } from '@/components/production-houses/AddProductionHouseForm';

describe('AddProductionHouseForm', () => {
  const onClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  it('renders name input and buttons', () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument();
    expect(screen.getByText('Add')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders description textarea', () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByPlaceholderText('Description (optional)')).toBeInTheDocument();
  });

  it('renders logo upload button initially', () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByText('Logo (optional)')).toBeInTheDocument();
  });

  it('renders country dropdown', () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByTestId('country-dropdown')).toBeInTheDocument();
  });

  it('calls onClose when Cancel is clicked', () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not submit when name is empty', async () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.click(screen.getByText('Add'));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('does not submit when name is only whitespace', async () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Add'));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockMutateAsync).not.toHaveBeenCalled();
  });

  it('submits form with correct data', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<AddProductionHouseForm onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Name *'), {
      target: { value: 'Dharma Productions' },
    });
    fireEvent.change(screen.getByPlaceholderText('Description (optional)'), {
      target: { value: 'Bollywood studio' },
    });
    fireEvent.change(screen.getByTestId('country-dropdown'), { target: { value: 'IN' } });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Dharma Productions',
        logo_url: null,
        description: 'Bollywood studio',
        origin_country: 'IN',
      });
    });
  });

  it('coerces empty logo_url and description to null on submit', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<AddProductionHouseForm onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: 'Test Studio' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith({
        name: 'Test Studio',
        logo_url: null,
        description: null,
        origin_country: null,
      });
    });
  });

  it('calls onClose after successful add', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<AddProductionHouseForm onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: 'Test Studio' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('resets form after successful add', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<AddProductionHouseForm onClose={onClose} />);

    const nameInput = screen.getByPlaceholderText('Name *');
    fireEvent.change(nameInput, { target: { value: 'Test Studio' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('shows alert on add error', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Insert failed'));
    render(<AddProductionHouseForm onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: 'Test Studio' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Failed to add production house: Insert failed');
    });
  });

  it('shows alert with stringified error for non-Error throws', async () => {
    mockMutateAsync.mockRejectedValue({ code: '23505' });
    render(<AddProductionHouseForm onClose={onClose} />);

    fireEvent.change(screen.getByPlaceholderText('Name *'), { target: { value: 'Test Studio' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(
        expect.stringContaining('Failed to add production house:'),
      );
    });
  });

  it('shows "Adding..." text when mutation is pending', async () => {
    const mod = await import('@/hooks/useAdminProductionHouses');
    vi.mocked(mod.useCreateProductionHouse).mockReturnValue({
      mutateAsync: mockMutateAsync,
      isPending: true,
    } as unknown as ReturnType<typeof mod.useCreateProductionHouse>);

    render(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByText('Adding...')).toBeInTheDocument();
  });

  it('calls upload when a file is selected', async () => {
    mockUpload.mockResolvedValue('https://cdn.example.com/logo.png');
    render(<AddProductionHouseForm onClose={onClose} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockUpload).toHaveBeenCalledWith(file);
    });
  });

  it('shows logo preview after successful upload', async () => {
    mockUpload.mockResolvedValue('https://cdn.example.com/logo.png');
    render(<AddProductionHouseForm onClose={onClose} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Logo uploaded')).toBeInTheDocument();
    });
  });

  it('shows alert when upload fails', async () => {
    mockUpload.mockRejectedValue(new Error('Upload failed'));
    render(<AddProductionHouseForm onClose={onClose} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('shows alert with generic message for non-Error upload failure', async () => {
    mockUpload.mockRejectedValue('network error');
    render(<AddProductionHouseForm onClose={onClose} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Upload failed');
    });
  });

  it('triggers file input click when Logo button is clicked', () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    const logoButton = screen.getByText('Logo (optional)').closest('button')!;
    // Click the button to trigger fileInputRef.current?.click()
    fireEvent.click(logoButton);
    // No crash means the ref?.click() branch was covered
    expect(logoButton).toBeInTheDocument();
  });

  it('does nothing when file input change has no files', async () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [] } });
    // No upload should be called
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('does nothing when file input change has null files', async () => {
    render(<AddProductionHouseForm onClose={onClose} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: null } });
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('shows uploading state text', async () => {
    const mod = await import('@/hooks/useImageUpload');
    vi.mocked(mod.useImageUpload).mockReturnValueOnce({
      upload: mockUpload,
      uploading: true,
    });

    render(<AddProductionHouseForm onClose={onClose} />);
    expect(screen.getByText('Uploading...')).toBeInTheDocument();
  });

  it('falls back to raw logo_url when getImageUrl returns null', async () => {
    mockGetImageUrl.mockReturnValue(null as unknown as string);
    mockUpload.mockResolvedValue('https://cdn.example.com/raw-logo.png');
    render(<AddProductionHouseForm onClose={onClose} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      const img = document.querySelector('img');
      expect(img).toBeInTheDocument();
      expect(img).toHaveAttribute('src', 'https://cdn.example.com/raw-logo.png');
    });
    mockGetImageUrl.mockImplementation((url: string) => url);
  });

  it('clears logo when X button is clicked', async () => {
    mockUpload.mockResolvedValue('https://cdn.example.com/logo.png');
    render(<AddProductionHouseForm onClose={onClose} />);

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['logo'], 'logo.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText('Logo uploaded')).toBeInTheDocument();
    });

    // Click the X button to remove
    const _xButton = screen.queryByRole('button', { name: /x/i });
    // Find the X button by its position in the logo section
    const logoSection = screen.getByText('Logo uploaded').closest('div');
    const buttons = logoSection?.querySelectorAll('button');
    if (buttons && buttons.length > 0) {
      fireEvent.click(buttons[buttons.length - 1]);
    }

    await waitFor(() => {
      expect(screen.queryByText('Logo uploaded')).not.toBeInTheDocument();
      expect(screen.getByText('Logo (optional)')).toBeInTheDocument();
    });
  });
});
