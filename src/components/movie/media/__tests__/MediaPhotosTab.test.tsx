jest.mock('@/styles/movieMedia.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme', () => ({
  useTheme: () => ({
    theme: new Proxy({}, { get: () => '#000' }),
    colors: new Proxy({}, { get: () => '#000' }),
    mode: 'dark',
    setMode: jest.fn(),
  }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
}));

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

jest.mock('expo-image', () => ({
  Image: 'Image',
}));

jest.mock('expo-linear-gradient', () => ({
  LinearGradient: 'LinearGradient',
}));

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const map: Record<string, string> = {
        'discover.noPhotosYet': 'No photos available yet',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

const mockOpenImage = jest.fn();
jest.mock('@/providers/ImageViewerProvider', () => ({
  useImageViewer: () => ({ openImage: mockOpenImage, closeImage: jest.fn() }),
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
}));

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react-native';
import { MediaPhotosTab } from '../MediaPhotosTab';
import type { MoviePoster } from '@/types';

const makePoster = (overrides: Partial<MoviePoster> = {}): MoviePoster => ({
  id: 'p1',
  movie_id: 'm1',
  image_url: 'https://example.com/poster.jpg',
  title: 'First Look',
  description: null,
  poster_date: null,
  is_main_poster: false,
  is_main_backdrop: false,
  image_type: 'poster',
  tmdb_file_path: null,
  iso_639_1: null,
  width: null,
  height: null,
  vote_average: 0,
  display_order: 0,
  created_at: '',
  ...overrides,
});

describe('MediaPhotosTab', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders without crashing', () => {
    const { toJSON } = render(<MediaPhotosTab posters={[]} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders all poster items', () => {
    const posters = [
      makePoster({ id: 'p1', title: 'First Look', is_main_poster: true }),
      makePoster({ id: 'p2', title: 'Character Poster' }),
      makePoster({ id: 'p3', title: 'Festival Special' }),
    ];
    render(<MediaPhotosTab posters={posters} />);
    expect(screen.getByLabelText('View First Look')).toBeTruthy();
    expect(screen.getByLabelText('View Character Poster')).toBeTruthy();
    expect(screen.getByLabelText('View Festival Special')).toBeTruthy();
  });

  it('shows "Main Poster" badge on is_main_poster item', () => {
    const posters = [makePoster({ id: 'p1', is_main_poster: true })];
    render(<MediaPhotosTab posters={posters} />);
    expect(screen.getByText('Main Poster')).toBeTruthy();
  });

  it('shows "Main Backdrop" badge on is_main_backdrop item', () => {
    const posters = [makePoster({ id: 'p1', is_main_backdrop: true, image_type: 'backdrop' })];
    render(<MediaPhotosTab posters={posters} />);
    expect(screen.getByText('Main Backdrop')).toBeTruthy();
  });

  it('does not show main badges on non-main items', () => {
    render(<MediaPhotosTab posters={[makePoster({ id: 'p1', is_main_poster: false })]} />);
    expect(screen.queryByText('Main Poster')).toBeNull();
    expect(screen.queryByText('Main Backdrop')).toBeNull();
  });

  it('shows empty state when posters array is empty', () => {
    render(<MediaPhotosTab posters={[]} />);
    expect(screen.getByText('No photos available yet')).toBeTruthy();
  });

  it('shows poster title overlay on each card', () => {
    const posters = [
      makePoster({ id: 'p1', title: 'First Look' }),
      makePoster({ id: 'p2', title: 'Character Poster' }),
    ];
    render(<MediaPhotosTab posters={posters} />);
    expect(screen.getByText('First Look')).toBeTruthy();
    expect(screen.getByText('Character Poster')).toBeTruthy();
  });

  it('renders correct number of poster cards', () => {
    const posters = [
      makePoster({ id: 'p1', title: 'Poster 1' }),
      makePoster({ id: 'p2', title: 'Poster 2' }),
      makePoster({ id: 'p3', title: 'Poster 3' }),
      makePoster({ id: 'p4', title: 'Poster 4' }),
    ];
    render(<MediaPhotosTab posters={posters} />);
    expect(screen.getByLabelText('View Poster 1')).toBeTruthy();
    expect(screen.getByLabelText('View Poster 2')).toBeTruthy();
    expect(screen.getByLabelText('View Poster 3')).toBeTruthy();
    expect(screen.getByLabelText('View Poster 4')).toBeTruthy();
  });

  it('renders single poster correctly', () => {
    render(<MediaPhotosTab posters={[makePoster({ id: 'p1', title: 'Solo Poster' })]} />);
    expect(screen.getByLabelText('View Solo Poster')).toBeTruthy();
    expect(screen.getByText('Solo Poster')).toBeTruthy();
  });

  it('renders filter pills with All, Posters, Backdrops', () => {
    render(<MediaPhotosTab posters={[makePoster()]} />);
    expect(screen.getByText('All')).toBeTruthy();
    expect(screen.getByText('Posters')).toBeTruthy();
    expect(screen.getByText('Backdrops')).toBeTruthy();
  });

  it('filters to only posters when Posters pill is pressed', () => {
    const posters = [
      makePoster({ id: 'p1', title: 'Poster One', image_type: 'poster' }),
      makePoster({ id: 'b1', title: 'Backdrop One', image_type: 'backdrop' }),
    ];
    render(<MediaPhotosTab posters={posters} />);
    fireEvent.press(screen.getByText('Posters'));
    expect(screen.getByLabelText('View Poster One')).toBeTruthy();
    expect(screen.queryByLabelText('View Backdrop One')).toBeNull();
  });

  it('filters to only backdrops when Backdrops pill is pressed', () => {
    const posters = [
      makePoster({ id: 'p1', title: 'Poster One', image_type: 'poster' }),
      makePoster({ id: 'b1', title: 'Backdrop One', image_type: 'backdrop' }),
    ];
    render(<MediaPhotosTab posters={posters} />);
    fireEvent.press(screen.getByText('Backdrops'));
    expect(screen.queryByLabelText('View Poster One')).toBeNull();
    expect(screen.getByLabelText('View Backdrop One')).toBeTruthy();
  });

  it('shows all items when All pill is pressed after filtering', () => {
    const posters = [
      makePoster({ id: 'p1', title: 'Poster One', image_type: 'poster' }),
      makePoster({ id: 'b1', title: 'Backdrop One', image_type: 'backdrop' }),
    ];
    render(<MediaPhotosTab posters={posters} />);
    fireEvent.press(screen.getByText('Posters'));
    fireEvent.press(screen.getByText('All'));
    expect(screen.getByLabelText('View Poster One')).toBeTruthy();
    expect(screen.getByLabelText('View Backdrop One')).toBeTruthy();
  });

  it('does not show filter pills when posters list is empty', () => {
    render(<MediaPhotosTab posters={[]} />);
    expect(screen.queryByText('All')).toBeNull();
  });
});
