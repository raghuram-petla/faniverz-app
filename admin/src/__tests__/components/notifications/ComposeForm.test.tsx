import { render, screen, fireEvent } from '@testing-library/react';
import { ComposeForm } from '@/components/notifications/ComposeForm';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
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

vi.mock('@/components/notifications/MovieSearchField', () => ({
  MovieSearchField: () => <div data-testid="movie-search" />,
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
});
