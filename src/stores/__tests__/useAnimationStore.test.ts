import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAnimationStore } from '../useAnimationStore';
import { STORAGE_KEYS } from '@/constants/storage';

describe('useAnimationStore', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAnimationStore.setState({ animationsEnabled: true, loaded: false });
  });

  it('has correct default state', () => {
    const state = useAnimationStore.getState();
    expect(state.animationsEnabled).toBe(true);
    expect(state.loaded).toBe(false);
  });

  it('setAnimationsEnabled updates state and persists to AsyncStorage', () => {
    useAnimationStore.getState().setAnimationsEnabled(false);

    expect(useAnimationStore.getState().animationsEnabled).toBe(false);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(STORAGE_KEYS.ANIMATIONS_ENABLED, 'false');
  });

  it('setAnimationsEnabled(true) persists "true"', () => {
    useAnimationStore.getState().setAnimationsEnabled(false);
    useAnimationStore.getState().setAnimationsEnabled(true);

    expect(useAnimationStore.getState().animationsEnabled).toBe(true);
    expect(AsyncStorage.setItem).toHaveBeenLastCalledWith(STORAGE_KEYS.ANIMATIONS_ENABLED, 'true');
  });

  it('loadFromStorage reads stored value "false"', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('false');

    await useAnimationStore.getState().loadFromStorage();

    expect(useAnimationStore.getState().animationsEnabled).toBe(false);
    expect(useAnimationStore.getState().loaded).toBe(true);
  });

  it('loadFromStorage reads stored value "true"', async () => {
    useAnimationStore.setState({ animationsEnabled: false });
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue('true');

    await useAnimationStore.getState().loadFromStorage();

    expect(useAnimationStore.getState().animationsEnabled).toBe(true);
    expect(useAnimationStore.getState().loaded).toBe(true);
  });

  it('loadFromStorage keeps default when nothing stored', async () => {
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);

    await useAnimationStore.getState().loadFromStorage();

    expect(useAnimationStore.getState().animationsEnabled).toBe(true);
    expect(useAnimationStore.getState().loaded).toBe(true);
  });
});
