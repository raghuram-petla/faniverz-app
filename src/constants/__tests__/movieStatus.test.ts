import { deriveMovieStatus } from '@shared/movieStatus';

describe('deriveMovieStatus', () => {
  it('returns "upcoming" when release_date is in the future', () => {
    const movie = { release_date: '2099-01-01', in_theaters: false };
    expect(deriveMovieStatus(movie, 0)).toBe('upcoming');
  });

  it('returns "in_theaters" when release_date is past and in_theaters is true', () => {
    const movie = { release_date: '2020-01-01', in_theaters: true };
    expect(deriveMovieStatus(movie, 0)).toBe('in_theaters');
  });

  it('returns "streaming" when release_date is past, not in theaters, but has platforms', () => {
    const movie = { release_date: '2020-01-01', in_theaters: false };
    expect(deriveMovieStatus(movie, 2)).toBe('streaming');
  });

  it('returns "released" when release_date is past, not in theaters, no platforms', () => {
    const movie = { release_date: '2020-01-01', in_theaters: false };
    expect(deriveMovieStatus(movie, 0)).toBe('released');
  });

  it('in_theaters takes priority over streaming', () => {
    const movie = { release_date: '2020-01-01', in_theaters: true };
    expect(deriveMovieStatus(movie, 3)).toBe('in_theaters');
  });

  it('upcoming takes priority over in_theaters', () => {
    const movie = { release_date: '2099-06-15', in_theaters: true };
    expect(deriveMovieStatus(movie, 0)).toBe('upcoming');
  });

  it('returns "released" when platformCount is 0 and not in theaters', () => {
    const movie = { release_date: '2023-06-01', in_theaters: false };
    expect(deriveMovieStatus(movie, 0)).toBe('released');
  });
});
