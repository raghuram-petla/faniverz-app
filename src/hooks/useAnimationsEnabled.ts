import { useAnimationStore } from '@/stores/useAnimationStore';

// @coupling useAnimationStore — single-selector wrapper; update if store shape changes
// @contract returns current animation preference; re-renders only when animationsEnabled toggles
export function useAnimationsEnabled(): boolean {
  return useAnimationStore((s) => s.animationsEnabled);
}
