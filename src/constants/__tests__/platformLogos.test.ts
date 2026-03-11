import { getPlatformLogo } from '../platformLogos';

describe('getPlatformLogo', () => {
  it('returns a logo for known platform "aha"', () => {
    expect(getPlatformLogo('aha')).toBeTruthy();
  });

  it('returns a logo for known platform "netflix"', () => {
    expect(getPlatformLogo('netflix')).toBeTruthy();
  });

  it('returns a logo for known platform "prime"', () => {
    expect(getPlatformLogo('prime')).toBeTruthy();
  });

  it('returns null for unknown platform', () => {
    expect(getPlatformLogo('unknown-platform')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getPlatformLogo('')).toBeNull();
  });
});
