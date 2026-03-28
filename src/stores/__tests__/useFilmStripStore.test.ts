import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFilmStripStore } from '../useFilmStripStore';
import { STORAGE_KEYS } from '@/constants/storage';

describe('useFilmStripStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useFilmStripStore.setState({ filmStripEnabled: true, loaded: false });
  });

  it('has correct default state', () => {
    const state = useFilmStripStore.getState();
    expect(state.filmStripEnabled).toBe(true);
    expect(state.loaded).toBe(false);
  });

  it('setFilmStripEnabled updates state and persists to AsyncStorage', () => {
    useFilmStripStore.getState().setFilmStripEnabled(false);

    expect(useFilmStripStore.getState().filmStripEnabled).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.FILM_STRIP_ENABLED, 'false');
  });

  it('setFilmStripEnabled(true) persists "true"', () => {
    useFilmStripStore.getState().setFilmStripEnabled(false);
    useFilmStripStore.getState().setFilmStripEnabled(true);

    expect(useFilmStripStore.getState().filmStripEnabled).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(STORAGE_KEYS.FILM_STRIP_ENABLED, 'true');
  });

  it('loadFromStorage reads stored value "false"', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

    await useFilmStripStore.getState().loadFromStorage();

    expect(useFilmStripStore.getState().filmStripEnabled).toBe(false);
    expect(useFilmStripStore.getState().loaded).toBe(true);
  });

  it('loadFromStorage reads stored value "true"', async () => {
    useFilmStripStore.setState({ filmStripEnabled: false });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    await useFilmStripStore.getState().loadFromStorage();

    expect(useFilmStripStore.getState().filmStripEnabled).toBe(true);
    expect(useFilmStripStore.getState().loaded).toBe(true);
  });

  it('loadFromStorage keeps default when nothing stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await useFilmStripStore.getState().loadFromStorage();

    expect(useFilmStripStore.getState().filmStripEnabled).toBe(true);
    expect(useFilmStripStore.getState().loaded).toBe(true);
  });

  it('setFilmStripEnabled warns but does not throw when AsyncStorage.setItem fails', async () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('Storage error'));

    useFilmStripStore.getState().setFilmStripEnabled(false);

    expect(useFilmStripStore.getState().filmStripEnabled).toBe(false);

    await Promise.resolve();
    await Promise.resolve();

    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to persist film strip preference',
      expect.any(Error),
    );
    consoleSpy.mockRestore();
  });
});
