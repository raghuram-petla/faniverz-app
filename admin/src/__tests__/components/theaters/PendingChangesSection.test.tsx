import { render, screen, fireEvent } from '@testing-library/react';
import {
  PendingChangesDock,
  type PendingChangesDockProps,
} from '@/components/theaters/PendingChangesSection';

type PendingChangeItem = PendingChangesDockProps['changes'][number];

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

  it('calls scrollBy down when scroll-down button is clicked', () => {
    const manyChanges: PendingChangeItem[] = Array.from({ length: 20 }, (_, i) => ({
      movieId: `m${i}`,
      title: `Movie ${i}`,
      posterUrl: null,
      inTheaters: true,
      date: '2026-03-14',
      label: null,
      releaseDate: '2026-03-20',
      dateAction: 'none' as const,
    }));

    render(<PendingChangesDock {...defaultProps} changes={manyChanges} />);

    const scrollDiv = document.querySelector('.overflow-y-auto')!;
    const scrollByMock = vi.fn();
    scrollDiv.scrollBy = scrollByMock;

    // Simulate overflow so canScrollDown becomes true
    Object.defineProperty(scrollDiv, 'scrollTop', { value: 0, configurable: true });
    Object.defineProperty(scrollDiv, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(scrollDiv, 'scrollHeight', { value: 500, configurable: true });
    fireEvent.scroll(scrollDiv);

    // Find the scroll-down button by its class
    const allButtons = screen.getAllByRole('button');
    const downButton = allButtons.find(
      (btn) => btn.querySelector('.animate-bounce') && btn.className.includes('rounded-t-lg'),
    );
    expect(downButton).toBeTruthy();
    fireEvent.click(downButton!);
    expect(scrollByMock).toHaveBeenCalledWith({ top: 44, behavior: 'smooth' });
  });

  it('calls scrollBy up when scroll-up button is clicked', () => {
    const manyChanges: PendingChangeItem[] = Array.from({ length: 20 }, (_, i) => ({
      movieId: `m${i}`,
      title: `Movie ${i}`,
      posterUrl: null,
      inTheaters: true,
      date: '2026-03-14',
      label: null,
      releaseDate: '2026-03-20',
      dateAction: 'none' as const,
    }));

    render(<PendingChangesDock {...defaultProps} changes={manyChanges} />);

    const scrollDiv = document.querySelector('.overflow-y-auto')!;
    const scrollByMock = vi.fn();
    scrollDiv.scrollBy = scrollByMock;

    // Simulate scrolled-down state so canScrollUp becomes true
    Object.defineProperty(scrollDiv, 'scrollTop', { value: 100, configurable: true });
    Object.defineProperty(scrollDiv, 'clientHeight', { value: 100, configurable: true });
    Object.defineProperty(scrollDiv, 'scrollHeight', { value: 500, configurable: true });
    fireEvent.scroll(scrollDiv);

    const allButtons = screen.getAllByRole('button');
    const upButton = allButtons.find(
      (btn) => btn.querySelector('.animate-bounce') && btn.className.includes('rounded-b-lg'),
    );
    expect(upButton).toBeTruthy();
    fireEvent.click(upButton!);
    expect(scrollByMock).toHaveBeenCalledWith({ top: -44, behavior: 'smooth' });
  });

  it('renders poster image when posterUrl is set', () => {
    const withPoster: PendingChangeItem = {
      movieId: '1',
      title: 'Movie With Poster',
      posterUrl: 'poster.jpg',
      inTheaters: true,
      date: '2026-03-14',
      label: null,
      releaseDate: '2026-03-20',
      dateAction: 'none',
    };
    render(<PendingChangesDock {...defaultProps} changes={[withPoster]} />);
    const img = document.querySelector('img');
    expect(img).toBeTruthy();
  });

  it('shows "Update release date to match" radio option', () => {
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
    expect(screen.getByText('Update release date to match')).toBeInTheDocument();
  });
});
