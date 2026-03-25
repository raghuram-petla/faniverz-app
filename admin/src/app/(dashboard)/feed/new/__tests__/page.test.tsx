import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockPush = vi.fn();
const mockMutateAsync = vi.fn();
const mockIsPending = { value: false };

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock('@/hooks/useAdminFeed', () => ({
  useCreateFeedItem: () => ({
    mutateAsync: mockMutateAsync,
    isPending: mockIsPending.value,
  }),
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
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

vi.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left" />,
  Loader2: ({ className }: { className?: string }) => (
    <span data-testid="loader" className={className} />
  ),
}));

import NewFeedItemPage from '@/app/(dashboard)/feed/new/page';

describe('NewFeedItemPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsPending.value = false;
    window.alert = vi.fn();
  });

  it('renders the Add Feed Item heading', () => {
    render(<NewFeedItemPage />);
    expect(screen.getByText('Add Feed Item')).toBeInTheDocument();
  });

  it('renders back link to /feed', () => {
    render(<NewFeedItemPage />);
    const links = screen.getAllByRole('link');
    const backLink = links.find((l) => l.getAttribute('href') === '/feed');
    expect(backLink).toBeTruthy();
  });

  it('renders Feed Type selector with default "update"', () => {
    render(<NewFeedItemPage />);
    const select = screen.getAllByRole('combobox')[0];
    expect(select).toHaveValue('update');
  });

  it('does NOT show Content Type selector for "update" (single option)', () => {
    render(<NewFeedItemPage />);
    // "update" type has only 1 content type — the select is hidden (contentTypes.length > 1 is false)
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(1);
  });

  it('shows Content Type selector when feed type has multiple options (video)', () => {
    render(<NewFeedItemPage />);
    const feedTypeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(feedTypeSelect, { target: { value: 'video' } });
    // Video has 9 content types → selector appears
    const selects = screen.getAllByRole('combobox');
    expect(selects).toHaveLength(2);
  });

  it('does NOT show YouTube ID field for non-video type', () => {
    render(<NewFeedItemPage />);
    expect(screen.queryByPlaceholderText(/dQw4w9WgXcQ/i)).not.toBeInTheDocument();
  });

  it('shows YouTube ID field when feed type is video', () => {
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'video' } });
    expect(screen.getByPlaceholderText(/dQw4w9WgXcQ/i)).toBeInTheDocument();
  });

  it('shows Thumbnail URL field for non-video types', () => {
    render(<NewFeedItemPage />);
    expect(screen.getByPlaceholderText('Image URL')).toBeInTheDocument();
  });

  it('does NOT show Thumbnail URL field for video type', () => {
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'video' } });
    expect(screen.queryByPlaceholderText('Image URL')).not.toBeInTheDocument();
  });

  it('disables Create button when title is empty', () => {
    render(<NewFeedItemPage />);
    const btn = screen.getByRole('button', { name: /Create/i });
    expect(btn).toBeDisabled();
  });

  it('enables Create button when title is filled', () => {
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'My Title' } });
    const btn = screen.getByRole('button', { name: /Create/i });
    expect(btn).not.toBeDisabled();
  });

  it('submits with correct payload for update type', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'Hello' } });
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          feed_type: 'update',
          content_type: 'update',
          title: 'Hello',
          description: null,
          youtube_id: null,
          thumbnail_url: null,
          is_pinned: false,
          is_featured: false,
        }),
      );
    });
  });

  it('submits with description as null when empty', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'Test' } });
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
    });
  });

  it('auto-generates thumbnail_url from youtubeId when thumbnailUrl is blank', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<NewFeedItemPage />);
    // Switch to video type
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'video' } });
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText(/dQw4w9WgXcQ/i), { target: { value: 'abc123' } });
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnail_url: 'https://img.youtube.com/vi/abc123/hqdefault.jpg',
        }),
      );
    });
  });

  it('navigates to /feed after successful creation', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'Test' } });
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/feed');
    });
  });

  it('shows alert on submission error', async () => {
    mockMutateAsync.mockRejectedValue(new Error('Server error'));
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'Test' } });
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Server error');
    });
  });

  it('toggles isPinned checkbox', () => {
    render(<NewFeedItemPage />);
    const checkbox = screen.getByLabelText('Pin to top');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('toggles isFeatured checkbox', () => {
    render(<NewFeedItemPage />);
    const checkbox = screen.getByLabelText('Featured');
    expect(checkbox).not.toBeChecked();
    fireEvent.click(checkbox);
    expect(checkbox).toBeChecked();
  });

  it('resets content type to first option when feed type changes', () => {
    render(<NewFeedItemPage />);
    const feedTypeSelect = screen.getAllByRole('combobox')[0];
    // Switch to video
    fireEvent.change(feedTypeSelect, { target: { value: 'video' } });
    const selects = screen.getAllByRole('combobox');
    // content type select should default to 'trailer' (first for video)
    expect(selects[1]).toHaveValue('trailer');
    // Switch back to update
    fireEvent.change(feedTypeSelect, { target: { value: 'update' } });
    // content type select disappears (single option)
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('shows "Operation failed" alert when error has no message', async () => {
    mockMutateAsync.mockRejectedValue({ message: '' });
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'Test' } });
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('Operation failed');
    });
  });

  it('disables Create button when isPending is true', () => {
    mockIsPending.value = true;
    render(<NewFeedItemPage />);
    const btn = screen.getByRole('button', { name: /Create/i });
    expect(btn).toBeDisabled();
    // Also the Loader2 spinner should appear
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('shows poster content type correctly (single option, no Content Type selector)', () => {
    render(<NewFeedItemPage />);
    const feedTypeSelect = screen.getAllByRole('combobox')[0];
    fireEvent.change(feedTypeSelect, { target: { value: 'poster' } });
    // Poster has only 1 content type → selector hidden
    expect(screen.getAllByRole('combobox')).toHaveLength(1);
  });

  it('submits thumbnailUrl for non-video type when provided', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Image URL'), {
      target: { value: 'https://example.com/thumb.jpg' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          thumbnail_url: 'https://example.com/thumb.jpg',
        }),
      );
    });
  });

  it('submits with selected content type for video type', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<NewFeedItemPage />);
    // Switch to video
    fireEvent.change(screen.getAllByRole('combobox')[0], { target: { value: 'video' } });
    // Change content type to 'teaser'
    const contentTypeSelect = screen.getAllByRole('combobox')[1];
    fireEvent.change(contentTypeSelect, { target: { value: 'teaser' } });

    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'Test' } });
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          feed_type: 'video',
          content_type: 'teaser',
        }),
      );
    });
  });

  it('submits description when provided', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByPlaceholderText('Optional description'), {
      target: { value: 'A description' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ description: 'A description' }),
      );
    });
  });

  it('passes isPinned=true when pinned checkbox checked', async () => {
    mockMutateAsync.mockResolvedValue({});
    render(<NewFeedItemPage />);
    fireEvent.change(screen.getByPlaceholderText('Enter title'), {
      target: { value: 'Pinned Post' },
    });
    fireEvent.click(screen.getByLabelText('Pin to top'));
    fireEvent.submit(screen.getByRole('button', { name: /Create/i }).closest('form')!);
    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(expect.objectContaining({ is_pinned: true }));
    });
  });
});
