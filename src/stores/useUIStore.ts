import { create } from 'zustand';

interface UIState {
  showSearchOverlay: boolean;
  toggleSearchOverlay: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  showSearchOverlay: false,

  toggleSearchOverlay: () => set((state) => ({ showSearchOverlay: !state.showSearchOverlay })),
}));
