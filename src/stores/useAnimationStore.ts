import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storage';

interface AnimationState {
  animationsEnabled: boolean;
  loaded: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  loadFromStorage: () => Promise<void>;
}

// @sideeffect setAnimationsEnabled persists to AsyncStorage on every call (fire-and-forget)
// @invariant animationsEnabled defaults to true until loadFromStorage completes
// @coupling reads/writes STORAGE_KEYS.ANIMATIONS_ENABLED — shared key with settings screen
export const useAnimationStore = create<AnimationState>((set) => ({
  animationsEnabled: true,
  loaded: false,
  setAnimationsEnabled: (enabled) => {
    set({ animationsEnabled: enabled });
    // @sideeffect async write not awaited — UI updates immediately, storage write is best-effort
    AsyncStorage.setItem(STORAGE_KEYS.ANIMATIONS_ENABLED, String(enabled));
  },
  loadFromStorage: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.ANIMATIONS_ENABLED);
    // @edge if stored is null (first launch), keeps default true
    if (stored !== null) {
      set({ animationsEnabled: stored === 'true' });
    }
    set({ loaded: true });
  },
}));
