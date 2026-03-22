import { getDeviceCountry } from '../getDeviceCountry';

jest.mock('expo-localization', () => ({
  getLocales: jest.fn(),
}));

const { getLocales } = require('expo-localization') as { getLocales: jest.Mock };

describe('getDeviceCountry', () => {
  afterEach(() => jest.resetAllMocks());

  it('returns regionCode from the first locale', () => {
    getLocales.mockReturnValue([{ regionCode: 'US', languageCode: 'en' }]);
    expect(getDeviceCountry()).toBe('US');
  });

  it('returns regionCode when multiple locales exist', () => {
    getLocales.mockReturnValue([
      { regionCode: 'GB', languageCode: 'en' },
      { regionCode: 'US', languageCode: 'en' },
    ]);
    expect(getDeviceCountry()).toBe('GB');
  });

  it('falls back to IN when regionCode is undefined', () => {
    getLocales.mockReturnValue([{ languageCode: 'en' }]);
    expect(getDeviceCountry()).toBe('IN');
  });

  it('falls back to IN when regionCode is null', () => {
    getLocales.mockReturnValue([{ regionCode: null, languageCode: 'en' }]);
    expect(getDeviceCountry()).toBe('IN');
  });

  it('falls back to IN when locales array is empty', () => {
    getLocales.mockReturnValue([]);
    expect(getDeviceCountry()).toBe('IN');
  });

  it('falls back to IN when getLocales throws', () => {
    getLocales.mockImplementation(() => {
      throw new Error('Permission denied');
    });
    expect(() => getDeviceCountry()).toThrow('Permission denied');
  });
});
