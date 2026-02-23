import { colors } from '../colors';

const HEX_REGEX = /^#[0-9A-Fa-f]{6}$/;
const RGBA_REGEX = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;

describe('colors', () => {
  it('exports base colors as valid hex', () => {
    expect(colors.black).toMatch(HEX_REGEX);
    expect(colors.white).toMatch(HEX_REGEX);
    expect(colors.zinc900).toMatch(HEX_REGEX);
  });

  it('exports primary colors as valid hex', () => {
    expect(colors.red600).toMatch(HEX_REGEX);
    expect(colors.red500).toMatch(HEX_REGEX);
    expect(colors.purple600).toMatch(HEX_REGEX);
    expect(colors.blue600).toMatch(HEX_REGEX);
    expect(colors.yellow400).toMatch(HEX_REGEX);
    expect(colors.green500).toMatch(HEX_REGEX);
  });

  it('exports white opacity variants as valid rgba', () => {
    expect(colors.white60).toMatch(RGBA_REGEX);
    expect(colors.white40).toMatch(RGBA_REGEX);
    expect(colors.white20).toMatch(RGBA_REGEX);
    expect(colors.white10).toMatch(RGBA_REGEX);
    expect(colors.white5).toMatch(RGBA_REGEX);
  });

  it('exports status colors matching release types', () => {
    expect(colors.status.theatrical).toBe(colors.red600);
    expect(colors.status.ott).toBe(colors.purple600);
    expect(colors.status.upcoming).toBe(colors.blue600);
  });

  it('exports all 8 OTT platform colors', () => {
    const platformKeys = Object.keys(colors.platform);
    expect(platformKeys).toHaveLength(8);
    expect(platformKeys).toEqual(
      expect.arrayContaining([
        'aha',
        'netflix',
        'prime',
        'hotstar',
        'zee5',
        'sunnxt',
        'sonyliv',
        'etvwin',
      ]),
    );

    // All platform colors should be valid hex
    Object.values(colors.platform).forEach((color) => {
      expect(color).toMatch(HEX_REGEX);
    });
  });
});
