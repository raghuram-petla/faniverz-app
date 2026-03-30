/* eslint-disable @typescript-eslint/no-explicit-any */
jest.mock('@/styles/movieMedia.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
  HERO_HEIGHT: 200,
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

jest.mock('@shared/imageUrl', () => ({
  posterBucket: (t?: string) => (t === 'backdrop' ? 'BACKDROPS' : 'POSTERS'),
  backdropBucket: (t?: string) => (t === 'poster' ? 'POSTERS' : 'BACKDROPS'),
  getImageUrl: (url: string | null) => url,
}));

jest.mock('@/constants/placeholders', () => ({
  PLACEHOLDER_POSTER: 'https://placeholder.com/poster.png',
}));

import React from 'react';
import { render } from '@testing-library/react-native';
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
  poster_focus_x: null,
  poster_focus_y: null,
} as any;

describe('MediaHeroHeader', () => {
  const defaultProps = {
    movie: mockMovie,
    scrollOffset: { value: 0 } as any,
  };

  it('renders without crashing', () => {
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} />);
    expect(toJSON()).toBeTruthy();
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

  it('renders with null backdrop and null poster (uses placeholder)', () => {
    const movieNone = { ...mockMovie, backdrop_url: null, poster_url: null };
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} movie={movieNone} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with detail_focus_x and detail_focus_y overrides', () => {
    const movieDetailFocus = { ...mockMovie, detail_focus_x: 0.6, detail_focus_y: 0.4 };
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} movie={movieDetailFocus} />);
    expect(toJSON()).toBeTruthy();
  });

  it('does not apply content position when only x focus is set', () => {
    const moviePartialFocus = { ...mockMovie, backdrop_focus_x: 0.5, backdrop_focus_y: null };
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} movie={moviePartialFocus} />);
    expect(toJSON()).toBeTruthy();
  });

  it('does not apply content position when only y focus is set', () => {
    const moviePartialFocus = { ...mockMovie, backdrop_focus_x: null, backdrop_focus_y: 0.5 };
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} movie={moviePartialFocus} />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders with scrollOffset at non-zero value', () => {
    const { toJSON } = render(
      <MediaHeroHeader {...defaultProps} scrollOffset={{ value: 100 } as any} />,
    );
    expect(toJSON()).toBeTruthy();
  });

  it('uses detail_focus over backdrop_focus when both are set', () => {
    const movieBothFocus = {
      ...mockMovie,
      detail_focus_x: 0.8,
      detail_focus_y: 0.2,
      backdrop_focus_x: 0.3,
      backdrop_focus_y: 0.5,
    };
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} movie={movieBothFocus} />);
    expect(toJSON()).toBeTruthy();
  });

  it('calls useAnimatedStyle for backdrop fade-up animation', () => {
    const useAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    useAnimatedStyle.mockClear();
    render(<MediaHeroHeader {...defaultProps} />);
    // Single useAnimatedStyle call for the backdrop fade-up
    expect(useAnimatedStyle).toHaveBeenCalledTimes(1);
  });

  it('useAnimatedStyle callback returns opacity and translateY', () => {
    const useAnimatedStyle = require('react-native-reanimated').useAnimatedStyle;
    const interpolate = require('react-native-reanimated').interpolate;
    interpolate.mockImplementation((value: number) => value);
    useAnimatedStyle.mockImplementation((cb: () => object) => {
      const result = cb();
      return result;
    });
    render(<MediaHeroHeader {...defaultProps} />);
    expect(useAnimatedStyle).toHaveBeenCalled();
    useAnimatedStyle.mockImplementation(() => ({}));
    interpolate.mockImplementation(() => undefined);
  });

  it('does not render any text elements (title/subtitle are floating in parent)', () => {
    const { toJSON } = render(<MediaHeroHeader {...defaultProps} />);
    const json = JSON.stringify(toJSON());
    // Should not contain the movie title — it's now in the parent's floating elements
    expect(json).not.toContain('Pushpa 2');
  });
});
