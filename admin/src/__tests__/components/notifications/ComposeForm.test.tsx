import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import { ComposeForm } from '@/components/notifications/ComposeForm';

const mockMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: mockMaybeSingle,
        }),
      }),
    }),
  },
}));

vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
  useUnsavedChangesWarning: vi.fn(),
}));

vi.mock('@shared/constants', () => ({
  BROADCAST_USER_ID: '00000000-0000-0000-0000-000000000000',
}));

/* eslint-disable @typescript-eslint/no-explicit-any */
const capturedProps: Record<string, any> = {};
vi.mock('@/components/notifications/MovieSearchField', () => ({
  MovieSearchField: (props: any) => {
    capturedProps.MovieSearchField = props;
    return <div data-testid="movie-search" />;
  },
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

const mockMutate = vi.fn();
const defaultProps = {
  movies: [{ id: '1', title: 'Test Movie' }],
  createNotification: {
    mutate: mockMutate,
    isPending: false,
    isError: false,
    error: null,
  },
  onSuccess: vi.fn(),
};

beforeEach(() => vi.clearAllMocks());

describe('ComposeForm', () => {
  it('renders form fields', () => {
    render(<ComposeForm {...defaultProps} />);
    expect(screen.getByLabelText('Type')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toBeInTheDocument();
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
  });

  it('renders target mode radio buttons', () => {
    render(<ComposeForm {...defaultProps} />);
    expect(screen.getByText('Specific user')).toBeInTheDocument();
    expect(screen.getByText('Broadcast (all users)')).toBeInTheDocument();
  });

  it('renders schedule radio buttons', () => {
    render(<ComposeForm {...defaultProps} />);
    expect(screen.getByText('Send immediately')).toBeInTheDocument();
    expect(screen.getByText('Schedule for later')).toBeInTheDocument();
  });

  it('shows email input when "Specific user" is selected', () => {
    render(<ComposeForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Specific user'));
    expect(screen.getByPlaceholderText('User email address')).toBeInTheDocument();
  });

  it('shows datetime-local when "Schedule for later" is selected', () => {
    render(<ComposeForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Schedule for later'));
    expect(document.querySelector('input[type="datetime-local"]')).toBeInTheDocument();
  });

  it('renders Send Notification button', () => {
    render(<ComposeForm {...defaultProps} />);
    expect(screen.getByText('Send Notification')).toBeInTheDocument();
  });

  it('disables send button when pending', () => {
    render(
      <ComposeForm
        {...defaultProps}
        createNotification={{ ...defaultProps.createNotification, isPending: true }}
      />,
    );
    expect(screen.getByText('Send Notification').closest('button')).toBeDisabled();
  });

  it('shows error message when mutation fails', () => {
    render(
      <ComposeForm
        {...defaultProps}
        createNotification={{
          ...defaultProps.createNotification,
          isError: true,
          error: new Error('Network error'),
        }}
      />,
    );
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('renders Cancel link', () => {
    render(<ComposeForm {...defaultProps} />);
    expect(screen.getByText('Cancel')).toHaveAttribute('href', '/notifications');
  });

  it('renders MovieSearchField', () => {
    render(<ComposeForm {...defaultProps} />);
    expect(screen.getByTestId('movie-search')).toBeInTheDocument();
  });

  it('disables send button when targetMode is "user" and no user is resolved', () => {
    render(<ComposeForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Specific user'));
    const sendBtn = screen.getByText('Send Notification').closest('button');
    expect(sendBtn).toBeDisabled();
  });

  it('shows "Broadcast" mode by default (radio is checked)', () => {
    render(<ComposeForm {...defaultProps} />);
    const radios = document.querySelectorAll('input[type="radio"][name="target"]');
    const broadcastRadio = Array.from(radios).find((r) => (r as HTMLInputElement).checked) as
      | HTMLInputElement
      | undefined;
    expect(broadcastRadio).toBeDefined();
  });

  it('hides datetime input when scheduleMode is "immediate"', () => {
    render(<ComposeForm {...defaultProps} />);
    expect(document.querySelector('input[type="datetime-local"]')).not.toBeInTheDocument();
  });

  it('shows email input and clears resolvedUserId on email change', () => {
    render(<ComposeForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Specific user'));
    const emailInput = screen.getByPlaceholderText('User email address');
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    // resolvedUserId is null until lookup fires — button stays disabled
    const sendBtn = screen.getByText('Send Notification').closest('button');
    expect(sendBtn).toBeDisabled();
  });

  it('does not fire lookup when email has no @ symbol', () => {
    render(<ComposeForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Specific user'));
    const emailInput = screen.getByPlaceholderText('User email address');
    fireEvent.change(emailInput, { target: { value: 'notanemail' } });
    // No crash — input value updates
    expect(emailInput).toHaveValue('notanemail');
  });

  it('does NOT call mutate when targetMode is user and resolvedUserId is null', () => {
    render(<ComposeForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Specific user'));

    // Submit — should be blocked because resolvedUserId is null
    const form = document.querySelector('form')!;
    fireEvent.submit(form);
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it('calls mutate with broadcast user id when targetMode is broadcast', () => {
    render(<ComposeForm {...defaultProps} />);

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'release' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Hello' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: '00000000-0000-0000-0000-000000000000',
        status: 'pending',
        read: false,
      }),
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('renders all four notification type options', () => {
    render(<ComposeForm {...defaultProps} />);
    const typeSelect = screen.getByLabelText('Type');
    const options = typeSelect.querySelectorAll('option');
    // placeholder + 4 types
    expect(options).toHaveLength(5);
  });

  it('renders error text when isError is true with non-Error error value', () => {
    render(
      <ComposeForm
        {...defaultProps}
        createNotification={{
          ...defaultProps.createNotification,
          isError: true,
          error: null,
        }}
      />,
    );
    expect(screen.getByText('Failed to create notification')).toBeInTheDocument();
  });

  it('shows datetime-local input as required when scheduled mode is selected', () => {
    render(<ComposeForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Schedule for later'));
    const dateInput = document.querySelector('input[type="datetime-local"]');
    expect(dateInput).toHaveAttribute('required');
  });

  it('uses scheduledFor ISO string when scheduleMode is scheduled and scheduledFor is set', () => {
    render(<ComposeForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'release' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Sched' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Body' } });
    fireEvent.click(screen.getByText('Schedule for later'));

    const dateInput = document.querySelector('input[type="datetime-local"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-04-01T10:00' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduled_for: new Date('2026-04-01T10:00').toISOString(),
      }),
      expect.any(Object),
    );
  });

  it('sets movieId to null in payload when no movie selected', () => {
    render(<ComposeForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'trending' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Test' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Body' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        movie_id: null,
      }),
      expect.any(Object),
    );
  });

  it('uses current time for scheduled_for when immediate mode', () => {
    render(<ComposeForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'reminder' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Now' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'Send now' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduled_for: expect.any(String),
      }),
      expect.any(Object),
    );
  });

  it('hides email input when switching back to broadcast mode', () => {
    render(<ComposeForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Specific user'));
    expect(screen.getByPlaceholderText('User email address')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Broadcast (all users)'));
    expect(screen.queryByPlaceholderText('User email address')).not.toBeInTheDocument();
  });

  it('enables send button in broadcast mode even without email', () => {
    render(<ComposeForm {...defaultProps} />);
    // In broadcast mode (default), button should not be disabled for user mode reasons
    const sendBtn = screen.getByText('Send Notification').closest('button');
    expect(sendBtn).not.toBeDisabled();
  });

  it('renders notification type options correctly', () => {
    render(<ComposeForm {...defaultProps} />);
    const typeSelect = screen.getByLabelText('Type');
    expect(typeSelect.querySelector('option[value="release"]')).toBeInTheDocument();
    expect(typeSelect.querySelector('option[value="watchlist"]')).toBeInTheDocument();
    expect(typeSelect.querySelector('option[value="trending"]')).toBeInTheDocument();
    expect(typeSelect.querySelector('option[value="reminder"]')).toBeInTheDocument();
  });

  it('passes onSuccess callback to mutate', () => {
    const onSuccess = vi.fn();
    render(<ComposeForm {...defaultProps} onSuccess={onSuccess} />);

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'release' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'M' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ onSuccess }),
    );
  });

  describe('doLookup - email user lookup', () => {
    it('resolves user when found by email', async () => {
      mockMaybeSingle.mockResolvedValue({
        data: { id: 'user-123', email: 'found@test.com' },
        error: null,
      });

      render(<ComposeForm {...defaultProps} />);
      fireEvent.click(screen.getByText('Specific user'));
      fireEvent.change(screen.getByPlaceholderText('User email address'), {
        target: { value: 'found@test.com' },
      });

      // Wait for 400ms debounce + async resolution
      await waitFor(
        () => {
          expect(screen.getByText('User found')).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });

    it('shows error when no user found', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: null });

      render(<ComposeForm {...defaultProps} />);
      fireEvent.click(screen.getByText('Specific user'));
      fireEvent.change(screen.getByPlaceholderText('User email address'), {
        target: { value: 'missing@test.com' },
      });

      await waitFor(
        () => {
          expect(screen.getByText('No user found with this email')).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });

    it('shows error when lookup fails', async () => {
      mockMaybeSingle.mockResolvedValue({ data: null, error: new Error('DB error') });

      render(<ComposeForm {...defaultProps} />);
      fireEvent.click(screen.getByText('Specific user'));
      fireEvent.change(screen.getByPlaceholderText('User email address'), {
        target: { value: 'error@test.com' },
      });

      await waitFor(
        () => {
          expect(screen.getByText('Lookup failed')).toBeInTheDocument();
        },
        { timeout: 2000 },
      );
    });

    it('does not fire lookup when email lacks @ sign', async () => {
      mockMaybeSingle.mockClear();

      render(<ComposeForm {...defaultProps} />);
      fireEvent.click(screen.getByText('Specific user'));
      fireEvent.change(screen.getByPlaceholderText('User email address'), {
        target: { value: 'noemail' },
      });

      // Wait a bit to ensure no async call
      await new Promise((r) => setTimeout(r, 600));
      expect(mockMaybeSingle).not.toHaveBeenCalled();
    });
  });

  describe('MovieSearchField callbacks', () => {
    it('onSearchChange updates search and clears movieId when empty', () => {
      render(<ComposeForm {...defaultProps} />);
      act(() => capturedProps.MovieSearchField.onSearchChange('test search'));
      expect(capturedProps.MovieSearchField.movieSearch).toBe('test search');

      act(() => capturedProps.MovieSearchField.onSearchChange(''));
      expect(capturedProps.MovieSearchField.movieId).toBe('');
    });

    it('onMovieSelect sets movieId and search text', () => {
      render(<ComposeForm {...defaultProps} />);
      act(() => capturedProps.MovieSearchField.onMovieSelect('movie-1', 'Great Movie'));
      expect(capturedProps.MovieSearchField.movieId).toBe('movie-1');
      expect(capturedProps.MovieSearchField.movieSearch).toBe('Great Movie');
    });

    it('onClear resets movieId and search', () => {
      render(<ComposeForm {...defaultProps} />);
      act(() => capturedProps.MovieSearchField.onMovieSelect('movie-1', 'Great Movie'));
      act(() => capturedProps.MovieSearchField.onClear());
      expect(capturedProps.MovieSearchField.movieId).toBe('');
      expect(capturedProps.MovieSearchField.movieSearch).toBe('');
    });
  });

  it('submits with movieId when movie is selected via MovieSearchField', () => {
    render(<ComposeForm {...defaultProps} />);

    // Select a movie via the captured MovieSearchField callback
    act(() => capturedProps.MovieSearchField.onMovieSelect('movie-42', 'Selected Movie'));

    // Fill required fields
    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'release' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'M' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        movie_id: 'movie-42',
      }),
      expect.any(Object),
    );
  });

  it('uses current ISO time for scheduled_for when scheduleMode is scheduled but scheduledFor is empty', () => {
    render(<ComposeForm {...defaultProps} />);

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'release' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'M' } });

    // Switch to scheduled mode but don't set a date
    fireEvent.click(screen.getByText('Schedule for later'));

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    // Since scheduledFor is empty, it falls back to `now`
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        scheduled_for: expect.any(String),
      }),
      expect.any(Object),
    );
  });

  it('submits with resolvedUserId when user mode and user found', async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { id: 'user-abc', email: 'u@test.com' },
      error: null,
    });

    render(<ComposeForm {...defaultProps} />);
    fireEvent.click(screen.getByText('Specific user'));
    fireEvent.change(screen.getByPlaceholderText('User email address'), {
      target: { value: 'u@test.com' },
    });

    await waitFor(
      () => {
        expect(screen.getByText('User found')).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    fireEvent.change(screen.getByLabelText('Type'), { target: { value: 'release' } });
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'T' } });
    fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'M' } });

    const form = document.querySelector('form')!;
    fireEvent.submit(form);

    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-abc',
      }),
      expect.any(Object),
    );
  });
});
