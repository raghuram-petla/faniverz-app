import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

vi.mock('@/lib/youtube', () => ({
  extractYouTubeId: vi.fn((input: string) => {
    if (!input) return null;
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    const match = input.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    return match ? match[1] : null;
  }),
  getYouTubeThumbnail: vi.fn(
    (id: string, quality = 'hqdefault') => `https://img.youtube.com/vi/${id}/${quality}.jpg`,
  ),
}));

vi.mock('@shared/constants', () => ({
  VIDEO_TYPES: [
    { value: 'trailer', label: 'Trailer' },
    { value: 'teaser', label: 'Teaser' },
    { value: 'clip', label: 'Clip' },
  ],
}));

vi.mock('@/components/common/FormField', () => ({
  FormInput: ({
    label,
    value,
    onValueChange,
    placeholder,
    type,
    required,
  }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    placeholder?: string;
    type?: string;
    required?: boolean;
  }) => (
    <div>
      <label>{label}</label>
      <input
        type={type || 'text'}
        value={value}
        placeholder={placeholder}
        required={required}
        onChange={(e) => onValueChange(e.target.value)}
      />
    </div>
  ),
  FormSelect: ({
    label,
    value,
    onValueChange,
    options,
  }: {
    label: string;
    value: string;
    onValueChange: (v: string) => void;
    options: { value: string; label: string }[];
  }) => (
    <div>
      <label>{label}</label>
      <select value={value} onChange={(e) => onValueChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  ),
}));

vi.mock('@/components/common/Button', () => ({
  Button: ({
    children,
    onClick,
    type,
    disabled,
    'aria-label': ariaLabel,
  }: {
    children?: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    disabled?: boolean;
    'aria-label'?: string;
  }) => (
    <button type={type || 'button'} onClick={onClick} disabled={disabled} aria-label={ariaLabel}>
      {children}
    </button>
  ),
}));

import { VideosSection } from '@/components/movie-edit/VideosSection';
import type { MovieVideo } from '@/lib/types';

function makeVideo(overrides: Partial<MovieVideo> = {}): MovieVideo {
  return {
    id: 'vid-1',
    movie_id: 'movie-1',
    youtube_id: 'dQw4w9WgXcQ',
    title: 'Official Trailer',
    video_type: 'trailer',
    description: null,
    video_date: null,
    display_order: 0,
    created_at: '2025-01-01T00:00:00Z',
    ...overrides,
  };
}

function makeProps(overrides: Partial<React.ComponentProps<typeof VideosSection>> = {}) {
  return {
    visibleVideos: [],
    onAdd: vi.fn(),
    onRemove: vi.fn(),
    showAddForm: false,
    onCloseAddForm: vi.fn(),
    pendingIds: new Set<string>(),
    ...overrides,
  };
}

describe('VideosSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.alert = vi.fn();
  });

  describe('empty state', () => {
    it('renders nothing when no videos and no form', () => {
      const { container } = render(<VideosSection {...makeProps()} />);
      expect(container.querySelector('.grid')).not.toBeInTheDocument();
    });
  });

  describe('video list', () => {
    it('renders video cards for visible videos', () => {
      const video = makeVideo();
      render(<VideosSection {...makeProps({ visibleVideos: [video] })} />);
      expect(screen.getByText('Official Trailer')).toBeInTheDocument();
    });

    it('shows video type label', () => {
      render(<VideosSection {...makeProps({ visibleVideos: [makeVideo()] })} />);
      expect(screen.getByText('Trailer')).toBeInTheDocument();
    });

    it('shows video_date when present', () => {
      const video = makeVideo({ video_date: '2025-01-15' });
      render(<VideosSection {...makeProps({ visibleVideos: [video] })} />);
      expect(screen.getByText('2025-01-15')).toBeInTheDocument();
    });

    it('calls onRemove with correct id and isPending=false for DB videos', () => {
      const onRemove = vi.fn();
      const video = makeVideo({ id: 'vid-db-1' });
      render(
        <VideosSection
          {...makeProps({ visibleVideos: [video], onRemove, pendingIds: new Set() })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Remove Official Trailer/i }));
      expect(onRemove).toHaveBeenCalledWith('vid-db-1', false);
    });

    it('calls onRemove with isPending=true for pending videos', () => {
      const onRemove = vi.fn();
      const pendingId = 'pending-uuid-1';
      const video = makeVideo({ id: pendingId });
      render(
        <VideosSection
          {...makeProps({
            visibleVideos: [video],
            onRemove,
            pendingIds: new Set([pendingId]),
          })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: /Remove Official Trailer/i }));
      expect(onRemove).toHaveBeenCalledWith(pendingId, true);
    });
  });
});

describe('add form', () => {
  it('renders form when showAddForm is true', () => {
    render(<VideosSection {...makeProps({ showAddForm: true })} />);
    expect(screen.getByPlaceholderText(/youtube\.com/i)).toBeInTheDocument();
  });

  it('calls onAdd with extracted youtubeId on valid submission', () => {
    const onAdd = vi.fn();
    render(<VideosSection {...makeProps({ showAddForm: true, onAdd })} />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'dQw4w9WgXcQ' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Official Trailer'), {
      target: { value: 'My Trailer' },
    });
    fireEvent.submit(document.querySelector('form')!);
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({
        youtube_id: 'dQw4w9WgXcQ',
        title: 'My Trailer',
        video_type: 'trailer',
      }),
    );
  });

  it('calls alert when youtube input is invalid', () => {
    render(<VideosSection {...makeProps({ showAddForm: true })} />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'not-a-youtube-url' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Official Trailer'), {
      target: { value: 'Trailer' },
    });
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining('Invalid YouTube URL'));
  });

  it('calls onCloseAddForm when Cancel is clicked', () => {
    const onCloseAddForm = vi.fn();
    render(<VideosSection {...makeProps({ showAddForm: true, onCloseAddForm })} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCloseAddForm).toHaveBeenCalled();
  });

  it('sets description to null when empty', () => {
    const onAdd = vi.fn();
    render(<VideosSection {...makeProps({ showAddForm: true, onAdd })} />);
    fireEvent.change(screen.getByPlaceholderText(/youtube\.com/i), {
      target: { value: 'dQw4w9WgXcQ' },
    });
    fireEvent.change(screen.getByPlaceholderText('e.g. Official Trailer'), {
      target: { value: 'Trailer' },
    });
    fireEvent.submit(document.querySelector('form')!);
    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });
});
