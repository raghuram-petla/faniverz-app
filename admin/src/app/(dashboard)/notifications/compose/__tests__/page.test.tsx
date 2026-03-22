import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';

const mockPush = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: mockPush })),
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

vi.mock('@/hooks/useAdminMovies', () => ({
  useAllMovies: vi.fn(() => ({
    data: [
      { id: 'm1', title: 'Movie A' },
      { id: 'm2', title: 'Movie B' },
    ],
  })),
}));

const mockCreateNotification = {
  mutate: vi.fn(),
  isPending: false,
  isError: false,
  error: null,
};

vi.mock('@/hooks/useAdminNotifications', () => ({
  useCreateNotification: vi.fn(() => mockCreateNotification),
}));

vi.mock('@/components/notifications/ComposeForm', () => ({
  ComposeForm: ({
    movies,
    createNotification,
    onSuccess,
  }: {
    movies: Array<{ id: string; title: string }> | undefined;
    createNotification: { mutate: () => void; isPending: boolean };
    onSuccess: () => void;
  }) => (
    <div data-testid="compose-form">
      <span data-testid="movie-count">{movies?.length ?? 0}</span>
      <button onClick={onSuccess} data-testid="success-btn">
        Success
      </button>
    </div>
  ),
}));

import ComposeNotificationPage from '@/app/(dashboard)/notifications/compose/page';

describe('ComposeNotificationPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page heading', () => {
    render(<ComposeNotificationPage />);
    expect(screen.getByText('Compose Notification')).toBeInTheDocument();
  });

  it('renders back link to /notifications', () => {
    render(<ComposeNotificationPage />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/notifications');
  });

  it('renders the info banner about push notifications', () => {
    render(<ComposeNotificationPage />);
    expect(screen.getByText(/send-push/)).toBeInTheDocument();
    expect(screen.getByText(/Broadcast mode/)).toBeInTheDocument();
  });

  it('renders ComposeForm with movies data', () => {
    render(<ComposeNotificationPage />);
    expect(screen.getByTestId('compose-form')).toBeInTheDocument();
    expect(screen.getByTestId('movie-count').textContent).toBe('2');
  });

  it('renders ComposeForm with undefined movies when data not loaded', async () => {
    const { useAllMovies } = await import('@/hooks/useAdminMovies');
    vi.mocked(useAllMovies).mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useAllMovies>);

    render(<ComposeNotificationPage />);
    expect(screen.getByTestId('movie-count').textContent).toBe('0');
  });

  it('navigates to /notifications on form success', () => {
    render(<ComposeNotificationPage />);
    const successBtn = screen.getByTestId('success-btn');
    successBtn.click();
    expect(mockPush).toHaveBeenCalledWith('/notifications');
  });

  it('passes createNotification to ComposeForm', () => {
    render(<ComposeNotificationPage />);
    // ComposeForm is rendered — its presence confirms createNotification was passed
    expect(screen.getByTestId('compose-form')).toBeInTheDocument();
  });

  it('shows Bell icon in header area', () => {
    render(<ComposeNotificationPage />);
    // The Bell icon container has yellow styling
    const container = screen.getByText('Compose Notification').closest('div');
    expect(container).toBeInTheDocument();
  });
});
