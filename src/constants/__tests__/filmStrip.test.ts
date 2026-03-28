import {
  RAIL_WIDTH,
  SPROCKET_SIZE,
  SPROCKET_RADIUS,
  SPROCKET_SPACING,
  FRAME_RADIUS,
  getFilmColor,
  getContentWidth,
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

describe('getContentWidth', () => {
  it('subtracts both rails from screen width', () => {
    expect(getContentWidth(390)).toBe(390 - 2 * RAIL_WIDTH);
  });

  it('returns 0 when screen width equals rail widths', () => {
    expect(getContentWidth(2 * RAIL_WIDTH)).toBe(0);
  });
});
