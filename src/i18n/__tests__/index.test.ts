const mockInit = jest.fn().mockReturnValue(Promise.resolve());
const mockUse = jest.fn().mockReturnValue({ init: mockInit });

jest.mock('i18next', () => ({
  __esModule: true,
  default: {
    use: mockUse,
  },
}));

jest.mock('react-i18next', () => ({
  initReactI18next: 'initReactI18next-mock',
}));

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'en' }],
}));

describe('i18n initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('initializes i18n with initReactI18next plugin', () => {
    jest.isolateModules(() => {
      require('../index');
    });
    expect(mockUse).toHaveBeenCalledWith('initReactI18next-mock');
  });

  it('configures English and Telugu resources', () => {
    jest.isolateModules(() => {
      require('../index');
    });
    const initConfig = mockInit.mock.calls[0][0];
    expect(initConfig.resources).toHaveProperty('en');
    expect(initConfig.resources).toHaveProperty('te');
    expect(initConfig.fallbackLng).toBe('en');
  });

  it('defaults to English for non-Telugu device language', () => {
    jest.isolateModules(() => {
      require('../index');
    });
    const initConfig = mockInit.mock.calls[0][0];
    expect(initConfig.lng).toBe('en');
  });

  it('sets Telugu when device language is te', () => {
    jest.mock('expo-localization', () => ({
      getLocales: () => [{ languageCode: 'te' }],
    }));

    jest.isolateModules(() => {
      require('../index');
    });
    const initConfig = mockInit.mock.calls[0][0];
    expect(initConfig.lng).toBe('te');
  });
});
