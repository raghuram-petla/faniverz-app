jest.mock('@/styles/movieMedia.styles', () => ({
  createStyles: () => new Proxy({}, { get: () => ({}) }),
}));

jest.mock('@/theme/colors', () => ({
  colors: new Proxy({}, { get: () => '#000' }),
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

  it('renders movie title', () => {
    render(<MediaHeroHeader {...defaultProps} />);
    expect(screen.getByText('Pushpa 2')).toBeTruthy();
  });

  it('shows media stats subtitle', () => {
    render(<MediaHeroHeader {...defaultProps} />);
    expect(screen.getByText('5 Videos · 3 Photos')).toBeTruthy();
  });
});
