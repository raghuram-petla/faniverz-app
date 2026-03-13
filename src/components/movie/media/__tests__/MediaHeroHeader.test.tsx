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
        'movieDetail.videos': 'Videos',
        'movieDetail.video': 'Video',
        'movieDetail.photos': 'Photos',
        'movieDetail.photo': 'Photo',
      };
      return map[key] ?? key;
    },
    i18n: { language: 'en' },
  }),
}));

jest.mock('@shared/imageUrl', () => ({
  getImageUrl: (url: string | null) => url,
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
}));

import React from 'react';
import { render, screen } from '@testing-library/react-native';
import { MediaHeroHeader } from '../MediaHeroHeader';

const mockMovie = {
  id: 'movie-1',
  title: 'Pushpa 2',
  backdrop_url: 'https://example.com/backdrop.jpg',
  poster_url: 'https://example.com/poster.jpg',
  detail_focus_x: null,
  detail_focus_y: null,
  backdrop_focus_x: null,
  backdrop_focus_y: null,
} as any;

describe('MediaHeroHeader', () => {
  const defaultProps = {
    movie: mockMovie,
    videoCount: 5,
    photoCount: 3,
    scrollOffset: { value: 0 } as any,
  };

  it('renders without crashing', () => {
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders movie title', () => {
    render(<MediaHeroHeader {...defaultProps} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('shows media stats subtitle with plural counts', () => {
    render(<MediaHeroHeader {...defaultProps} />);
    expect(screen.getByText('5 Videos · 3 Photos')).toBeTruthy();
  });

  it('uses singular "Video" for 1 video', () => {
    render(<MediaHeroHeader {...defaultProps} videoCount={1} />);
    expect(screen.getByText('1 Video · 3 Photos')).toBeTruthy();
  });

  it('uses singular "Photo" for 1 photo', () => {
    render(<MediaHeroHeader {...defaultProps} photoCount={1} />);
    expect(screen.getByText('5 Videos · 1 Photo')).toBeTruthy();
  });

  it('uses singular for both when each is 1', () => {
    render(<MediaHeroHeader {...defaultProps} videoCount={1} photoCount={1} />);
    expect(screen.getByText('1 Video · 1 Photo')).toBeTruthy();
  });

  it('renders with zero counts', () => {
    render(<MediaHeroHeader {...defaultProps} videoCount={0} photoCount={0} />);
    expect(screen.getByText('0 Videos · 0 Photos')).toBeTruthy();
  });

  it('renders with focus point overrides', () => {
    const movieWithFocus = {
      ...mockMovie,
      backdrop_focus_x: 0.3,
      backdrop_focus_y: 0.5,
    };
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} movie={movieWithFocus} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with null backdrop falling back to poster', () => {
    const movieNoBackdrop = { ...mockMovie, backdrop_url: null };
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} movie={movieNoBackdrop} />);
    expect(toJSON()).toBeTruthy();
  });
});
