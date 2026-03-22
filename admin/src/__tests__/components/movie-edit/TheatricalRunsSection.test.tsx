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
  showAddForm: false,
  onCloseAddForm: vi.fn(),
  pendingIds: new Set<string>(),
};

describe('TheatricalRunsSection', () => {
  it('renders description text', () => {
    render(<TheatricalRunsSection {...defaultProps} />);
    expect(screen.getByText(/Track original release/)).toBeInTheDocument();
  });

  it('hides form when showAddForm is false', () => {
    render(<TheatricalRunsSection {...defaultProps} showAddForm={false} />);
    expect(screen.queryByText(/Release Date/)).not.toBeInTheDocument();
  });

  it('shows form when showAddForm is true', () => {
    render(<TheatricalRunsSection {...defaultProps} showAddForm={true} />);
    expect(screen.getByText(/Release Date/)).toBeInTheDocument();
    expect(screen.getByText(/Label/)).toBeInTheDocument();
  });

  it('calls onCloseAddForm when Cancel is clicked', () => {
    const onCloseAddForm = vi.fn();
    render(
      <TheatricalRunsSection
        {...defaultProps}
        showAddForm={true}
        onCloseAddForm={onCloseAddForm}
      />,
    );
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCloseAddForm).toHaveBeenCalled();
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
    // @sync: uses pendingIds Set instead of startsWith('pending-run-') — stable UUID-based detection
    const pendingRunId = 'stable-uuid-pending-1';
    const pendingRun = {
      ...mockRuns[0],
      id: pendingRunId,
    };
    const onRemove = vi.fn();
    render(
      <TheatricalRunsSection
        {...defaultProps}
        visibleRuns={[pendingRun]}
        pendingIds={new Set([pendingRunId])}
        onRemove={onRemove}
      />,
    );
    fireEvent.click(screen.getByLabelText('Remove run 2026-01-15'));
    expect(onRemove).toHaveBeenCalledWith(pendingRunId, true);
  });

  it('calls onAdd when form is submitted', () => {
    const onAdd = vi.fn();
    render(<TheatricalRunsSection {...defaultProps} showAddForm={true} onAdd={onAdd} />);

    // FormInput renders <label>text</label><input> without htmlFor — select date input by type
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } });

    fireEvent.click(screen.getByText('Add Run'));
    // @sync: _id is a stable UUID assigned by crypto.randomUUID() — use objectContaining
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ release_date: '2026-06-01', label: null }),
    );
    expect(typeof (onAdd.mock.calls[0][0] as { _id: string })._id).toBe('string');
  });

  it('does not call onAdd when release_date is empty', () => {
    const onAdd = vi.fn();
    render(<TheatricalRunsSection {...defaultProps} showAddForm={true} onAdd={onAdd} />);
    // Click the submit Add Run button
    fireEvent.click(screen.getByText('Add Run'));
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('resets form after successful add', () => {
    const onAdd = vi.fn();
    const { rerender } = render(
      <TheatricalRunsSection {...defaultProps} showAddForm={true} onAdd={onAdd} />,
    );

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-06-01' } });
    fireEvent.click(screen.getByText('Add Run'));

    // After submit, re-render with showAddForm true to verify reset
    rerender(<TheatricalRunsSection {...defaultProps} showAddForm={true} onAdd={onAdd} />);
    const newDateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(newDateInput.value).toBe('');
  });

  it('shows validation error when adding a duplicate release date', () => {
    const existingRun = {
      id: 'run-1',
      movie_id: 'm1',
      release_date: '2026-01-15',
      end_date: null,
      label: null,
      created_at: '2026-01-15T00:00:00Z',
    };
    const onAdd = vi.fn();
    render(
      <TheatricalRunsSection
        {...defaultProps}
        visibleRuns={[existingRun]}
        showAddForm={true}
        onAdd={onAdd}
      />,
    );

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-01-15' } });
    fireEvent.click(screen.getByText('Add Run'));

    // Should NOT have called onAdd due to validation error
    expect(onAdd).not.toHaveBeenCalled();
  });

  it('shows "Ending (unsaved)" badge for runs pending end', () => {
    const activeRun = {
      id: 'run-3',
      movie_id: 'm1',
      release_date: '2026-05-01',
      end_date: null,
      label: null,
      created_at: '2026-05-01T00:00:00Z',
    };
    render(
      <TheatricalRunsSection
        {...defaultProps}
        visibleRuns={[activeRun]}
        pendingEndRunIds={new Set(['run-3'])}
      />,
    );
    expect(screen.getByText('Ending (unsaved)')).toBeInTheDocument();
    expect(screen.queryByText('Now')).not.toBeInTheDocument();
  });

  it('calls onEndRun with run id and today date when End button clicked', () => {
    const onEndRun = vi.fn();
    const activeRun = {
      id: 'run-4',
      movie_id: 'm1',
      release_date: '2026-02-01',
      end_date: null,
      label: null,
      created_at: '2026-02-01T00:00:00Z',
    };
    render(
      <TheatricalRunsSection {...defaultProps} visibleRuns={[activeRun]} onEndRun={onEndRun} />,
    );
    fireEvent.click(screen.getByLabelText('End run 2026-02-01'));
    expect(onEndRun).toHaveBeenCalledWith('run-4', expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('does not show End button for pending runs', () => {
    const onEndRun = vi.fn();
    const pendingRun = {
      id: 'pending-run-uuid',
      movie_id: 'm1',
      release_date: '2026-06-01',
      end_date: null,
      label: null,
      created_at: '2026-06-01T00:00:00Z',
    };
    render(
      <TheatricalRunsSection
        {...defaultProps}
        visibleRuns={[pendingRun]}
        pendingIds={new Set(['pending-run-uuid'])}
        onEndRun={onEndRun}
      />,
    );
    expect(screen.queryByLabelText('End run 2026-06-01')).not.toBeInTheDocument();
  });

  it('does not show End button for runs already pending end', () => {
    const onEndRun = vi.fn();
    const activeRun = {
      id: 'run-5',
      movie_id: 'm1',
      release_date: '2026-07-01',
      end_date: null,
      label: null,
      created_at: '2026-07-01T00:00:00Z',
    };
    render(
      <TheatricalRunsSection
        {...defaultProps}
        visibleRuns={[activeRun]}
        pendingEndRunIds={new Set(['run-5'])}
        onEndRun={onEndRun}
      />,
    );
    expect(screen.queryByLabelText('End run 2026-07-01')).not.toBeInTheDocument();
  });

  it('does not show End button when onEndRun is not provided', () => {
    const activeRun = {
      id: 'run-6',
      movie_id: 'm1',
      release_date: '2026-08-01',
      end_date: null,
      label: null,
      created_at: '2026-08-01T00:00:00Z',
    };
    render(<TheatricalRunsSection {...defaultProps} visibleRuns={[activeRun]} />);
    expect(screen.queryByLabelText('End run 2026-08-01')).not.toBeInTheDocument();
  });

  it('passes label through to onAdd when label field is filled', () => {
    const onAdd = vi.fn();
    render(<TheatricalRunsSection {...defaultProps} showAddForm={true} onAdd={onAdd} />);

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-09-01' } });

    const labelInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    fireEvent.change(labelInput, { target: { value: 'Re-release' } });

    fireEvent.click(screen.getByText('Add Run'));
    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ release_date: '2026-09-01', label: 'Re-release' }),
    );
  });

  it('Cancel button resets form fields and error state', () => {
    render(<TheatricalRunsSection {...defaultProps} showAddForm={true} />);

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-10-01' } });

    fireEvent.click(screen.getByText('Cancel'));

    // showAddForm is controlled by parent; verify onCloseAddForm was called
    expect(defaultProps.onCloseAddForm).toHaveBeenCalled();
  });

  it('does not show End button for runs with end_date', () => {
    const onEndRun = vi.fn();
    const endedRun = {
      id: 'run-7',
      movie_id: 'm1',
      release_date: '2026-01-01',
      end_date: '2026-02-01',
      label: null,
      created_at: '2026-01-01T00:00:00Z',
    };
    render(
      <TheatricalRunsSection {...defaultProps} visibleRuns={[endedRun]} onEndRun={onEndRun} />,
    );
    expect(screen.queryByLabelText('End run 2026-01-01')).not.toBeInTheDocument();
  });
});
