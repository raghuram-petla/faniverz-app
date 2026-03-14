import { render, screen, fireEvent } from '@testing-library/react';
import { TheatricalRunsSection } from '@/components/movie-edit/TheatricalRunsSection';

const mockRuns = [
  {
    id: 'run-1',
    movie_id: 'm1',
    release_date: '2026-01-15',
    end_date: '2026-03-10',
    label: null,
    created_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'run-2',
    movie_id: 'm1',
    release_date: '2026-04-01',
    end_date: null,
    label: 'Re-release',
    created_at: '2026-04-01T00:00:00Z',
  },
];

const defaultProps = {
  visibleRuns: [],
  onAdd: vi.fn(),
  onRemove: vi.fn(),
};

describe('TheatricalRunsSection', () => {
  it('renders description text', () => {
    render(<TheatricalRunsSection {...defaultProps} />);
    expect(screen.getByText(/Track original release/)).toBeInTheDocument();
  });

  it('renders the add form', () => {
    render(<TheatricalRunsSection {...defaultProps} />);
    expect(screen.getByText('Add Theatrical Run')).toBeInTheDocument();
    expect(screen.getByText(/Release Date/)).toBeInTheDocument();
    expect(screen.getByText(/Label/)).toBeInTheDocument();
  });

  it('renders runs with release_date and end_date', () => {
    render(<TheatricalRunsSection {...defaultProps} visibleRuns={mockRuns} />);
    expect(screen.getByText('2026-01-15')).toBeInTheDocument();
    expect(screen.getByText('2026-03-10')).toBeInTheDocument();
  });

  it('shows "Now" badge for active runs (no end_date)', () => {
    render(<TheatricalRunsSection {...defaultProps} visibleRuns={mockRuns} />);
    expect(screen.getByText('Now')).toBeInTheDocument();
  });

  it('shows "Original" badge when label is null', () => {
    render(<TheatricalRunsSection {...defaultProps} visibleRuns={mockRuns} />);
    expect(screen.getByText('Original')).toBeInTheDocument();
  });

  it('shows label badge when label is set', () => {
    render(<TheatricalRunsSection {...defaultProps} visibleRuns={mockRuns} />);
    expect(screen.getByText('Re-release')).toBeInTheDocument();
  });

  it('calls onRemove with correct args for DB row', () => {
    const onRemove = vi.fn();
    render(<TheatricalRunsSection {...defaultProps} visibleRuns={mockRuns} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Remove run 2026-01-15'));
    expect(onRemove).toHaveBeenCalledWith('run-1', false);
  });

  it('calls onRemove with isPending=true for pending rows', () => {
    const pendingRun = {
      ...mockRuns[0],
      id: 'pending-run-1',
    };
    const onRemove = vi.fn();
    render(
      <TheatricalRunsSection {...defaultProps} visibleRuns={[pendingRun]} onRemove={onRemove} />,
    );
    fireEvent.click(screen.getByLabelText('Remove run 2026-01-15'));
    expect(onRemove).toHaveBeenCalledWith('pending-run-1', true);
  });

  it('calls onAdd when form is submitted', () => {
    const onAdd = vi.fn();
    render(<TheatricalRunsSection {...defaultProps} onAdd={onAdd} />);

    // FormInput renders <label>text</label><input> without htmlFor — select date input by type
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } });

    fireEvent.click(screen.getByText('Add Run'));
    expect(onAdd).toHaveBeenCalledWith({ release_date: '2026-06-01', label: null });
  });

  it('does not call onAdd when release_date is empty', () => {
    const onAdd = vi.fn();
    render(<TheatricalRunsSection {...defaultProps} onAdd={onAdd} />);
    fireEvent.click(screen.getByText('Add Run'));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('resets form after successful add', () => {
    const onAdd = vi.fn();
    render(<TheatricalRunsSection {...defaultProps} onAdd={onAdd} />);

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } });
    fireEvent.click(screen.getByText('Add Run'));

    expect(dateInput.value).toBe('');
  });
});
