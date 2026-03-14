import { render, screen } from '@testing-library/react';
import { TableHeader } from '@/components/theaters/TableHeader';

function renderInTable(ui: React.ReactElement) {
  return render(<table>{ui}</table>);
}

describe('TableHeader', () => {
  it('renders Movie and Release Date columns', () => {
    renderInTable(<TableHeader />);
    expect(screen.getByText('Movie')).toBeInTheDocument();
    expect(screen.getByText('Release Date')).toBeInTheDocument();
  });

  it('renders actions column by default', () => {
    const { container } = renderInTable(<TableHeader />);
    const ths = container.querySelectorAll('th');
    expect(ths.length).toBe(3);
  });

  it('hides actions column when showActions is false', () => {
    const { container } = renderInTable(<TableHeader showActions={false} />);
    const ths = container.querySelectorAll('th');
    expect(ths.length).toBe(2);
  });

  it('renders Countdown column when showCountdown is true', () => {
    renderInTable(<TableHeader showCountdown />);
    expect(screen.getByText('Countdown')).toBeInTheDocument();
  });

  it('renders Label column when showLabel is true', () => {
    renderInTable(<TableHeader showLabel />);
    expect(screen.getByText('Label')).toBeInTheDocument();
  });

  it('does not render Countdown/Label columns by default', () => {
    renderInTable(<TableHeader />);
    expect(screen.queryByText('Countdown')).not.toBeInTheDocument();
    expect(screen.queryByText('Label')).not.toBeInTheDocument();
  });
});
