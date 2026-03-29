import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storage';

interface FilmStripState {
  filmStripEnabled: boolean;
  loaded: boolean;
  setFilmStripEnabled: (enabled: boolean) => void;
  loadFromStorage: () => Promise<void>;
}

// @sideeffect setFilmStripEnabled persists to AsyncStorage on every call (fire-and-forget)
// @invariant filmStripEnabled defaults to false until loadFromStorage completes
// @coupling reads/writes STORAGE_KEYS.FILM_STRIP_ENABLED — shared key with settings screen
export const useFilmStripStore = create<FilmStripState>((set) => ({
  filmStripEnabled: false,
  loaded: false,
  setFilmStripEnabled: (enabled) => {
    set({ filmStripEnabled: enabled });
    AsyncStorage.setItem(STORAGE_KEYS.FILM_STRIP_ENABLED, String(enabled)).catch((err) =>
      console.warn('Failed to persist film strip preference', err),
    );
  },
  loadFromStorage: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.FILM_STRIP_ENABLED);
    // @edge if stored is null (first launch), keeps default false
    if (stored !== null) {
      set({ filmStripEnabled: stored === 'true' });
    }
    set({ loaded: true });
  },
}));
