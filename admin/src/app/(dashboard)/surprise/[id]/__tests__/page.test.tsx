import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Mocks before imports ───
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useParams: () => ({ id: 'surprise-1' }),
}));

const mockUpdateMutateAsync = vi.fn().mockResolvedValue(undefined);
const mockDeleteMutateAsync = vi.fn().mockResolvedValue(undefined);
const mockUseAdminSurpriseItem = vi.fn();

const mockUseUpdateSurprise = vi.fn();
vi.mock('@/hooks/useAdminSurprise', () => ({
  useAdminSurpriseItem: () => mockUseAdminSurpriseItem(),
  useUpdateSurprise: () => mockUseUpdateSurprise(),
  useDeleteSurprise: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
}));

const mockUsePermissions = vi.fn();
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => mockUsePermissions(),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@/hooks/useFormChanges', () => ({
  useFormChanges: vi.fn(() => ({ changes: [], isDirty: false, changeCount: 0 })),
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
      <button data-testid="dock-save" onClick={onSave}>
        Save
      </button>
      <button data-testid="dock-discard" onClick={onDiscard}>
        Discard
      </button>
    </div>
  ),
}));

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children: React.ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}));

import EditSurpriseContentPage from '@/app/(dashboard)/surprise/[id]/page';

const makeItem = (overrides = {}) => ({
  id: 'surprise-1',
  title: 'My Song',
  description: 'A great song',
  youtube_id: 'vidAbc123',
  category: 'song',
  views: 500,
  ...overrides,
});

describe('EditSurpriseContentPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
    mockUsePermissions.mockReturnValue({ isReadOnly: false, canDeleteTopLevel: () => true });
    mockUseUpdateSurprise.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isError: false,
      error: null,
      isPending: false,
    });
    mockUseAdminSurpriseItem.mockReturnValue({ data: makeItem(), isLoading: false });
  });

  it('renders loading spinner when isLoading', () => {
    mockUseAdminSurpriseItem.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<EditSurpriseContentPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders "Content not found" when no item', () => {
    mockUseAdminSurpriseItem.mockReturnValue({ data: undefined, isLoading: false });
    render(<EditSurpriseContentPage />);
    expect(screen.getByText('Content not found.')).toBeInTheDocument();
  });

  it('renders "Edit Content" heading', () => {
    render(<EditSurpriseContentPage />);
    expect(screen.getByText('Edit Content')).toBeInTheDocument();
  });

  it('renders back link to /surprise', () => {
    render(<EditSurpriseContentPage />);
    expect(screen.getByRole('link')).toHaveAttribute('href', '/surprise');
  });

  it('renders Delete button when not read-only', () => {
    render(<EditSurpriseContentPage />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides Delete button when read-only', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true, canDeleteTopLevel: () => false });
    render(<EditSurpriseContentPage />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('renders YouTube iframe when youtubeId is set', () => {
    render(<EditSurpriseContentPage />);
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.src).toContain('vidAbc123');
  });

  it('does not render YouTube iframe when youtubeId is empty', () => {
    mockUseAdminSurpriseItem.mockReturnValue({
      data: makeItem({ youtube_id: '' }),
      isLoading: false,
    });
    render(<EditSurpriseContentPage />);
    expect(document.querySelector('iframe')).not.toBeInTheDocument();
  });

  it('renders Title input with loaded value', () => {
    render(<EditSurpriseContentPage />);
    const input = screen.getByLabelText('Title');
    expect(input).toHaveValue('My Song');
  });

  it('renders Description textarea with loaded value', () => {
    render(<EditSurpriseContentPage />);
    const textarea = screen.getByLabelText('Description');
    expect(textarea).toHaveValue('A great song');
  });

  it('renders YouTube ID input with loaded value', () => {
    render(<EditSurpriseContentPage />);
    const input = screen.getByLabelText('YouTube ID');
    expect(input).toHaveValue('vidAbc123');
  });

  it('renders category select with current category selected', () => {
    render(<EditSurpriseContentPage />);
    const select = screen.getByLabelText('Category') as HTMLSelectElement;
    expect(select.value).toBe('song');
  });

  it('renders Views input with loaded value', () => {
    render(<EditSurpriseContentPage />);
    const input = screen.getByLabelText('Views');
    expect(input).toHaveValue('500');
  });

  it('renders all category options', () => {
    render(<EditSurpriseContentPage />);
    const select = screen.getByLabelText('Category') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.value);
    expect(options).toContain('song');
    expect(options).toContain('short-film');
    expect(options).toContain('bts');
    expect(options).toContain('interview');
    expect(options).toContain('trailer');
  });

  it('renders FormChangesDock', () => {
    render(<EditSurpriseContentPage />);
    expect(screen.getByTestId('form-changes-dock')).toBeInTheDocument();
  });

  it('calls updateItem.mutateAsync on save', async () => {
    render(<EditSurpriseContentPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('dock-save'));
    });
    expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'surprise-1', title: 'My Song' }),
    );
  });

  it('updates saveStatus to saving when dock save is clicked', async () => {
    mockUpdateMutateAsync.mockImplementation(() => new Promise(() => {})); // never resolves
    render(<EditSurpriseContentPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('dock-save'));
    });
    expect(screen.getByTestId('save-status').textContent).toBe('saving');
  });

  it('confirms before deleting', () => {
    render(<EditSurpriseContentPage />);
    fireEvent.click(screen.getByText('Delete'));
    expect(window.confirm).toHaveBeenCalledWith(
      'Delete this surprise content? This cannot be undone.',
    );
  });

  it('calls deleteItem.mutateAsync when confirmed', async () => {
    render(<EditSurpriseContentPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });
    expect(mockDeleteMutateAsync).toHaveBeenCalledWith('surprise-1');
  });

  it('does not delete when confirm cancelled', async () => {
    window.confirm = vi.fn(() => false);
    render(<EditSurpriseContentPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it('applies pointer-events-none when read-only', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true, canDeleteTopLevel: () => false });
    const { container } = render(<EditSurpriseContentPage />);
    const el = container.querySelector('.pointer-events-none');
    expect(el).toBeInTheDocument();
  });

  it('updates title field when user types', () => {
    render(<EditSurpriseContentPage />);
    const input = screen.getByLabelText('Title');
    fireEvent.change(input, { target: { value: 'New Title' } });
    expect(input).toHaveValue('New Title');
  });

  it('updates views to 0 for non-numeric input', () => {
    render(<EditSurpriseContentPage />);
    const input = screen.getByLabelText('Views');
    fireEvent.change(input, { target: { value: 'abc' } });
    expect(input).toHaveValue('0');
  });

  it('shows error message when updateMutation.isError is true', () => {
    mockUseUpdateSurprise.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isError: true,
      error: new Error('Validation failed'),
      isPending: false,
    });
    render(<EditSurpriseContentPage />);
    expect(screen.getByText('Validation failed')).toBeInTheDocument();
  });

  it('shows fallback error text when update error is not an Error instance', () => {
    mockUseUpdateSurprise.mockReturnValue({
      mutateAsync: mockUpdateMutateAsync,
      isError: true,
      error: 'string error',
      isPending: false,
    });
    render(<EditSurpriseContentPage />);
    expect(screen.getByText('Failed to update content')).toBeInTheDocument();
  });

  it('renders null description as empty string in form', () => {
    mockUseAdminSurpriseItem.mockReturnValue({
      data: makeItem({ description: null }),
      isLoading: false,
    });
    render(<EditSurpriseContentPage />);
    const textarea = screen.getByLabelText('Description');
    expect(textarea).toHaveValue('');
  });

  it('updates description field when user types', () => {
    render(<EditSurpriseContentPage />);
    const textarea = screen.getByLabelText('Description');
    fireEvent.change(textarea, { target: { value: 'New desc' } });
    expect(textarea).toHaveValue('New desc');
  });

  it('updates category field when user selects', () => {
    render(<EditSurpriseContentPage />);
    const select = screen.getByLabelText('Category');
    fireEvent.change(select, { target: { value: 'bts' } });
    expect(select).toHaveValue('bts');
  });

  it('updates YouTube ID field when user types', () => {
    render(<EditSurpriseContentPage />);
    const input = screen.getByLabelText('YouTube ID');
    fireEvent.change(input, { target: { value: 'newVid' } });
    expect(input).toHaveValue('newVid');
  });
});
