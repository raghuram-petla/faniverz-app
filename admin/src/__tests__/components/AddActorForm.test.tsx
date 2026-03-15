import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AddActorForm } from '@/components/cast/AddActorForm';

vi.mock('@/lib/supabase-browser', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { access_token: 'test-token' } },
      }),
    },
  },
}));

vi.mock('lucide-react', () => ({
  Loader2: (props: Record<string, unknown>) => <div data-testid="loader-icon" {...props} />,
  Upload: (props: Record<string, unknown>) => <div data-testid="upload-icon" {...props} />,
  X: (props: Record<string, unknown>) => <div data-testid="x-icon" {...props} />,
}));

const defaultProps = {
  onSubmit: vi.fn().mockResolvedValue(undefined),
  isPending: false,
  onCancel: vi.fn(),
};

function renderForm(overrides: Partial<typeof defaultProps> = {}) {
  const props = { ...defaultProps, ...overrides };
  return render(<AddActorForm {...props} />);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AddActorForm', () => {
  it('renders the Name input', () => {
    renderForm();
    expect(screen.getByPlaceholderText('Name *')).toBeInTheDocument();
  });

  it('renders the Person Type select with Actor and Technician options', () => {
    renderForm();
    expect(screen.getByText('Person Type')).toBeInTheDocument();
    const select = screen.getByDisplayValue('Actor');
    expect(select).toBeInTheDocument();
    expect(screen.getByText('Actor')).toBeInTheDocument();
    expect(screen.getByText('Technician')).toBeInTheDocument();
  });

  it('renders the Date of Birth input', () => {
    renderForm();
    expect(screen.getByText('Date of Birth')).toBeInTheDocument();
  });

  it('renders the Height input', () => {
    renderForm();
    expect(screen.getByText('Height (cm)')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('e.g. 178')).toBeInTheDocument();
  });

  it('renders the Photo upload button', () => {
    renderForm();
    expect(screen.getByText('Photo (optional)')).toBeInTheDocument();
  });

  it('renders the Add button', () => {
    renderForm();
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('renders the Cancel button', () => {
    renderForm();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn();
    renderForm({ onCancel });
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onSubmit with correct data when form is filled and Add is clicked', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    fireEvent.change(screen.getByPlaceholderText('Name *'), {
      target: { value: 'Mahesh Babu' },
    });

    fireEvent.change(screen.getByDisplayValue('Actor'), {
      target: { value: 'technician' },
    });

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '1975-08-09' } });

    fireEvent.change(screen.getByPlaceholderText('e.g. 178'), {
      target: { value: '178' },
    });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Mahesh Babu',
        photo_url: null,
        birth_date: '1975-08-09',
        person_type: 'technician',
        height_cm: 178,
      });
    });
  });

  it('shows "Adding..." when isPending is true', () => {
    renderForm({ isPending: true });
    expect(screen.getByText('Adding...')).toBeInTheDocument();
    expect(screen.queryByText('Add')).not.toBeInTheDocument();
  });

  it('disables the Add button when isPending is true', () => {
    renderForm({ isPending: true });
    expect(screen.getByText('Adding...')).toBeDisabled();
  });

  it('does not call onSubmit if name is empty', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('does not call onSubmit if name is only whitespace', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    fireEvent.change(screen.getByPlaceholderText('Name *'), {
      target: { value: '   ' },
    });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled();
    });
  });

  it('resets form after successful submit', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    const nameInput = screen.getByPlaceholderText('Name *');
    fireEvent.change(nameInput, { target: { value: 'Prabhas' } });
    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(nameInput).toHaveValue('');
  });

  it('sends null for optional fields when not filled', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    renderForm({ onSubmit });

    fireEvent.change(screen.getByPlaceholderText('Name *'), {
      target: { value: 'Allu Arjun' },
    });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        name: 'Allu Arjun',
        photo_url: null,
        birth_date: null,
        person_type: 'actor',
        height_cm: null,
      });
    });
  });
});
