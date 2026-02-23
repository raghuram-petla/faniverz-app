import { create } from 'zustand';

interface UIState {
  showSearchOverlay: boolean;
  onboardingComplete: boolean;
  toggleSearchOverlay: () => void;
  setOnboardingComplete: (complete: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  showSearchOverlay: false,
  onboardingComplete: false,

  toggleSearchOverlay: () => set((state) => ({ showSearchOverlay: !state.showSearchOverlay })),

  setOnboardingComplete: (complete) => set({ onboardingComplete: complete }),
}));
