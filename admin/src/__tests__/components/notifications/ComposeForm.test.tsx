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
});
