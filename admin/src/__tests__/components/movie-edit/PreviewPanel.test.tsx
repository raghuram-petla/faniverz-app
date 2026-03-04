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
  director: '',
  trailer_url: '',
  in_theaters: false,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
  spotlight_focus_x: null,
  spotlight_focus_y: null,
  detail_focus_x: null,
  detail_focus_y: null,
};

describe('PreviewPanel', () => {
  it('renders device selector', () => {
    render(<PreviewPanel form={defaultForm} setForm={vi.fn()} />);
    expect(screen.getByTestId('device-selector')).toBeInTheDocument();
  });

  it('renders Spotlight button', () => {
    render(<PreviewPanel form={defaultForm} setForm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Spotlight' })).toBeInTheDocument();
  });

  it('renders Detail button', () => {
    render(<PreviewPanel form={defaultForm} setForm={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Detail' })).toBeInTheDocument();
  });

  it('shows SpotlightPreview by default', () => {
    render(<PreviewPanel form={defaultForm} setForm={vi.fn()} />);
    expect(screen.getByTestId('spotlight-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('detail-preview')).not.toBeInTheDocument();
  });

  it('switches to MovieDetailPreview when Detail clicked', () => {
    render(<PreviewPanel form={defaultForm} setForm={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Detail' }));
    expect(screen.getByTestId('detail-preview')).toBeInTheDocument();
    expect(screen.queryByTestId('spotlight-preview')).not.toBeInTheDocument();
  });

  it('renders device frame', () => {
    render(<PreviewPanel form={defaultForm} setForm={vi.fn()} />);
    expect(screen.getByTestId('device-frame')).toBeInTheDocument();
  });
});
