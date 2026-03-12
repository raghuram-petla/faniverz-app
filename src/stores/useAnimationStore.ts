import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '@/constants/storage';

interface AnimationState {
  animationsEnabled: boolean;
  loaded: boolean;
  setAnimationsEnabled: (enabled: boolean) => void;
  loadFromStorage: () => Promise<void>;
}

export const useAnimationStore = create<AnimationState>((set) => ({
  animationsEnabled: true,
  loaded: false,
  setAnimationsEnabled: (enabled) => {
    set({ animationsEnabled: enabled });
    AsyncStorage.setItem(STORAGE_KEYS.ANIMATIONS_ENABLED, String(enabled));
  },
  loadFromStorage: async () => {
    const stored = await AsyncStorage.getItem(STORAGE_KEYS.ANIMATIONS_ENABLED);
    if (stored !== null) {
      set({ animationsEnabled: stored === 'true' });
    }
    set({ loaded: true });
  },
}));
