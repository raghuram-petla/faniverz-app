import {
  RAIL_WIDTH,
  SPROCKET_SIZE,
  SPROCKET_RADIUS,
  SPROCKET_SPACING,
  FRAME_RADIUS,
  getFilmColor,
} from '../filmStrip';

describe('filmStrip constants', () => {
  it('exports correct dimension constants', () => {
    expect(RAIL_WIDTH).toBe(30);
    expect(SPROCKET_SIZE).toBe(12);
    expect(SPROCKET_RADIUS).toBe(3);
    expect(SPROCKET_SPACING).toBe(18);
    expect(FRAME_RADIUS).toBe(14);
  });
});

describe('getFilmColor', () => {
  it('returns zinc-800 for dark theme (black background)', () => {
    const darkTheme = { background: '#000000' } as Parameters<typeof getFilmColor>[0];
    expect(getFilmColor(darkTheme)).toBe('#2C2C2E');
  });

  it('returns zinc-700 for light theme (non-black background)', () => {
    const lightTheme = { background: '#FFFFFF' } as Parameters<typeof getFilmColor>[0];
    expect(getFilmColor(lightTheme)).toBe('#9E9EA3');
  });
});
