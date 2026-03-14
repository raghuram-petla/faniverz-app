const mockInit = jest.fn().mockReturnValue(Promise.resolve());
const mockUse = jest.fn().mockReturnValue({ init: mockInit });
const mockChangeLanguage = jest.fn();

jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    use: mockUse,
    changeLanguage: mockChangeLanguage,
  },
}));

jest.mock('react-i18next', () => ({
  initReactI18next: 'initReactI18next-mock',
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

// Mock AsyncStorage to resolve with null (no stored preference)
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
}));

describe('i18n initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes i18n with initReactI18next plugin', async () => {
    let languageReady: Promise<void>;
    jest.isolateModules(() => {
      const mod = require('../index');
      languageReady = mod.languageReady;
    });
    await languageReady!;
    expect(mockUse).toHaveBeenCalledWith('initReactI18next-mock');
  });

  it('configures English and Telugu resources', async () => {
    let languageReady: Promise<void>;
    jest.isolateModules(() => {
      const mod = require('../index');
      languageReady = mod.languageReady;
    });
    await languageReady!;
    const initConfig = mockInit.mock.calls[0][0];
    expect(initConfig.resources).toHaveProperty('en');
    expect(initConfig.resources).toHaveProperty('te');
    expect(initConfig.fallbackLng).toBe('te');
  });

  it('defaults to English when device language is English', async () => {
    let languageReady: Promise<void>;
    jest.isolateModules(() => {
      const mod = require('../index');
      languageReady = mod.languageReady;
    });
    await languageReady!;
    const initConfig = mockInit.mock.calls[0][0];
    expect(initConfig.lng).toBe('en');
  });

  it('uses stored language preference from AsyncStorage', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    AsyncStorage.getItem.mockResolvedValue('te');

    let languageReady: Promise<void>;
    jest.isolateModules(() => {
      const mod = require('../index');
      languageReady = mod.languageReady;
    });
    await languageReady!;
    const initConfig = mockInit.mock.calls[0][0];
    expect(initConfig.lng).toBe('te');
  });
});
