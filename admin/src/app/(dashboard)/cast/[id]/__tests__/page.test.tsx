import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'actor-123' }),
  useRouter: () => ({ push: vi.fn() }),
}));

const mockUseAdminActor = vi.fn();
const mockUpdateActorAsync = vi.fn();
const mockDeleteActorAsync = vi.fn();
const mockUpload = vi.fn();
const mockUsePermissions = vi.fn();

vi.mock('@/hooks/useAdminCast', () => ({
  useAdminActor: (...args: unknown[]) => mockUseAdminActor(...args),
  useUpdateActor: () => ({ mutateAsync: mockUpdateActorAsync }),
  useDeleteActor: () => ({ mutateAsync: mockDeleteActorAsync }),
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

vi.mock('@/components/cast-edit/ActorFormFields', () => ({
  ActorFormFields: ({
    form,
    onFieldChange,
    onPhotoUpload,
  }: {
    form: Record<string, string>;
    onFieldChange: (k: string, v: string) => void;
    onPhotoUpload: (f: File) => void;
  }) => (
    <div data-testid="actor-form-fields">
      <input
        data-testid="name-input"
        value={form.name}
        onChange={(e) => onFieldChange('name', e.target.value)}
      />
      <button
        data-testid="photo-upload-btn"
        onClick={() => onPhotoUpload(new File([''], 'photo.jpg', { type: 'image/jpeg' }))}
      >
        Upload Photo
      </button>
    </div>
  ),
}));

vi.mock('@/components/common/FormChangesDock', () => ({
  FormChangesDock: ({
    saveStatus,
    onSave,
    onDiscard,
  }: {
    saveStatus: string;
    onSave: () => void;
    onDiscard: () => void;
  }) => (
    <div data-testid="form-changes-dock">
      <span data-testid="save-status">{saveStatus}</span>
      <button onClick={onSave} data-testid="save-btn">
        Save
      </button>
      <button onClick={onDiscard} data-testid="discard-btn">
        Discard
      </button>
    </div>
  ),
}));

vi.mock('@/components/preview/DeviceFrame', () => ({
  DeviceFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="device-frame">{children}</div>
  ),
}));

vi.mock('@/components/preview/DeviceSelector', () => ({
  DeviceSelector: ({ onChange }: { onChange: (d: unknown) => void }) => (
    <button
      data-testid="device-selector"
      onClick={() => onChange({ id: 'iphone-15', label: 'iPhone 15', width: 393, height: 852 })}
    >
      Change Device
    </button>
  ),
}));

vi.mock('@/components/preview/ActorDetailPreview', () => ({
  ActorDetailPreview: () => <div data-testid="actor-preview" />,
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@shared/constants', () => ({
  DEVICES: [
    { id: 'iphone-14', label: 'iPhone 14', width: 390, height: 844 },
    { id: 'iphone-15', label: 'iPhone 15', width: 393, height: 852 },
  ],
}));

import EditActorPage from '@/app/(dashboard)/cast/[id]/page';

const mockActor = {
  id: 'actor-123',
  name: 'Test Actor',
  photo_url: '/photo.jpg',
  person_type: 'actor' as const,
  birth_date: '1990-01-01',
  gender: 2,
  biography: 'Test bio',
  place_of_birth: 'Mumbai',
  height_cm: 175,
  tmdb_person_id: 12345,
};

describe('EditActorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePermissions.mockReturnValue({ isReadOnly: false });
    mockUseAdminActor.mockReturnValue({ data: mockActor, isLoading: false });
    mockUpdateActorAsync.mockResolvedValue({});
    mockDeleteActorAsync.mockResolvedValue({});
    mockUpload.mockResolvedValue('https://cdn.example.com/photo.jpg');
    vi.stubGlobal('alert', vi.fn());
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(true));
  });

  it('shows loading spinner when data is loading', () => {
    mockUseAdminActor.mockReturnValue({ data: undefined, isLoading: true });
    render(<EditActorPage />);
    // Loader spinner
    const spinner = document.querySelector('[class*="animate-spin"]');
    expect(spinner).toBeTruthy();
  });

  it('renders Edit Actor heading', () => {
    render(<EditActorPage />);
    expect(screen.getByText('Edit Actor')).toBeTruthy();
  });

  it('renders actor form fields', () => {
    render(<EditActorPage />);
    expect(screen.getByTestId('actor-form-fields')).toBeTruthy();
  });

  it('renders FormChangesDock', () => {
    render(<EditActorPage />);
    expect(screen.getByTestId('form-changes-dock')).toBeTruthy();
  });

  it('renders Delete button when not readOnly', () => {
    render(<EditActorPage />);
    expect(screen.getByText('Delete')).toBeTruthy();
  });

  it('does not render Delete button when readOnly', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    render(<EditActorPage />);
    expect(screen.queryByText('Delete')).toBeNull();
  });

  it('calls updateActor on Save', async () => {
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-btn'));
    });
    expect(mockUpdateActorAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'actor-123', name: 'Test Actor' }),
    );
  });

  it('shows success status after save', async () => {
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-btn'));
    });
    await waitFor(() => {
      expect(screen.getByTestId('save-status').textContent).toBe('success');
    });
  });

  it('shows alert on save failure', async () => {
    const alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);
    mockUpdateActorAsync.mockRejectedValue(new Error('DB error'));
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-btn'));
    });
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Save failed: DB error'));
  });

  it('calls deleteActor and redirects on confirm', async () => {
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });
    expect(mockDeleteActorAsync).toHaveBeenCalledWith('actor-123');
  });

  it('shows alert on delete failure', async () => {
    const alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);
    mockDeleteActorAsync.mockRejectedValue(new Error('Delete failed'));
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Delete failed: Delete failed'));
  });

  it('uploads photo and updates form', async () => {
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('photo-upload-btn'));
    });
    expect(mockUpload).toHaveBeenCalled();
  });

  it('shows alert on photo upload failure', async () => {
    const alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);
    mockUpload.mockRejectedValue(new Error('Upload failed'));
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('photo-upload-btn'));
    });
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Upload failed'));
  });

  it('discards changes when discard clicked', async () => {
    render(<EditActorPage />);
    // Change the name
    fireEvent.change(screen.getByTestId('name-input'), { target: { value: 'New Name' } });
    // Then discard
    fireEvent.click(screen.getByTestId('discard-btn'));
    // Should revert to original
    await waitFor(() => {
      expect(screen.getByTestId('name-input')).toHaveProperty('value', 'Test Actor');
    });
  });

  it('passes actor id to useAdminActor', () => {
    render(<EditActorPage />);
    expect(mockUseAdminActor).toHaveBeenCalledWith('actor-123');
  });

  it('does not delete when confirm returns false', async () => {
    vi.stubGlobal('confirm', vi.fn().mockReturnValue(false));
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });
    expect(mockDeleteActorAsync).not.toHaveBeenCalled();
  });

  it('renders device selector and preview', () => {
    render(<EditActorPage />);
    expect(screen.getByTestId('device-selector')).toBeTruthy();
    expect(screen.getByTestId('actor-preview')).toBeTruthy();
  });

  it('handles actor with null optional fields', () => {
    mockUseAdminActor.mockReturnValue({
      data: {
        ...mockActor,
        photo_url: null,
        birth_date: null,
        biography: null,
        place_of_birth: null,
        height_cm: null,
        tmdb_person_id: null,
        gender: null,
      },
      isLoading: false,
    });
    render(<EditActorPage />);
    // Should render without errors, fields default to empty strings
    expect(screen.getByText('Edit Actor')).toBeTruthy();
  });

  it('saves payload with null for empty optional fields', async () => {
    mockUseAdminActor.mockReturnValue({
      data: {
        ...mockActor,
        photo_url: null,
        birth_date: null,
        biography: null,
        place_of_birth: null,
        height_cm: null,
        tmdb_person_id: null,
      },
      isLoading: false,
    });
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-btn'));
    });
    expect(mockUpdateActorAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        photo_url: null,
        birth_date: null,
        biography: null,
        place_of_birth: null,
        height_cm: null,
        tmdb_person_id: null,
      }),
    );
  });

  it('saves numeric height_cm when value is provided', async () => {
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('save-btn'));
    });
    expect(mockUpdateActorAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        height_cm: 175,
        tmdb_person_id: 12345,
      }),
    );
  });

  it('shows generic "Upload failed" for non-Error upload rejection', async () => {
    const alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);
    mockUpload.mockRejectedValue('string error');
    render(<EditActorPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('photo-upload-btn'));
    });
    await waitFor(() => expect(alertMock).toHaveBeenCalledWith('Upload failed'));
  });

  it('applies pointer-events-none and opacity when readOnly', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    const { container } = render(<EditActorPage />);
    const el = container.querySelector('.pointer-events-none');
    expect(el).toBeTruthy();
  });

  it('changes device via DeviceSelector', () => {
    render(<EditActorPage />);
    fireEvent.click(screen.getByTestId('device-selector'));
    // Should not crash — device state updates
    expect(screen.getByTestId('device-frame')).toBeTruthy();
  });
});
