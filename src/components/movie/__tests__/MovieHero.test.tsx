import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View {...props} />,
  };
});

import MovieHero from '../MovieHero';

describe('MovieHero', () => {
  it('renders hero container', () => {
    render(<MovieHero backdropPath="/bg.jpg" posterPath="/poster.jpg" />);
    expect(screen.getByTestId('movie-hero')).toBeTruthy();
  });

  it('renders backdrop image', () => {
    render(<MovieHero backdropPath="/bg.jpg" posterPath="/poster.jpg" />);
    expect(screen.getByTestId('hero-backdrop')).toBeTruthy();
  });

  it('renders poster image', () => {
    render(<MovieHero backdropPath="/bg.jpg" posterPath="/poster.jpg" />);
    expect(screen.getByTestId('hero-poster')).toBeTruthy();
  });

  it('renders backdrop placeholder when no backdrop', () => {
    render(<MovieHero backdropPath={null} posterPath="/poster.jpg" />);
    expect(screen.getByTestId('hero-backdrop-placeholder')).toBeTruthy();
  });

  it('hides poster when no poster path', () => {
    render(<MovieHero backdropPath="/bg.jpg" posterPath={null} />);
    expect(screen.queryByTestId('hero-poster')).toBeNull();
  });
});
