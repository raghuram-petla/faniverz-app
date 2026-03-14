import { render, screen, fireEvent } from '@testing-library/react';
import { MovieListItem } from '@/components/theaters/MovieListItem';

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

const baseProps = {
  id: 'movie-1',
  title: 'Test Movie',
  posterUrl: null,
  releaseDate: '2026-03-20',
  isOn: true,
  onToggle: vi.fn(),
  onRevert: vi.fn(),
};

describe('MovieListItem', () => {
  it('renders movie title as a link to edit page', () => {
    render(<MovieListItem {...baseProps} />);
    const link = screen.getByText('Test Movie');
    expect(link.closest('a')).toHaveAttribute('href', '/movies/movie-1');
  });

  it('renders formatted release date below title', () => {
    render(<MovieListItem {...baseProps} />);
    expect(screen.getByText(/2026/)).toBeInTheDocument();
  });

  it('renders toggle switch', () => {
    render(<MovieListItem {...baseProps} />);
    expect(screen.getByRole('switch')).toBeInTheDocument();
  });

  it('calls onToggle with today date when toggle is clicked (no pending)', () => {
    const onToggle = vi.fn();
    render(<MovieListItem {...baseProps} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(typeof onToggle.mock.calls[0][0]).toBe('string');
  });

  it('calls onRevert when toggle is clicked while pending', () => {
    const onRevert = vi.fn();
    render(<MovieListItem {...baseProps} pendingDate="2026-03-14" onRevert={onRevert} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onRevert).toHaveBeenCalledTimes(1);
  });

  it('shows inline date picker when pendingDate is set', () => {
    render(<MovieListItem {...baseProps} pendingDate="2026-03-14" dateLabel="End date" />);
    expect(screen.getByText('End date')).toBeInTheDocument();
    expect(screen.getByDisplayValue('2026-03-14')).toBeInTheDocument();
  });

  it('does not show date picker when no pendingDate', () => {
    render(<MovieListItem {...baseProps} dateLabel="End date" />);
    expect(screen.queryByText('End date')).not.toBeInTheDocument();
  });

  it('calls onDateChange when date is edited', () => {
    const onDateChange = vi.fn();
    render(<MovieListItem {...baseProps} pendingDate="2026-03-14" onDateChange={onDateChange} />);
    fireEvent.change(screen.getByDisplayValue('2026-03-14'), {
      target: { value: '2026-03-13' },
    });
    expect(onDateChange).toHaveBeenCalledWith('2026-03-13');
  });

  it('highlights item with amber ring when pending', () => {
    const { container } = render(<MovieListItem {...baseProps} pendingDate="2026-03-14" />);
    const item = container.firstChild as HTMLElement;
    expect(item.className).toContain('ring-amber');
  });

  it('renders subtitle when provided', () => {
    render(<MovieListItem {...baseProps} subtitle="In 6 days" />);
    expect(screen.getByText('In 6 days')).toBeInTheDocument();
  });

  it('renders poster image when posterUrl exists', () => {
    render(<MovieListItem {...baseProps} posterUrl="poster.jpg" />);
    expect(screen.getByAltText('')).toBeInTheDocument();
  });

  it('does not render release date when null', () => {
    render(<MovieListItem {...baseProps} releaseDate={null} />);
    expect(screen.queryByText(/2026/)).not.toBeInTheDocument();
  });

  it('applies max attribute to date input', () => {
    render(<MovieListItem {...baseProps} pendingDate="2026-03-14" maxDate="2026-03-14" />);
    const input = screen.getByDisplayValue('2026-03-14');
    expect(input).toHaveAttribute('max', '2026-03-14');
  });

  it('applies min attribute to date input', () => {
    render(<MovieListItem {...baseProps} pendingDate="2026-03-14" minDate="2026-03-14" />);
    const input = screen.getByDisplayValue('2026-03-14');
    expect(input).toHaveAttribute('min', '2026-03-14');
  });
});
