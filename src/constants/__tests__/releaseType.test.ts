import { colors } from '@/theme/colors';
import { MovieStatus } from '@/types';

import { MOVIE_STATUS_CONFIG, getMovieStatusLabel, getMovieStatusColor } from '../releaseType';

describe('MOVIE_STATUS_CONFIG', () => {
  it('contains entries for all 5 movie statuses', () => {
    expect(Object.keys(MOVIE_STATUS_CONFIG)).toHaveLength(5);
    expect(MOVIE_STATUS_CONFIG).toHaveProperty('announced');
    expect(MOVIE_STATUS_CONFIG).toHaveProperty('upcoming');
    expect(MOVIE_STATUS_CONFIG).toHaveProperty('in_theaters');
    expect(MOVIE_STATUS_CONFIG).toHaveProperty('streaming');
    expect(MOVIE_STATUS_CONFIG).toHaveProperty('released');
  });
});

describe('getMovieStatusLabel', () => {
  it('returns "In Theaters" for in_theaters', () => {
    expect(getMovieStatusLabel('in_theaters')).toBe('In Theaters');
  });

  it('returns "Streaming" for streaming', () => {
    expect(getMovieStatusLabel('streaming')).toBe('Streaming');
  });

  it('returns "Coming Soon" for upcoming', () => {
    expect(getMovieStatusLabel('upcoming')).toBe('Coming Soon');
  });

  it('returns "Released" for released', () => {
    expect(getMovieStatusLabel('released')).toBe('Released');
  });

  it('falls back to the raw type string for unknown types', () => {
    expect(getMovieStatusLabel('unknown' as MovieStatus)).toBe('unknown');
  });
});

describe('getMovieStatusColor', () => {
  it('returns red600 for in_theaters', () => {
    expect(getMovieStatusColor('in_theaters')).toBe(colors.red600);
  });

  it('returns purple600 for streaming', () => {
    expect(getMovieStatusColor('streaming')).toBe(colors.purple600);
  });

  it('returns blue600 for upcoming', () => {
    expect(getMovieStatusColor('upcoming')).toBe(colors.blue600);
  });

  it('returns gray500 for released', () => {
    expect(getMovieStatusColor('released')).toBe(colors.gray500);
  });

  it('falls back to white40 for unknown types', () => {
    expect(getMovieStatusColor('unknown' as MovieStatus)).toBe(colors.white40);
  });
});
