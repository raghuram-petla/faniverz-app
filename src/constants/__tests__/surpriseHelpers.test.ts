import {
  getCategoryColor,
  getCategoryLabel,
  getCategoryIconName,
  formatViews,
} from '../surpriseHelpers';

describe('getCategoryColor', () => {
  it('returns purple for song', () => {
    expect(getCategoryColor('song')).toBeDefined();
  });

  it('returns blue for short-film', () => {
    expect(getCategoryColor('short-film')).toBeDefined();
  });

  it('returns a color for bts', () => {
    expect(getCategoryColor('bts')).toBeDefined();
  });

  it('returns a color for interview', () => {
    expect(getCategoryColor('interview')).toBeDefined();
  });

  it('returns default for unknown category', () => {
    expect(getCategoryColor('trailer')).toBeDefined();
  });
});

describe('getCategoryLabel', () => {
  it('returns "Song" for song', () => {
    expect(getCategoryLabel('song')).toBe('Song');
  });

  it('returns "Short Film" for short-film', () => {
    expect(getCategoryLabel('short-film')).toBe('Short Film');
  });

  it('returns "BTS" for bts', () => {
    expect(getCategoryLabel('bts')).toBe('BTS');
  });

  it('returns "Interview" for interview', () => {
    expect(getCategoryLabel('interview')).toBe('Interview');
  });

  it('returns "Trailer" for trailer', () => {
    expect(getCategoryLabel('trailer')).toBe('Trailer');
  });
});

describe('getCategoryIconName', () => {
  it('returns musical-notes for song', () => {
    expect(getCategoryIconName('song')).toBe('musical-notes');
  });

  it('returns film for short-film', () => {
    expect(getCategoryIconName('short-film')).toBe('film');
  });

  it('returns videocam for bts', () => {
    expect(getCategoryIconName('bts')).toBe('videocam');
  });

  it('returns mic for interview', () => {
    expect(getCategoryIconName('interview')).toBe('mic');
  });

  it('returns play-circle for trailer', () => {
    expect(getCategoryIconName('trailer')).toBe('play-circle');
  });
});

describe('formatViews', () => {
  it('formats millions', () => {
    expect(formatViews(1_500_000)).toBe('1.5M');
  });

  it('formats exact million', () => {
    expect(formatViews(1_000_000)).toBe('1.0M');
  });

  it('formats thousands', () => {
    expect(formatViews(5_000)).toBe('5K');
  });

  it('formats exact thousand', () => {
    expect(formatViews(1_000)).toBe('1K');
  });

  it('returns raw number for small values', () => {
    expect(formatViews(500)).toBe('500');
  });

  it('returns 0 as string', () => {
    expect(formatViews(0)).toBe('0');
  });
});
