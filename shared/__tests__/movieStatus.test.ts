import { deriveMovieStatus } from '../movieStatus';

describe('deriveMovieStatus', () => {
  it('returns in_theaters when movie.in_theaters is true', () => {
    const movie = { release_date: '2025-01-01', in_theaters: true };
    expect(deriveMovieStatus(movie, 0)).toBe('in_theaters');
  });

  it('returns in_theaters even with platforms available', () => {
    const movie = { release_date: '2025-01-01', in_theaters: true };
    expect(deriveMovieStatus(movie, 5)).toBe('in_theaters');
  });

  it('returns announced when no release_date', () => {
    const movie = { release_date: null, in_theaters: false };
    expect(deriveMovieStatus(movie, 0)).toBe('announced');
  });

  it('returns upcoming when release_date is in the future', () => {
    const movie = { release_date: '2099-12-31', in_theaters: false };
    expect(deriveMovieStatus(movie, 0)).toBe('upcoming');
  });

  it('returns streaming when release_date is past and has platforms', () => {
    const movie = { release_date: '2020-01-01', in_theaters: false };
    expect(deriveMovieStatus(movie, 3)).toBe('streaming');
  });

  it('returns released when release_date is past and no platforms', () => {
    const movie = { release_date: '2020-01-01', in_theaters: false };
    expect(deriveMovieStatus(movie, 0)).toBe('released');
  });

  it('returns announced when release_date is undefined', () => {
    const movie = { release_date: undefined as unknown as string, in_theaters: false };
    expect(deriveMovieStatus(movie, 0)).toBe('announced');
  });
});
