import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewPanel } from '@/components/movie-edit/PreviewPanel';
import type { MovieForm } from '@/hooks/useMovieEditTypes';

vi.mock('@shared/constants', () => ({
  DEVICES: [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 15', width: 393, height: 852 },
    { name: 'Galaxy S24', width: 360, height: 780 },
  ],
}));

vi.mock('@/components/preview/DeviceFrame', () => ({
  DeviceFrame: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="device-frame">{children}</div>
  ),
}));

vi.mock('@/components/preview/DeviceSelector', () => ({
  DeviceSelector: ({ selected }: { selected: { name: string } }) => (
    <div data-testid="device-selector">{selected.name}</div>
  ),
}));

vi.mock('@/components/preview/SpotlightPreview', () => ({
  SpotlightPreview: () => <div data-testid="spotlight-preview" />,
}));

vi.mock('@/components/preview/MovieDetailPreview', () => ({
  MovieDetailPreview: () => <div data-testid="detail-preview" />,
}));

vi.mock('@shared/movieStatus', () => ({
  deriveMovieStatus: () => 'upcoming',
}));

const defaultForm: MovieForm = {
  title: 'Test Movie',
  poster_url: '',
  backdrop_url: '',
  release_date: '2025-01-01',
  runtime: '',
  genres: [],
  certification: '',
  synopsis: '',
  in_theaters: false,
  premiere_date: '',
  original_language: '',
  is_featured: false,
  tmdb_id: '',
  tagline: '',
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  poster_focus_x: null,
  poster_focus_y: null,
};

describe('PreviewPanel', () => {
  it('renders device selector', () => {
    render(<PreviewPanel form={defaultForm} />);
    expect(screen.getByTestId('device-selector')).toBeInTheDocument();
  });

  it('renders Spotlight button', () => {
    render(<PreviewPanel form={defaultForm} />);
    expect(screen.getByRole('button', { name: 'Spotlight' })).toBeInTheDocument();
  });

  it('renders Detail button', () => {
    render(<PreviewPanel form={defaultForm} />);
    expect(screen.getByRole('button', { name: 'Detail' })).toBeInTheDocument();
  });

  it('shows MovieDetailPreview by default', () => {
    render(<PreviewPanel form={defaultForm} />);
    expect(screen.getByTestId('detail-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('spotlight-preview')).not.toBeInTheDocument();
  });

  it('switches to SpotlightPreview when Spotlight clicked', () => {
    render(<PreviewPanel form={defaultForm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotlight' }));
    expect(screen.getByTestId('spotlight-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-preview')).not.toBeInTheDocument();
  });

  it('renders device frame', () => {
    render(<PreviewPanel form={defaultForm} />);
    expect(screen.getByTestId('device-frame')).toBeInTheDocument();
  });

  it('switches back to DetailPreview when Detail clicked after Spotlight', () => {
    render(<PreviewPanel form={defaultForm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotlight' }));
    expect(screen.getByTestId('spotlight-preview')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Detail' }));
    expect(screen.getByTestId('detail-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('spotlight-preview')).not.toBeInTheDocument();
  });

  it('accepts optional posterBucket and backdropBucket props', () => {
    expect(() =>
      render(<PreviewPanel form={defaultForm} posterBucket="BACKDROPS" backdropBucket="POSTERS" />),
    ).not.toThrow();
  });

  it('renders correctly with populated form fields', () => {
    const populatedForm: MovieForm = {
      ...defaultForm,
      title: 'Baahubali',
      poster_url: 'https://r2.dev/poster.jpg',
      backdrop_url: 'https://r2.dev/backdrop.jpg',
      runtime: '159',
      certification: 'UA',
      backdrop_focus_x: 0.5,
      backdrop_focus_y: 0.3,
      poster_focus_x: 0.4,
      poster_focus_y: 0.6,
    };
    render(<PreviewPanel form={populatedForm} />);
    expect(screen.getByTestId('detail-preview')).toBeInTheDocument();
  });

  it('uses default DEVICES[1] as initial device', () => {
    render(<PreviewPanel form={defaultForm} />);
    // DEVICES[1] is 'iPhone 15' from mock
    expect(screen.getByText('iPhone 15')).toBeInTheDocument();
  });

  it('uses placeholder values when form fields are empty strings', () => {
    const emptyForm: MovieForm = {
      ...defaultForm,
      title: '',
      poster_url: '',
      backdrop_url: '',
      runtime: '',
      certification: '',
      release_date: '',
      premiere_date: '',
    };
    render(<PreviewPanel form={emptyForm} />);
    expect(screen.getByTestId('detail-preview')).toBeInTheDocument();
  });

  it('uses fallback values in SpotlightPreview with empty form', () => {
    const emptyForm: MovieForm = {
      ...defaultForm,
      title: '',
      poster_url: '',
      backdrop_url: '',
      runtime: '',
      certification: '',
      release_date: '',
    };
    render(<PreviewPanel form={emptyForm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotlight' }));
    expect(screen.getByTestId('spotlight-preview')).toBeInTheDocument();
  });

  it('handles non-empty runtime and certification in detail view', () => {
    const populatedForm: MovieForm = {
      ...defaultForm,
      runtime: '120',
      certification: 'A',
      release_date: '2025-01-01',
    };
    render(<PreviewPanel form={populatedForm} />);
    expect(screen.getByTestId('detail-preview')).toBeInTheDocument();
  });

  it('handles non-empty runtime and certification in spotlight view', () => {
    const populatedForm: MovieForm = {
      ...defaultForm,
      runtime: '120',
      certification: 'A',
      release_date: '2025-01-01',
    };
    render(<PreviewPanel form={populatedForm} />);
    fireEvent.click(screen.getByRole('button', { name: 'Spotlight' }));
    expect(screen.getByTestId('spotlight-preview')).toBeInTheDocument();
  });
});
