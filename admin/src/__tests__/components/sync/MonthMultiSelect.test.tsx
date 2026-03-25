import { render, screen, fireEvent } from '@testing-library/react';
import { MonthMultiSelect } from '@/components/sync/MonthMultiSelect';

describe('MonthMultiSelect', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockClear();
  });

  it('shows "All months" when nothing is selected', () => {
    render(<MonthMultiSelect selected={[]} onChange={onChange} />);
    expect(screen.getByText('All months')).toBeInTheDocument();
  });

  it('shows abbreviated month names when 1-3 months selected', () => {
    render(<MonthMultiSelect selected={[1, 6]} onChange={onChange} />);
    expect(screen.getByText('Jan, Jun')).toBeInTheDocument();
  });

  it('shows count when more than 3 months selected', () => {
    render(<MonthMultiSelect selected={[1, 3, 5, 7]} onChange={onChange} />);
    expect(screen.getByText('4 months')).toBeInTheDocument();
  });

  it('opens dropdown on click', () => {
    render(<MonthMultiSelect selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /all months/i }));
    expect(screen.getByText('January')).toBeInTheDocument();
    expect(screen.getByText('December')).toBeInTheDocument();
  });

  it('adds a month when clicked', () => {
    render(<MonthMultiSelect selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /all months/i }));
    fireEvent.click(screen.getByText('March'));
    expect(onChange).toHaveBeenCalledWith([3]);
  });

  it('removes a month when already selected', () => {
    render(<MonthMultiSelect selected={[3, 6]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /mar, jun/i }));
    fireEvent.click(screen.getByText('March'));
    expect(onChange).toHaveBeenCalledWith([6]);
  });

  it('clears selection when "All months" is clicked', () => {
    render(<MonthMultiSelect selected={[1, 2]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /jan, feb/i }));
    // The "All months" option inside the dropdown
    const allOptions = screen.getAllByText('All months');
    fireEvent.click(allOptions[allOptions.length - 1]);
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it('keeps months sorted when adding', () => {
    render(<MonthMultiSelect selected={[6]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /jun/i }));
    fireEvent.click(screen.getByText('February'));
    expect(onChange).toHaveBeenCalledWith([2, 6]);
  });

  it('closes dropdown on outside click', () => {
    render(
      <div>
        <MonthMultiSelect selected={[]} onChange={onChange} />
        <span data-testid="outside">outside</span>
      </div>,
    );
    fireEvent.click(screen.getByRole('button', { name: /all months/i }));
    expect(screen.getByText('January')).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    expect(screen.queryByText('January')).not.toBeInTheDocument();
  });

  it('does not close dropdown when clicking inside the component', () => {
    render(<MonthMultiSelect selected={[]} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: /all months/i }));
    expect(screen.getByText('January')).toBeInTheDocument();
    // Click inside the dropdown (on a month checkbox)
    fireEvent.mouseDown(screen.getByText('January'));
    expect(screen.getByText('January')).toBeInTheDocument();
  });
});
