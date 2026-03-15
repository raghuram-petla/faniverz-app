import { render, screen, fireEvent } from '@testing-library/react';
import { PendingChangesDock } from '@/components/theaters/PendingChangesSection';

const mockChanges = [
  {
    movieId: '1',
    title: 'Movie A',
    posterUrl: null,
    inTheaters: true,
    date: '2026-03-14',
    label: null,
  },
  {
    movieId: '2',
    title: 'Movie B',
    posterUrl: null,
    inTheaters: false,
    date: '2026-03-14',
    label: null,
  },
  {
    movieId: '3',
    title: 'Movie C',
    posterUrl: null,
    inTheaters: true,
    date: '2026-04-01',
    label: 'Re-release',
  },
];

const defaultProps = {
  changes: mockChanges,
  onDateChange: vi.fn(),
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
    render(
      <PendingChangesDock
        {...defaultProps}
        changes={[
          {
            movieId: '2',
            title: 'Movie B',
            posterUrl: null,
            inTheaters: false,
            date: '2026-03-14',
            label: null,
          },
        ]}
      />,
    );
    const input = screen.getByDisplayValue('2026-03-14');
    expect(input).toHaveAttribute('max', '2026-03-14');
  });

  it('applies min date to addition rows', () => {
    render(
      <PendingChangesDock
        {...defaultProps}
        changes={[
          {
            movieId: '1',
            title: 'Movie A',
            posterUrl: null,
            inTheaters: true,
            date: '2026-03-14',
            label: null,
          },
        ]}
      />,
    );
    const input = screen.getByDisplayValue('2026-03-14');
    expect(input).toHaveAttribute('min', '2026-03-14');
  });
});
