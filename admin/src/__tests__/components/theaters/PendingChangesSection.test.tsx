import { render, screen, fireEvent } from '@testing-library/react';
import { PendingChangesDock } from '@/components/theaters/PendingChangesSection';
import type { PendingChangeItem } from '@/components/theaters/PendingChangesSection';

const mockChanges: PendingChangeItem[] = [
  {
    movieId: '1',
    title: 'Movie A',
    posterUrl: null,
    inTheaters: true,
    date: '2026-03-14',
    label: null,
    releaseDate: '2026-03-20',
    dateAction: 'none',
  },
  {
    movieId: '2',
    title: 'Movie B',
    posterUrl: null,
    inTheaters: false,
    date: '2026-03-14',
    label: null,
    releaseDate: '2026-03-10',
    dateAction: 'none',
  },
  {
    movieId: '3',
    title: 'Movie C',
    posterUrl: null,
    inTheaters: true,
    date: '2026-04-01',
    label: 'Re-release',
    releaseDate: '2026-04-01',
    dateAction: 'none',
  },
];

const defaultProps = {
  changes: mockChanges,
  onDateChange: vi.fn(),
  onDateActionChange: vi.fn(),
  onRemove: vi.fn(),
  today: '2026-03-14',
};

describe('PendingChangesDock', () => {
  it('returns null when no changes', () => {
    const { container } = render(<PendingChangesDock {...defaultProps} changes={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders "Adding to theaters" group', () => {
    render(<PendingChangesDock {...defaultProps} />);
    expect(screen.getByText('Adding to theaters')).toBeInTheDocument();
  });

  it('renders "Removing from theaters" group', () => {
    render(<PendingChangesDock {...defaultProps} />);
    expect(screen.getByText('Removing from theaters')).toBeInTheDocument();
  });

  it('renders all movie titles', () => {
    render(<PendingChangesDock {...defaultProps} />);
    expect(screen.getByText('Movie A')).toBeInTheDocument();
    expect(screen.getByText('Movie B')).toBeInTheDocument();
    expect(screen.getByText('Movie C')).toBeInTheDocument();
  });

  it('renders date inputs with correct values', () => {
    render(<PendingChangesDock {...defaultProps} />);
    const dateInputs = screen.getAllByDisplayValue('2026-03-14');
    expect(dateInputs.length).toBe(2);
  });

  it('calls onDateChange when date is edited', () => {
    const onDateChange = vi.fn();
    render(<PendingChangesDock {...defaultProps} onDateChange={onDateChange} />);
    const dateInputs = screen.getAllByDisplayValue('2026-03-14');
    fireEvent.change(dateInputs[0], { target: { value: '2026-03-15' } });
    expect(onDateChange).toHaveBeenCalledWith('1', '2026-03-15');
  });

  it('calls onRemove when undo button is clicked', () => {
    const onRemove = vi.fn();
    render(<PendingChangesDock {...defaultProps} onRemove={onRemove} />);
    fireEvent.click(screen.getByLabelText('Undo Movie A'));
    expect(onRemove).toHaveBeenCalledWith('1');
  });

  it('applies max date to removal rows', () => {
    const removal: PendingChangeItem = {
      movieId: '2',
      title: 'Movie B',
      posterUrl: null,
      inTheaters: false,
      date: '2026-03-14',
      label: null,
      releaseDate: '2026-03-10',
      dateAction: 'none',
    };
    render(<PendingChangesDock {...defaultProps} changes={[removal]} />);
    const input = screen.getByDisplayValue('2026-03-14');
    expect(input).toHaveAttribute('max', '2026-03-14');
  });

  it('applies max date to addition rows', () => {
    const addition: PendingChangeItem = {
      movieId: '1',
      title: 'Movie A',
      posterUrl: null,
      inTheaters: true,
      date: '2026-03-14',
      label: null,
      releaseDate: '2026-03-20',
      dateAction: 'none',
    };
    render(<PendingChangesDock {...defaultProps} changes={[addition]} />);
    const input = screen.getByDisplayValue('2026-03-14');
    expect(input).toHaveAttribute('max', '2026-03-14');
  });

  it('shows date action picker when start date is before release date', () => {
    const earlyStart: PendingChangeItem = {
      movieId: '1',
      title: 'Movie A',
      posterUrl: null,
      inTheaters: true,
      date: '2026-03-14',
      label: null,
      releaseDate: '2026-03-20',
      dateAction: 'none',
    };
    render(<PendingChangesDock {...defaultProps} changes={[earlyStart]} />);
    expect(screen.getByText('Before release date:')).toBeInTheDocument();
    expect(screen.getByText('No date update')).toBeInTheDocument();
  });

  it('does not show date action picker when start date equals release date', () => {
    const sameDate: PendingChangeItem = {
      movieId: '1',
      title: 'Movie A',
      posterUrl: null,
      inTheaters: true,
      date: '2026-03-20',
      label: null,
      releaseDate: '2026-03-20',
      dateAction: 'none',
    };
    render(<PendingChangesDock {...defaultProps} changes={[sameDate]} />);
    expect(screen.queryByText('Before release date:')).not.toBeInTheDocument();
  });

  it('calls onDateActionChange when radio is clicked', () => {
    const onDateActionChange = vi.fn();
    const earlyStart: PendingChangeItem = {
      movieId: '1',
      title: 'Movie A',
      posterUrl: null,
      inTheaters: true,
      date: '2026-03-14',
      label: null,
      releaseDate: '2026-03-20',
      dateAction: 'none',
    };
    render(
      <PendingChangesDock
        {...defaultProps}
        changes={[earlyStart]}
        onDateActionChange={onDateActionChange}
      />,
    );
    fireEvent.click(screen.getByText(/Set as premiere/));
    expect(onDateActionChange).toHaveBeenCalledWith('1', 'premiere');
  });

  it('does not show date action picker for removals', () => {
    const removal: PendingChangeItem = {
      movieId: '2',
      title: 'Movie B',
      posterUrl: null,
      inTheaters: false,
      date: '2026-03-01',
      label: null,
      releaseDate: '2026-03-20',
      dateAction: 'none',
    };
    render(<PendingChangesDock {...defaultProps} changes={[removal]} />);
    expect(screen.queryByText('Before release date:')).not.toBeInTheDocument();
  });
});
