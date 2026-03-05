import { render, screen, fireEvent } from '@testing-library/react';
import {
  StaleMoviesSection,
  MissingBiosSection,
  BulkProgressPanel,
} from '@/components/sync/BulkSections';

describe('StaleMoviesSection', () => {
  const defaultProps = {
    staleDays: 30,
    onStaleDaysChange: vi.fn(),
    staleMovies: {
      data: { items: [] as { id: string; title?: string; tmdb_last_synced_at?: string | null }[] },
      isLoading: false,
    },
    showList: false,
    onToggleList: vi.fn(),
    onRefreshAll: vi.fn(),
    isBulkRunning: false,
  };

  it('renders Stale Movies heading', () => {
    render(<StaleMoviesSection {...defaultProps} />);
    expect(screen.getByText('Stale Movies')).toBeInTheDocument();
  });

  it('renders stale days select', () => {
    render(<StaleMoviesSection {...defaultProps} />);
    expect(screen.getByDisplayValue('30 days')).toBeInTheDocument();
  });

  it('calls onStaleDaysChange when select changes', () => {
    const onStaleDaysChange = vi.fn();
    render(<StaleMoviesSection {...defaultProps} onStaleDaysChange={onStaleDaysChange} />);
    fireEvent.change(screen.getByDisplayValue('30 days'), { target: { value: '7' } });
    expect(onStaleDaysChange).toHaveBeenCalledWith(7);
  });

  it('shows loading state', () => {
    render(<StaleMoviesSection {...defaultProps} staleMovies={{ isLoading: true }} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows movie count', () => {
    const staleMovies = {
      data: {
        items: [
          { id: 'm1', title: 'Movie 1' },
          { id: 'm2', title: 'Movie 2' },
        ],
      },
      isLoading: false,
    };
    render(<StaleMoviesSection {...defaultProps} staleMovies={staleMovies} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('disables Preview when no items', () => {
    render(<StaleMoviesSection {...defaultProps} />);
    expect(screen.getByText('Preview')).toBeDisabled();
  });

  it('disables Refresh All when no items', () => {
    render(<StaleMoviesSection {...defaultProps} />);
    expect(screen.getByText('Refresh All')).toBeDisabled();
  });

  it('shows item list when showList is true', () => {
    const staleMovies = {
      data: { items: [{ id: 'm1', title: 'Visible Movie', tmdb_last_synced_at: null }] },
      isLoading: false,
    };
    render(<StaleMoviesSection {...defaultProps} staleMovies={staleMovies} showList={true} />);
    expect(screen.getByText('Visible Movie')).toBeInTheDocument();
    expect(screen.getByText('Never')).toBeInTheDocument();
  });

  it('calls onToggleList when Preview is clicked', () => {
    const staleMovies = {
      data: { items: [{ id: 'm1', title: 'Movie' }] },
      isLoading: false,
    };
    const onToggleList = vi.fn();
    render(
      <StaleMoviesSection
        {...defaultProps}
        staleMovies={staleMovies}
        onToggleList={onToggleList}
      />,
    );
    fireEvent.click(screen.getByText('Preview'));
    expect(onToggleList).toHaveBeenCalled();
  });

  it('calls onRefreshAll when Refresh All is clicked', () => {
    const staleMovies = {
      data: { items: [{ id: 'm1', title: 'Movie' }] },
      isLoading: false,
    };
    const onRefreshAll = vi.fn();
    render(
      <StaleMoviesSection
        {...defaultProps}
        staleMovies={staleMovies}
        onRefreshAll={onRefreshAll}
      />,
    );
    fireEvent.click(screen.getByText('Refresh All'));
    expect(onRefreshAll).toHaveBeenCalled();
  });
});

describe('MissingBiosSection', () => {
  const defaultProps = {
    missingBios: { data: { items: [] as { id: string; name?: string }[] }, isLoading: false },
    showList: false,
    onToggleList: vi.fn(),
    onFetchAll: vi.fn(),
    isBulkRunning: false,
  };

  it('renders Missing Actor Bios heading', () => {
    render(<MissingBiosSection {...defaultProps} />);
    expect(screen.getByText('Missing Actor Bios')).toBeInTheDocument();
  });

  it('shows actor count', () => {
    const missingBios = {
      data: {
        items: [
          { id: 'a1', name: 'Actor 1' },
          { id: 'a2', name: 'Actor 2' },
        ],
      },
      isLoading: false,
    };
    render(<MissingBiosSection {...defaultProps} missingBios={missingBios} />);
    expect(screen.getByText('2')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<MissingBiosSection {...defaultProps} missingBios={{ isLoading: true }} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows actor names when showList is true', () => {
    const missingBios = {
      data: { items: [{ id: 'a1', name: 'Test Actor' }] },
      isLoading: false,
    };
    render(<MissingBiosSection {...defaultProps} missingBios={missingBios} showList={true} />);
    expect(screen.getByText('Test Actor')).toBeInTheDocument();
  });

  it('calls onFetchAll when clicked', () => {
    const missingBios = {
      data: { items: [{ id: 'a1', name: 'Actor' }] },
      isLoading: false,
    };
    const onFetchAll = vi.fn();
    render(
      <MissingBiosSection {...defaultProps} missingBios={missingBios} onFetchAll={onFetchAll} />,
    );
    fireEvent.click(screen.getByText('Fetch All Bios'));
    expect(onFetchAll).toHaveBeenCalled();
  });
});

describe('BulkProgressPanel', () => {
  it('renders movie refresh title', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 10, completed: 3, current: 'Movie X', errors: [] }}
      />,
    );
    expect(screen.getByText('Refreshing Movies')).toBeInTheDocument();
  });

  it('renders actor fetch title', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'actors', total: 5, completed: 2, current: 'Actor Y', errors: [] }}
      />,
    );
    expect(screen.getByText('Fetching Actor Bios')).toBeInTheDocument();
  });

  it('shows progress count', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 10, completed: 3, current: '', errors: [] }}
      />,
    );
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('shows current item being processed', () => {
    render(
      <BulkProgressPanel
        progress={{
          type: 'movies',
          total: 10,
          completed: 3,
          current: 'Processing Movie',
          errors: [],
        }}
      />,
    );
    expect(screen.getByText('Processing Movie')).toBeInTheDocument();
  });

  it('shows complete message when done', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 5, completed: 5, current: '', errors: [] }}
      />,
    );
    expect(screen.getByText('Complete!')).toBeInTheDocument();
  });

  it('shows error count in complete message', () => {
    render(
      <BulkProgressPanel
        progress={{ type: 'movies', total: 5, completed: 5, current: '', errors: ['err1', 'err2'] }}
      />,
    );
    expect(screen.getByText(/2 errors/)).toBeInTheDocument();
  });

  it('shows error messages', () => {
    render(
      <BulkProgressPanel
        progress={{
          type: 'movies',
          total: 5,
          completed: 5,
          current: '',
          errors: ['Movie X: API fail'],
        }}
      />,
    );
    expect(screen.getByText('Movie X: API fail')).toBeInTheDocument();
  });
});
