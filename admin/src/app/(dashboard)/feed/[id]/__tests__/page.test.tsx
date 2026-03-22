import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

// ─── Mocks before imports ───
const mockRouterPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush }),
  useParams: () => ({ id: 'feed-item-1' }),
}));

const mockUpdateMutateAsync = vi.fn();
const mockDeleteMutateAsync = vi.fn();
const mockUseAdminFeedItem = vi.fn();

vi.mock('@/hooks/useAdminFeed', () => ({
  useAdminFeedItem: () => mockUseAdminFeedItem(),
  useUpdateFeedItem: () => ({ mutateAsync: mockUpdateMutateAsync, isPending: false }),
  useDeleteFeedItem: () => ({ mutateAsync: mockDeleteMutateAsync, isPending: false }),
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
    changeCount,
  }: {
    saveStatus: string;
    onSave: () => void;
    onDiscard: () => void;
    changeCount: number;
  }) => (
    <div data-testid="form-changes-dock">
      <span data-testid="save-status">{saveStatus}</span>
      <span data-testid="change-count">{changeCount}</span>
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

import EditFeedItemPage from '@/app/(dashboard)/feed/[id]/page';

const makeItem = (overrides = {}) => ({
  id: 'feed-item-1',
  title: 'Test Feed Item',
  description: 'Some description',
  is_pinned: false,
  is_featured: true,
  feed_type: 'video',
  content_type: 'movie',
  source_table: null as string | null,
  youtube_id: null as string | null,
  thumbnail_url: null as string | null,
  movie: null as { title: string } | null,
  ...overrides,
});

describe('EditFeedItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.confirm = vi.fn(() => true);
    window.alert = vi.fn();
    mockUsePermissions.mockReturnValue({ isReadOnly: false });
    mockUseAdminFeedItem.mockReturnValue({ data: makeItem(), isLoading: false });
    mockUpdateMutateAsync.mockResolvedValue({});
    mockDeleteMutateAsync.mockResolvedValue({});
  });

  it('renders loading spinner when isLoading', () => {
    mockUseAdminFeedItem.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = render(<EditFeedItemPage />);
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders "Feed item not found" when no item', () => {
    mockUseAdminFeedItem.mockReturnValue({ data: undefined, isLoading: false });
    render(<EditFeedItemPage />);
    expect(screen.getByText('Feed item not found.')).toBeInTheDocument();
  });

  it('renders "Edit Feed Item" heading', () => {
    render(<EditFeedItemPage />);
    expect(screen.getByText('Edit Feed Item')).toBeInTheDocument();
  });

  it('shows back link to /feed', () => {
    render(<EditFeedItemPage />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/feed');
  });

  it('renders Delete button when not read-only', () => {
    render(<EditFeedItemPage />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('hides Delete button when read-only', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    render(<EditFeedItemPage />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('renders source_table info banner when source_table is set', () => {
    mockUseAdminFeedItem.mockReturnValue({
      data: makeItem({ source_table: 'movies' }),
      isLoading: false,
    });
    render(<EditFeedItemPage />);
    expect(screen.getByText('movies')).toBeInTheDocument();
    expect(screen.getByText(/Auto-generated from/)).toBeInTheDocument();
  });

  it('does not render source_table banner when source_table is null', () => {
    render(<EditFeedItemPage />);
    expect(screen.queryByText(/Auto-generated from/)).not.toBeInTheDocument();
  });

  it('renders youtube iframe when youtube_id is set', () => {
    mockUseAdminFeedItem.mockReturnValue({
      data: makeItem({ youtube_id: 'abc123' }),
      isLoading: false,
    });
    render(<EditFeedItemPage />);
    const iframe = document.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe?.src).toContain('abc123');
  });

  it('renders thumbnail image when thumbnail_url is set and no youtube_id', () => {
    mockUseAdminFeedItem.mockReturnValue({
      data: makeItem({ thumbnail_url: 'https://cdn/thumb.jpg' }),
      isLoading: false,
    });
    render(<EditFeedItemPage />);
    const img = document.querySelector('img');
    expect(img?.src).toBe('https://cdn/thumb.jpg');
  });

  it('renders feed_type and content_type badges', () => {
    render(<EditFeedItemPage />);
    expect(screen.getByText('Type: video')).toBeInTheDocument();
    expect(screen.getByText('Content: movie')).toBeInTheDocument();
  });

  it('renders movie title badge when item has a movie', () => {
    mockUseAdminFeedItem.mockReturnValue({
      data: makeItem({ movie: { title: 'Bahubali' } }),
      isLoading: false,
    });
    render(<EditFeedItemPage />);
    expect(screen.getByText('Movie: Bahubali')).toBeInTheDocument();
  });

  it('renders title input with item title', () => {
    render(<EditFeedItemPage />);
    const input = screen.getByDisplayValue('Test Feed Item');
    expect(input).toBeInTheDocument();
  });

  it('renders description textarea with item description', () => {
    render(<EditFeedItemPage />);
    const textarea = screen.getByDisplayValue('Some description');
    expect(textarea).toBeInTheDocument();
  });

  it('renders isPinned checkbox unchecked', () => {
    render(<EditFeedItemPage />);
    const checkboxes = screen.getAllByRole('checkbox');
    const pinnedBox = checkboxes[0];
    expect(pinnedBox).not.toBeChecked();
  });

  it('renders isFeatured checkbox checked when is_featured=true', () => {
    render(<EditFeedItemPage />);
    const checkboxes = screen.getAllByRole('checkbox');
    const featuredBox = checkboxes[1];
    expect(featuredBox).toBeChecked();
  });

  it('renders FormChangesDock', () => {
    render(<EditFeedItemPage />);
    expect(screen.getByTestId('form-changes-dock')).toBeInTheDocument();
  });

  it('saves via dock save button and sets success status', async () => {
    render(<EditFeedItemPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('dock-save'));
    });
    await waitFor(() => {
      expect(mockUpdateMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ id: 'feed-item-1' }),
      );
    });
  });

  it('alerts on save error', async () => {
    mockUpdateMutateAsync.mockRejectedValue(new Error('Save failed'));
    render(<EditFeedItemPage />);
    await act(async () => {
      fireEvent.click(screen.getByTestId('dock-save'));
    });
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Save failed'));
    });
  });

  it('confirms and deletes item on Delete click', async () => {
    render(<EditFeedItemPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });
    await waitFor(() => {
      expect(window.confirm).toHaveBeenCalledWith('Delete this feed item?');
      expect(mockDeleteMutateAsync).toHaveBeenCalledWith('feed-item-1');
    });
  });

  it('navigates to /feed after successful delete', async () => {
    render(<EditFeedItemPage />);
    await act(async () => {
      fireEvent.click(screen.getByText('Delete'));
    });
    await waitFor(() => {
      expect(mockRouterPush).toHaveBeenCalledWith('/feed');
    });
  });

  it('does not delete when confirm is cancelled', async () => {
    window.confirm = vi.fn(() => false);
    render(<EditFeedItemPage />);
    fireEvent.click(screen.getByText('Delete'));
    expect(mockDeleteMutateAsync).not.toHaveBeenCalled();
  });

  it('shows pointer-events-none when read-only', () => {
    mockUsePermissions.mockReturnValue({ isReadOnly: true });
    const { container } = render(<EditFeedItemPage />);
    const form = container.querySelector('.pointer-events-none');
    expect(form).toBeInTheDocument();
  });
});
