import React from 'react';
import { render, screen } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('react-native/Libraries/Utilities/useColorScheme', () => ({
  __esModule: true,
  default: jest.fn(() => 'light'),
}));

jest.mock('@/theme/ThemeProvider', () => {
  const { lightColors } = require('@/theme/colors');
  return {
    useTheme: () => ({ colors: lightColors, isDark: false }),
  };
});

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: Record<string, unknown>) => <View {...props} />,
  };
});

import CastCarousel from '../CastCarousel';
import type { MovieCast } from '@/types/movie';

const makeCast = (overrides: Partial<MovieCast> = {}): MovieCast => ({
  id: 1,
  movie_id: 1,
  tmdb_person_id: 100,
  name: 'Actor Name',
  name_te: null,
  character: 'Hero',
  role: 'actor',
  profile_path: '/photo.jpg',
  display_order: 0,
  ...overrides,
});

describe('CastCarousel', () => {
  it('returns null for empty cast', () => {
    const { toJSON } = render(<CastCarousel cast={[]} />);
    expect(toJSON()).toBeNull();
  });

  it('renders cast carousel', () => {
    render(<CastCarousel cast={[makeCast()]} />);
    expect(screen.getByTestId('cast-carousel')).toBeTruthy();
  });

  it('renders section title', () => {
    render(<CastCarousel cast={[makeCast()]} />);
    expect(screen.getByText('Cast & Crew')).toBeTruthy();
  });

  it('renders cast cards', () => {
    render(<CastCarousel cast={[makeCast(), makeCast({ id: 2, name: 'Actor 2' })]} />);
    expect(screen.getAllByTestId('cast-card')).toHaveLength(2);
  });

  it('renders cast photo', () => {
    render(<CastCarousel cast={[makeCast()]} />);
    expect(screen.getByTestId('cast-photo')).toBeTruthy();
  });

  it('renders placeholder for missing photo', () => {
    render(<CastCarousel cast={[makeCast({ profile_path: null })]} />);
    expect(screen.getByTestId('cast-photo-placeholder')).toBeTruthy();
  });

  it('shows Telugu name when available', () => {
    render(<CastCarousel cast={[makeCast({ name_te: 'తెలుగు పేరు' })]} />);
    expect(screen.getByText('తెలుగు పేరు')).toBeTruthy();
  });

  it('shows character name for actors', () => {
    render(<CastCarousel cast={[makeCast({ character: 'Pushpa Raj' })]} />);
    expect(screen.getByText('Pushpa Raj')).toBeTruthy();
  });

  it('shows role for non-actors', () => {
    render(<CastCarousel cast={[makeCast({ role: 'director', character: null })]} />);
    expect(screen.getByText('director')).toBeTruthy();
  });
});
