import { render, screen, fireEvent } from '@testing-library/react';
import { MovieEditHeader } from '../MovieEditHeader';

describe('MovieEditHeader', () => {
  const defaultProps = {
    title: 'Test Movie',
    onBack: vi.fn(),
    canDelete: false,
    onDelete: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders "Edit Movie" heading with title', () => {
    render(<MovieEditHeader {...defaultProps} />);
    expect(screen.getByText('Edit Movie')).toBeInTheDocument();
    expect(screen.getByText(/Test Movie/)).toBeInTheDocument();
  });

  it('renders without title suffix when title is null', () => {
    render(<MovieEditHeader {...defaultProps} title={null} />);
    expect(screen.getByText('Edit Movie')).toBeInTheDocument();
    expect(screen.queryByText(/—/)).not.toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    render(<MovieEditHeader {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(defaultProps.onBack).toHaveBeenCalledTimes(1);
  });

  it('does not show delete button when canDelete is false', () => {
    render(<MovieEditHeader {...defaultProps} canDelete={false} />);
    expect(screen.queryByText('Delete')).not.toBeInTheDocument();
  });

  it('shows delete button when canDelete is true', () => {
    render(<MovieEditHeader {...defaultProps} canDelete={true} />);
    expect(screen.getByText('Delete')).toBeInTheDocument();
  });

  it('calls onDelete when delete button is clicked', () => {
    render(<MovieEditHeader {...defaultProps} canDelete={true} />);
    fireEvent.click(screen.getByText('Delete'));
    expect(defaultProps.onDelete).toHaveBeenCalledTimes(1);
  });
});
